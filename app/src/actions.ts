import { BN, web3, EventParser } from "@anchor-lang/core";
import { Ctx, sendIxs } from "./solana";
import * as pda from "./pdas";
import {
  USDC_MINT,
  USDC_DECIMALS,
  PAIR_ID,
  TOKEN_PROGRAM,
  HERMES_URL,
  PYTH_FEED_ID,
} from "./config";

const { PublicKey, SystemProgram, ComputeBudgetProgram } = web3;
type PublicKey = web3.PublicKey;

const POOL_SIDE_PRIVATE = 2;
const POOL_SIDE_PUBLIC = 1;

// Anchor 1.0 strictly types `.accountsStrict/.accountsPartial` against a resolver
// type that rejects explicitly passing "auto-resolvable" accounts (e.g. `owner`
// via has_one, PDAs via seeds). We pass the full account set (the exact, devnet-
// verified runtime behavior) and cast the literal to bypass that type friction.
// Method names + args still get full type-checking from Program<PerpCore>.
const A = (o: Record<string, PublicKey | null>) => o as any;

// ---- decimal string -> base units (no float) ----
export function toUnits(s: string, decimals: number): bigint {
  s = (s || "").trim();
  if (!s) return 0n;
  const [i, f = ""] = s.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(i || "0") * 10n ** BigInt(decimals) + BigInt(frac || "0");
}
export function fromUnits(v: bigint, decimals: number): string {
  const neg = v < 0n;
  if (neg) v = -v;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + whole.toString() + (frac ? "." + frac : "");
}
const bn = (v: bigint) => new BN(v.toString());
const readU128LE = (b: Buffer, o: number) => {
  let v = 0n;
  for (let i = 0; i < 16; i++) v += BigInt(b[o + i]) << (8n * BigInt(i));
  return v;
};

async function exists(ctx: Ctx, k: PublicKey): Promise<boolean> {
  return (await ctx.connection.getAccountInfo(k)) !== null;
}

// =====================================================================
// 1a. Create private pool account = initialize_lp_account ONLY.
//     (Funding is a separate step — see providePrivatePool below.)
// =====================================================================
export async function createPrivatePool(ctx: Ctx): Promise<string> {
  const lpAcc = pda.lpAccount(ctx.wallet, ctx.mint);
  if (await exists(ctx, lpAcc)) {
    throw new Error("私有池已存在（每个钱包/结算币一个 LpAccount）。直接入金即可。");
  }
  const ix = await ctx.lp.methods
    .initializeLpAccount()
    .accountsStrict(
      A({
        holder: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: pda.poolConfig(ctx.mint),
        lpAccount: lpAcc,
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 1b. Add funds to the private pool = provide(side=PRIVATE) ONLY.
//     Requires the LpAccount to exist first (createPrivatePool).
// =====================================================================
export async function providePrivatePool(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, ctx.mintDecimals);
  if (amount <= 0n) throw new Error("amount must be > 0");

  const lpAcc = pda.lpAccount(ctx.wallet, ctx.mint);
  if (!(await exists(ctx, lpAcc))) {
    throw new Error("私有池尚未创建 — 请先点「创建私有池」。");
  }

  const ix = await ctx.lp.methods
    .provide(bn(amount), POOL_SIDE_PRIVATE)
    .accountsPartial(
      A({
        provider: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: pda.poolConfig(ctx.mint),
        lpAccount: lpAcc, // private path: provider's own LP account
        escrowLpAccount: null, // public-only (None for private)
        publicShare: null, // public-only (None for private)
        providerTokenAccount: pda.ata(ctx.wallet, ctx.mint),
        poolVault: pda.poolVault(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 1c. Set private-pool risk params = set_lp_params.
//     leverageX: pool leverage multiple (e.g. "10" -> 10x). undefined = leave.
//     rejectOrder: pause/resume taking orders. undefined = leave.
//     (maintenance/add-margin rates left as-is — None.)
// =====================================================================
export async function setLpParams(
  ctx: Ctx,
  opts: { leverageX?: string; rejectOrder?: boolean }
): Promise<string> {
  const lpAcc = pda.lpAccount(ctx.wallet, ctx.mint);
  if (!(await exists(ctx, lpAcc))) {
    throw new Error("私有池尚未创建 — 请先点「创建私有池」。");
  }
  let leverage: BN | null = null;
  if (opts.leverageX !== undefined && opts.leverageX.trim() !== "") {
    const lev = toUnits(opts.leverageX, 9); // multiple -> 1e9 precision
    if (lev < 10n ** 9n) throw new Error("杠杆至少 1x");
    leverage = bn(lev);
  }
  const ix = await ctx.lp.methods
    .setLpParams(
      {
        leverage,
        maintenanceMarginRate: null,
        addMarginRate: null,
        autoAddMargin: null,
        rejectOrder: opts.rejectOrder ?? null,
      } as any
    )
    .accountsStrict(
      A({
        holder: ctx.wallet,
        settleMint: ctx.mint,
        lpAccount: lpAcc,
        poolConfig: pda.poolConfig(ctx.mint),
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 2. Place limit order = initialize_user_account (if needed) + make_limit_order
// =====================================================================
export interface LimitOrderParams {
  direction: 0 | 1; // 0=LONG 1=SHORT
  amountBtc: string; // e.g. "0.001"
  rewardGasUsdc: string; // keeper reward, e.g. "0.1"
  goodTillMinutes: number;
}

// Pyth latest price, normalized to 1e9 (same convention as the on-chain oracle).
export async function fetchOraclePriceE9(feedHex: string): Promise<bigint> {
  const id = feedHex.replace(/^0x/, "");
  const r = await fetch(`${HERMES_URL}/v2/updates/price/latest?ids[]=${id}`);
  const j = await r.json();
  const p = j.parsed[0].price; // { price, expo, publish_time }
  const raw = BigInt(p.price);
  const shift = 9 + Number(p.expo);
  return shift >= 0 ? raw * 10n ** BigInt(shift) : raw / 10n ** BigInt(-shift);
}

export async function placeLimitOrder(ctx: Ctx, p: LimitOrderParams): Promise<string> {
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
  // make_limit_order boxes many accounts -> needs more than the default 32 KB heap.
  const ixs: web3.TransactionInstruction[] = [
    ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  ];

  if (!(await exists(ctx, ua))) {
    ixs.push(
      await ctx.perp.methods
        .initializeUserAccount()
        .accountsStrict(
          A({
            owner: ctx.wallet,
            settleMint: ctx.mint,
            settleConfig: pda.settleConfig(ctx.mint),
            userAccount: ua,
            systemProgram: SystemProgram.programId,
          })
        )
        .instruction()
    );
  }

  const nextOrderSeq = await getNextOrderSeq(ctx);
  const targetPrice = await fetchOraclePriceE9(ctx.pythFeedHex); // limit price = Pyth latest (1e9)
  const amount = toUnits(p.amountBtc, 9); // contract amount is 1e9
  const reward = toUnits(p.rewardGasUsdc, ctx.mintDecimals);
  const goodTill = BigInt(Math.floor(Date.now() / 1000) + p.goodTillMinutes * 60);

  ixs.push(
    await ctx.perp.methods
      .makeLimitOrder({
        pairId: ctx.pairId,
        direction: p.direction,
        targetPrice: bn(targetPrice),
        amount: bn(amount),
        rewardGas: bn(reward),
        orderSeq: bn(nextOrderSeq),
        goodTill: bn(goodTill),
        deadline: bn(0n),
      })
      .accountsStrict(
        A({
          owner: ctx.wallet,
          settleMint: ctx.mint,
          globalConfig: pda.globalConfig(),
          settleConfig: pda.settleConfig(ctx.mint),
          pairConfig: pda.pairConfig(ctx.pairId),
          userAccount: ua,
          userLeverage: pda.userLeverage(ctx.wallet, ctx.pairId, ctx.mint),
          seqCounter: pda.seqCounter(ctx.mint),
          limitedOrder: pda.limitedOrder(nextOrderSeq, ctx.mint),
          triggerCondition: pda.triggerCondition(nextOrderSeq, ctx.mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction()
  );

  return sendIxs(ctx, ixs);
}

// Place a LIMIT_CLOSE order against an existing position (oracle-free; the keeper
// triggers it via trigger_limit_close). targetPrice is the trigger threshold (1e9):
// LONG closes when price >= target, SHORT when price <= target. Settles at live price.
export async function placeLimitClose(
  ctx: Ctx,
  p: { direction: number; amount1e9: bigint; targetPrice: bigint; rewardGasUsdc: string; goodTillMinutes: number }
): Promise<string> {
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
  const ixs: web3.TransactionInstruction[] = [
    ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  ];
  const nextOrderSeq = await getNextOrderSeq(ctx);
  const amount = p.amount1e9; // exact remaining size (1e9), from the deal
  const reward = toUnits(p.rewardGasUsdc, ctx.mintDecimals);
  const goodTill = BigInt(Math.floor(Date.now() / 1000) + p.goodTillMinutes * 60);

  ixs.push(
    await ctx.perp.methods
      .makeLimitClose({
        pairId: ctx.pairId,
        direction: p.direction,
        targetPrice: bn(p.targetPrice),
        amount: bn(amount),
        rewardGas: bn(reward),
        orderSeq: bn(nextOrderSeq),
        goodTill: bn(goodTill),
        deadline: bn(0n),
      })
      .accountsStrict(
        A({
          owner: ctx.wallet,
          settleMint: ctx.mint,
          globalConfig: pda.globalConfig(),
          settleConfig: pda.settleConfig(ctx.mint),
          pairConfig: pda.pairConfig(ctx.pairId),
          userAccount: ua,
          position: pda.position(ctx.pairId,p.direction, ctx.mint),
          seqCounter: pda.seqCounter(ctx.mint),
          limitedOrder: pda.limitedOrder(nextOrderSeq, ctx.mint),
          triggerCondition: pda.triggerCondition(nextOrderSeq, ctx.mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction()
  );

  return sendIxs(ctx, ixs);
}

// =====================================================================
// 3. Trading-account deposit / withdraw (UserAccount margin balance)
// =====================================================================
export async function deposit(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, ctx.mintDecimals);
  if (amount <= 0n) throw new Error("amount must be > 0");
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
  const ixs: web3.TransactionInstruction[] = [];
  if (!(await exists(ctx, ua))) {
    ixs.push(
      await ctx.perp.methods
        .initializeUserAccount()
        .accountsStrict(
          A({
            owner: ctx.wallet,
            settleMint: ctx.mint,
            settleConfig: pda.settleConfig(ctx.mint),
            userAccount: ua,
            systemProgram: SystemProgram.programId,
          })
        )
        .instruction()
    );
  }
  ixs.push(
    await ctx.perp.methods
      .deposit(bn(amount))
      .accountsStrict(
        A({
          owner: ctx.wallet,
          settleMint: ctx.mint,
          globalConfig: pda.globalConfig(),
          settleConfig: pda.settleConfig(ctx.mint),
          userAccount: ua,
          userTokenAccount: pda.ata(ctx.wallet, ctx.mint),
          vaultToken: pda.vaultToken(ctx.mint),
          tokenProgram: TOKEN_PROGRAM,
        })
      )
      .instruction()
  );
  return sendIxs(ctx, ixs);
}

export async function withdraw(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, ctx.mintDecimals);
  if (amount <= 0n) throw new Error("amount must be > 0");
  const ix = await ctx.perp.methods
    .withdraw(bn(amount))
    .accountsStrict(
      A({
        owner: ctx.wallet,
        settleMint: ctx.mint,
        settleConfig: pda.settleConfig(ctx.mint),
        userAccount: pda.userAccount(ctx.wallet, ctx.mint),
        userTokenAccount: pda.ata(ctx.wallet, ctx.mint),
        vaultToken: pda.vaultToken(ctx.mint),
        vaultAuthority: pda.vaultAuthority(),
        tokenProgram: TOKEN_PROGRAM,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// Public pool (shared market-making vault): provide / withdraw / read.
// No "create account" step — first provide auto-creates the PublicShare.
// Funds aggregate into the escrow LpAccount; the provider gets SHARES.
// =====================================================================

export interface PublicPoolInfo {
  myShares: bigint; // caller's shares (base-unit scale; 1:1 at first deposit)
  totalShares: bigint; // pool-wide shares
  escrowAmount: bigint; // pool TVL in settle base units
  escrowAvailable: bigint; // withdrawable part of TVL
  myValue: bigint; // caller's value in base units ≈ myShares * escrowAmount / totalShares
}

// Read the caller's public-pool position + the pool's net value (Anchor-decoded).
export async function getPublicPoolInfo(ctx: Ctx): Promise<PublicPoolInfo> {
  const escrowAuth = pda.escrowAuthority(ctx.mint);
  const [share, escrow, cfg] = await Promise.all([
    ctx.lp.account.publicShare.fetchNullable(pda.publicShare(ctx.wallet, ctx.mint)),
    ctx.lp.account.lpAccount.fetchNullable(pda.lpAccount(escrowAuth, ctx.mint)),
    ctx.lp.account.poolConfig.fetchNullable(pda.poolConfig(ctx.mint)),
  ]);
  const toBig = (v: any) => (v == null ? 0n : BigInt(v.toString()));
  const myShares = toBig((share as any)?.shares);
  const totalShares = toBig((cfg as any)?.totalShares);
  const escrowAmount = toBig((escrow as any)?.amount);
  const escrowAvailable = toBig((escrow as any)?.availableAmount);
  const myValue = totalShares > 0n ? (myShares * escrowAmount) / totalShares : 0n;
  return { myShares, totalShares, escrowAmount, escrowAvailable, myValue };
}

// Add funds to the PUBLIC pool = provide(side=PUBLIC). Mints shares to the caller's
// PublicShare account. Pool must be PUBLIC or MIXED. lp_account = None (public path).
export async function providePublicPool(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, ctx.mintDecimals);
  if (amount <= 0n) throw new Error("入金额必须 > 0");
  const escrowAuth = pda.escrowAuthority(ctx.mint);
  const ix = await ctx.lp.methods
    .provide(bn(amount), POOL_SIDE_PUBLIC)
    .accountsPartial(
      A({
        provider: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: pda.poolConfig(ctx.mint),
        lpAccount: null, // public path: not used
        escrowLpAccount: pda.lpAccount(escrowAuth, ctx.mint),
        publicShare: pda.publicShare(ctx.wallet, ctx.mint),
        providerTokenAccount: pda.ata(ctx.wallet, ctx.mint),
        poolVault: pda.poolVault(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// Withdraw from the PUBLIC pool = withdraw_lp(shares, side=PUBLIC). The contract burns
// `shares` and pays out shares * escrow.amount / total_shares base units.
//   opts.all      -> burn ALL of the caller's shares
//   opts.amountUsdc -> burn enough shares for ~that payout (rounded down, capped at balance)
export async function withdrawPublicPool(
  ctx: Ctx,
  opts: { amountUsdc?: string; all?: boolean }
): Promise<string> {
  const info = await getPublicPoolInfo(ctx);
  if (info.myShares <= 0n) throw new Error("公有池没有可提取的份额");
  let shares: bigint;
  if (opts.all) {
    shares = info.myShares;
  } else {
    const usdc = toUnits(opts.amountUsdc ?? "", ctx.mintDecimals);
    if (usdc <= 0n) throw new Error("提取金额必须 > 0");
    if (info.escrowAmount <= 0n) throw new Error("公有池为空");
    shares = (usdc * info.totalShares) / info.escrowAmount; // round down -> payout ≤ requested
    if (shares <= 0n) throw new Error("提取金额太小（不足 1 份额）");
    if (shares > info.myShares) shares = info.myShares; // cap at balance
  }
  const escrowAuth = pda.escrowAuthority(ctx.mint);
  const ix = await ctx.lp.methods
    .withdrawLp(bn(shares), POOL_SIDE_PUBLIC)
    .accountsPartial(
      A({
        holder: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: pda.poolConfig(ctx.mint),
        lpAccount: null, // public path: not used
        escrowLpAccount: pda.lpAccount(escrowAuth, ctx.mint),
        publicShare: pda.publicShare(ctx.wallet, ctx.mint),
        holderTokenAccount: pda.ata(ctx.wallet, ctx.mint),
        poolVault: pda.poolVault(ctx.mint),
        vaultAuthority: pda.poolVaultAuthority(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// Withdraw from the private LP pool (pool_side = PRIVATE, amount = base units).
export async function withdrawLp(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, ctx.mintDecimals);
  if (amount <= 0n) throw new Error("amount must be > 0");
  const ix = await ctx.lp.methods
    .withdrawLp(bn(amount), POOL_SIDE_PRIVATE)
    .accountsPartial(
      A({
        holder: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: pda.poolConfig(ctx.mint),
        lpAccount: pda.lpAccount(ctx.wallet, ctx.mint),
        escrowLpAccount: null,
        publicShare: null,
        holderTokenAccount: pda.ata(ctx.wallet, ctx.mint),
        poolVault: pda.poolVault(ctx.mint),
        vaultAuthority: pda.poolVaultAuthority(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 4. User trading leverage = set_user_leverage(pair_id, leverage).
//    First call auto-creates the UserLeverage PDA; later calls overwrite.
//    leverageX: leverage multiple (e.g. "20" -> 20x), stored at 1e9 precision.
// =====================================================================
export async function setUserLeverage(ctx: Ctx, leverageX: string): Promise<string> {
  const lev = toUnits(leverageX, 9); // multiple -> 1e9
  if (lev < 10n ** 9n) throw new Error("杠杆至少 1x");
  const ix = await ctx.perp.methods
    .setUserLeverage(ctx.pairId, bn(lev))
    .accountsStrict(
      A({
        owner: ctx.wallet,
        settleMint: ctx.mint,
        pairConfig: pda.pairConfig(ctx.pairId),
        userLeverage: pda.userLeverage(ctx.wallet, ctx.pairId, ctx.mint),
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// Current user trading leverage for PAIR_ID, as a multiple (null = not set,
// pair default applies). UserLeverage layout: disc8 ver1 bump1 owner32
// settle_mint32 pair_id2 -> leverage(u128) @ 76.
export async function getUserLeverage(ctx: Ctx): Promise<number | null> {
  const ai = await ctx.connection.getAccountInfo(pda.userLeverage(ctx.wallet, ctx.pairId, ctx.mint));
  if (!ai) return null;
  return Number(ai.data.readBigUInt64LE(76) / 10n ** 7n) / 100; // leverage u64 @76 (9dp), 1e9 -> x
}

// =====================================================================
// Reads
// =====================================================================
export async function getNextOrderSeq(ctx: Ctx): Promise<bigint> {
  const ai = await ctx.connection.getAccountInfo(pda.seqCounter(ctx.mint));
  if (!ai) throw new Error("SeqCounter missing");
  return ai.data.readBigUInt64LE(50); // disc8+ver1+bump1+mint32+next_deal_seq8
}

export interface UserBalances {
  deposit: bigint;
  available: bigint;
  margin: bigint;
  orderLocked: bigint;
}
export async function getUserBalances(ctx: Ctx): Promise<UserBalances | null> {
  const ai = await ctx.connection.getAccountInfo(pda.userAccount(ctx.wallet, ctx.mint));
  if (!ai) return null;
  const d = ai.data;
  return {
    // 9dp UserAccount: deposit/available/margin/order_locked are u64 (8B) @74/82/90/98.
    deposit: d.readBigUInt64LE(74),
    available: d.readBigUInt64LE(82),
    margin: d.readBigUInt64LE(90),
    orderLocked: d.readBigUInt64LE(98),
  };
}

export interface LpInfo {
  amount: bigint; // 本金 (base units)
  available: bigint; // 可用
  locked: bigint; // 已锁定(接单占用)
  leverageX: number; // 杠杆倍数
  rejectOrder: boolean; // 是否暂停接单
}
export async function getLpInfo(ctx: Ctx): Promise<LpInfo | null> {
  const ai = await ctx.connection.getAccountInfo(pda.lpAccount(ctx.wallet, ctx.mint));
  if (!ai) return null;
  const d = ai.data;
  return {
    // 9dp LpAccount: amount/available/locked u64 @74/82/90; leverage u64 @106; reject_order @131.
    amount: d.readBigUInt64LE(74),
    available: d.readBigUInt64LE(82),
    locked: d.readBigUInt64LE(90),
    leverageX: Number(d.readBigUInt64LE(106) / 10n ** 7n) / 100, // 1e9 -> x
    rejectOrder: d[131] === 1,
  };
}

export async function getUsdcBalance(ctx: Ctx): Promise<bigint> {
  const ai = await ctx.connection.getAccountInfo(pda.ata(ctx.wallet, ctx.mint));
  if (!ai) return 0n;
  // SPL TokenAccount: mint(32) owner(32) amount(u64 @64)
  return ai.data.readBigUInt64LE(64);
}

export interface PendingOrder {
  orderSeq: bigint;
  direction: number;
  state: number;
  amount: bigint;
  targetPrice: bigint;
}
// Pending LIMIT_OPEN orders owned by the connected wallet.
// memcmp narrows to this wallet's LimitedOrders (taker @18); kind/state filtered in JS.
export async function getMyPendingOrders(ctx: Ctx): Promise<PendingOrder[]> {
  const accts = await ctx.connection.getProgramAccounts(ctx.perp.programId, {
    filters: [{ memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const out: PendingOrder[] = [];
  for (const { account } of accts) {
    const d = account.data;
    if (d.length < 260) continue; // 9dp LimitedOrder size
    const orderKind = d[86];
    const state = d[87];
    if (orderKind !== 1 || state !== 1) continue; // LIMIT_OPEN + PENDING
    out.push({
      orderSeq: d.readBigUInt64LE(10),
      direction: d[84],
      state,
      amount: readU128LE(d, 88), // amount stays u128 @88
      targetPrice: d.readBigUInt64LE(104), // target_price u64 @104 (9dp)
    });
  }
  return out;
}

export interface MyDeal {
  dealSeq: bigint;
  direction: number; // 0=LONG 1=SHORT
  size: bigint; // remaining contract size (1e9)
  entryPrice: bigint; // 1e9
}
// Active DealRecords (open positions) owned by the connected wallet on this page's pair.
// memcmp narrows to DealRecords (dataSize 229) with taker @18 = this wallet.
export async function getMyDeals(ctx: Ctx): Promise<MyDeal[]> {
  const accts = await ctx.connection.getProgramAccounts(ctx.perp.programId, {
    filters: [{ dataSize: 229 }, { memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const out: MyDeal[] = [];
  for (const { account } of accts) {
    const d = account.data;
    if (d.length !== 229) continue;
    if (d.readUInt16LE(82) !== ctx.pairId) continue; // this page's pair only
    const state = d[142];
    if (state !== 0 && state !== 1) continue; // Active / Partial
    const remaining = readU128LE(d, 126);
    if (remaining === 0n) continue;
    out.push({
      dealSeq: d.readBigUInt64LE(10),
      direction: d[84],
      size: remaining,
      entryPrice: d.readBigUInt64LE(102),
    });
  }
  out.sort((a, b) => Number(a.dealSeq - b.dealSeq));
  return out;
}

// =====================================================================
// Pro trade panel — positions / open orders / trade history
// =====================================================================
export const MMR = 0.1; // maintenance margin rate (matches contract default 1e8 @ 1e9)

export interface MyPosition {
  direction: number; // 0 LONG 1 SHORT
  sizeBtc: number; // total size (human)
  avgEntry: number; // weighted avg entry (human USD)
  marginUsdc: number; // total occupied margin (human USDC)
  deals: { seq: bigint; amount1e9: bigint }[]; // underlying deals (single-deal close)
}
// Aggregate the user's active DealRecords (this page's pair) into positions per direction.
export async function getMyPositions(ctx: Ctx): Promise<MyPosition[]> {
  const accts = await ctx.connection.getProgramAccounts(ctx.perp.programId, {
    filters: [{ dataSize: 229 }, { memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const agg: Record<number, { size: bigint; value: bigint; margin: bigint; deals: { seq: bigint; amount1e9: bigint }[] }> = {};
  for (const { account } of accts) {
    const d = account.data;
    if (d.length !== 229 || d.readUInt16LE(82) !== ctx.pairId) continue;
    const state = d[142];
    if (state !== 0 && state !== 1) continue;
    const remaining = readU128LE(d, 126);
    if (remaining === 0n) continue;
    const dir = d[84];
    const a = (agg[dir] ||= { size: 0n, value: 0n, margin: 0n, deals: [] });
    a.size += remaining;
    a.value += remaining * d.readBigUInt64LE(102); // remaining(1e9) × entry(1e9)
    a.margin += d.readBigUInt64LE(110);
    a.deals.push({ seq: d.readBigUInt64LE(10), amount1e9: remaining });
  }
  return Object.keys(agg).map((k) => {
    const dir = Number(k), a = agg[dir];
    const avgEntry1e9 = a.size > 0n ? a.value / a.size : 0n; // bigint → 1e9 price (avoids huge Number)
    return {
      direction: dir,
      sizeBtc: Number(a.size) / 1e9,
      avgEntry: Number(avgEntry1e9) / 1e9,
      marginUsdc: Number(a.margin) / 1e6,
      deals: a.deals,
    };
  }).sort((x, y) => x.direction - y.direction);
}

export interface OpenOrder {
  orderSeq: bigint;
  startTime: number;
  direction: number;
  offset: number; // 0 open 1 close
  orderKind: number; // 1 limit-open 2 limit-close 3 stop-take-open 4 stop-take-close
  amount1e9: bigint;
  targetPrice1e9: bigint;
}
// Pending/partial LimitedOrders (all kinds) for the connected wallet.
export async function getMyOpenOrders(ctx: Ctx): Promise<OpenOrder[]> {
  const accts = await ctx.connection.getProgramAccounts(ctx.perp.programId, {
    filters: [{ dataSize: 260 }, { memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const out: OpenOrder[] = [];
  for (const { account } of accts) {
    const d = account.data;
    if (d.length !== 260) continue;
    if (d.readUInt16LE(82) !== ctx.pairId) continue; // this pair only
    if (d[87] !== 1 && d[87] !== 2) continue; // PENDING / PARTIAL
    out.push({
      orderSeq: d.readBigUInt64LE(10),
      startTime: Number(d.readBigInt64LE(136)), // start_time @136
      direction: d[84],
      offset: d[85],
      orderKind: d[86],
      amount1e9: readU128LE(d, 88),
      targetPrice1e9: d.readBigUInt64LE(104),
    });
  }
  return out.sort((a, b) => Number(b.orderSeq - a.orderSeq));
}

// Cancel a pending order (cancel_limit_order). direction needed for the position PDA.
export async function cancelOrder(ctx: Ctx, orderSeq: bigint, direction: number): Promise<string> {
  return sendIxs(ctx, [
    await ctx.perp.methods
      .cancelLimitOrder({ orderSeq: bn(orderSeq) })
      .accountsStrict(
        A({
          owner: ctx.wallet,
          settleMint: ctx.mint,
          settleConfig: pda.settleConfig(ctx.mint),
          userAccount: pda.userAccount(ctx.wallet, ctx.mint),
          position: pda.position(ctx.pairId,direction, ctx.mint),
          limitedOrder: pda.limitedOrder(orderSeq, ctx.mint),
          triggerCondition: pda.triggerCondition(orderSeq, ctx.mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction(),
  ]);
}

// Close a whole position: one make_limit_close per underlying deal (single-deal close
// is the contract's model), batched in one tx with sequential order_seqs. markPrice (human)
// sets an immediate-trigger threshold; settles at the live price.
export async function closePosition(ctx: Ctx, pos: MyPosition, markPrice: number): Promise<string> {
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
  const ixs: web3.TransactionInstruction[] = [
    ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
  ];
  let seq = await getNextOrderSeq(ctx);
  const goodTill = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const px = BigInt(Math.round(markPrice * 1e9));
  const target = pos.direction === 0 ? (px * 95n) / 100n : (px * 105n) / 100n;
  for (const dl of pos.deals) {
    ixs.push(
      await ctx.perp.methods
        .makeLimitClose({
          pairId: ctx.pairId,
          direction: pos.direction,
          targetPrice: bn(target),
          amount: bn(dl.amount1e9),
          rewardGas: bn(100000n),
          orderSeq: bn(seq),
          goodTill: bn(goodTill),
          deadline: bn(0n),
        })
        .accountsStrict(
          A({
            owner: ctx.wallet,
            settleMint: ctx.mint,
            globalConfig: pda.globalConfig(),
            settleConfig: pda.settleConfig(ctx.mint),
            pairConfig: pda.pairConfig(ctx.pairId),
            userAccount: ua,
            position: pda.position(ctx.pairId,pos.direction, ctx.mint),
            seqCounter: pda.seqCounter(ctx.mint),
            limitedOrder: pda.limitedOrder(seq, ctx.mint),
            triggerCondition: pda.triggerCondition(seq, ctx.mint),
            systemProgram: SystemProgram.programId,
          })
        )
        .instruction()
    );
    seq += 1n;
  }
  return sendIxs(ctx, ixs);
}

export interface TradeRow {
  time: number;
  direction: number;
  price: number; // 成交均价 (human)
  amountBtc: number;
  feeUsdc: number;
  realizedPnl: number; // profit − loss (human USDC)
  costPrice: number; // entry (human), for ROI
  orderType: number; // OrderHistory.order_type — the action (open/close/liquidate)
  sig: string;
}
// OrderHistory.order_type distinguishes the action (TradeHistory.trade_type is just the
// mechanism — market/limit — and is the SAME (2) for both limit-open and limit-close).
const ORDER_TYPE_LABEL: Record<number, string> = {
  1: "市价开仓",
  2: "限价开仓",
  3: "平仓",
  4: "清算",
  5: "强制平仓",
  6: "止盈止损",
  7: "已撤单",
};
export function orderTypeLabel(t: number): string {
  return ORDER_TYPE_LABEL[t] ?? `类型${t}`;
}
// Paginated trade history: one page = `pageSize` signatures of the user_account.
// nextBefore = cursor for the next (older) page, or null when exhausted.
export async function getTradeHistoryPaged(
  ctx: Ctx,
  before?: string,
  pageSize = 25
): Promise<{ rows: TradeRow[]; nextBefore: string | null }> {
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
  const sigs = await ctx.connection.getSignaturesForAddress(ua, before ? { limit: pageSize, before } : { limit: pageSize });
  const parser = new EventParser(ctx.perp.programId, ctx.perp.coder);
  const me = ctx.wallet.toBase58();
  const rows: TradeRow[] = [];
  for (const s of sigs) {
    const tx = await ctx.connection.getTransaction(s.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    const logs = tx?.meta?.logMessages;
    if (!logs) continue;
    const time = tx!.blockTime ?? 0;
    const evs = [...parser.parseLogs(logs)];
    // OrderHistory carries taker+direction+cost_price+order_type; TradeHistory carries the fill numbers.
    let dir = 0, costPrice = 0, orderType = 0, isMine = false;
    for (const ev of evs) {
      const d = ev.data as any;
      if (ev.name === "orderHistory" && d.taker?.toBase58?.() === me && d.pairId === ctx.pairId) {
        dir = d.direction; costPrice = Number(d.costPrice) / 1e9; orderType = d.orderType; isMine = true;
      }
    }
    if (!isMine) continue;
    for (const ev of evs) {
      const d = ev.data as any;
      if (ev.name !== "tradeHistory") continue;
      rows.push({
        time,
        direction: dir,
        price: Number(d.price) / 1e9,
        amountBtc: Number(d.amount) / 1e9,
        feeUsdc: Number(d.tradingFee) / 1e6,
        realizedPnl: (Number(d.profit) - Number(d.loss)) / 1e6,
        costPrice,
        orderType,
        sig: s.signature,
      });
    }
  }
  return { rows, nextBefore: sigs.length === pageSize ? sigs[sigs.length - 1].signature : null };
}

// =====================================================================
// History (NO backend DB): decode events from the user's own transactions.
// getSignaturesForAddress(user_account PDA) returns every tx that touched the
// user's perp account — placing (own tx) AND filling (keeper's tx, user is taker).
// The limited_order PDA is closed on fill, but the events live forever in the ledger.
// =====================================================================
export interface HistoryItem {
  kind: string; // 下单 / 成交 / 取消 / 过期 / 清算
  orderSeq: string;
  side: string; // LONG / SHORT
  amount: string; // BTC
  price: string; // USD
  time: number; // unix sec (block time)
  sig: string;
}

const ORDER_STATE_LABEL: Record<number, string> = {
  3: "成交",
  4: "取消",
  5: "清算",
  6: "过期",
  7: "异常",
};

export async function getMyHistory(ctx: Ctx, limit = 25): Promise<HistoryItem[]> {
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
  const sigs = await ctx.connection.getSignaturesForAddress(ua, { limit });
  const parser = new EventParser(ctx.perp.programId, ctx.perp.coder);
  const me = ctx.wallet.toBase58();
  const items: HistoryItem[] = [];

  for (const s of sigs) {
    const tx = await ctx.connection.getTransaction(s.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    const logs = tx?.meta?.logMessages;
    if (!logs) continue;
    const time = tx!.blockTime ?? 0;
    const evs = [...parser.parseLogs(logs)];
    // The real fill/settlement price lives in OrderHistory.price (opens fill at target,
    // closes/liquidations settle at the live oracle price). limitedOrderHistory only
    // carries the order's target_price, so use OrderHistory.price for 成交 rows.
    let tradePrice: bigint | null = null;
    for (const ev of evs) {
      const d = ev.data as any;
      if (ev.name === "orderHistory" && d.taker?.toBase58?.() === me && d.price !== undefined) {
        tradePrice = BigInt(d.price.toString());
      }
    }
    for (const ev of evs) {
      const d = ev.data as any;
      if (d.taker?.toBase58?.() !== me) continue;
      const side = d.direction === 0 ? "LONG" : "SHORT";
      if (ev.name === "createLimitedOrder") {
        items.push({
          kind: d.offset === 1 ? "平仓挂单" : "下单",
          orderSeq: d.orderSeq.toString(),
          side,
          amount: fromUnits(BigInt(d.amount.toString()), 9),
          price: fromUnits(BigInt(d.targetPrice.toString()), 9),
          time,
          sig: s.signature,
        });
      } else if (ev.name === "limitedOrderHistory") {
        const filled = d.state === 3 && tradePrice !== null;
        items.push({
          kind: ORDER_STATE_LABEL[d.state] ?? `状态${d.state}`,
          orderSeq: d.orderSeq.toString(),
          side,
          amount: fromUnits(BigInt(d.amount.toString()), 9),
          // 成交: real settlement price (OrderHistory.price); otherwise the order's target.
          price: fromUnits(filled ? (tradePrice as bigint) : BigInt(d.targetPrice.toString()), 9),
          time,
          sig: s.signature,
        });
      }
    }
  }
  return items.sort((a, b) => b.time - a.time);
}

// ---- Hermes live price (for context display) ----
export async function fetchHermesPrice(feedHex: string): Promise<number> {
  const id = feedHex.replace(/^0x/, "");
  const r = await fetch(`${HERMES_URL}/v2/updates/price/latest?ids[]=${id}`);
  const j = await r.json();
  const p = j.parsed[0].price;
  return Number(p.price) * Math.pow(10, p.expo);
}

// =====================================================================
// Referral / invitation (treasury program)
// =====================================================================
// My inviter (who referred me), or null if not bound yet.
export async function getInviteRelation(ctx: Ctx): Promise<string | null> {
  const ai = await ctx.connection.getAccountInfo(pda.inviteRelation(ctx.wallet));
  if (!ai) return null;
  // InviteRelation: disc8 ver1 bump1 invitee32 inviter32 …  → inviter @42
  return new PublicKey(ai.data.subarray(42, 74)).toBase58();
}

// Bind my inviter (one-time; the contract's init prevents re-binding).
export async function bindInviter(ctx: Ctx, inviterB58: string): Promise<string> {
  const inviter = new PublicKey(inviterB58.trim());
  if (inviter.equals(ctx.wallet)) throw new Error("不能绑定自己为邀请人");
  return sendIxs(ctx, [
    await ctx.treasury.methods
      .bindInviter(inviter)
      .accountsStrict(
        A({
          invitee: ctx.wallet,
          inviteRelation: pda.inviteRelation(ctx.wallet),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction(),
  ]);
}

export interface CommissionInfo {
  unclaimed: bigint;
  claimed: bigint;
}
// My accumulated referral commission for the active settle mint (null = none yet).
export async function getCommission(ctx: Ctx): Promise<CommissionInfo | null> {
  const ai = await ctx.connection.getAccountInfo(pda.commissionAccount(ctx.wallet, ctx.mint));
  if (!ai) return null;
  const d = ai.data;
  // CommissionAccount: disc8 ver1 bump1 inviter32 settle_mint32 total_unclaimed(u64) total_claimed(u64) …
  const base = 8 + 1 + 1 + 32 + 32; // = 74
  return { unclaimed: d.readBigUInt64LE(base), claimed: d.readBigUInt64LE(base + 8) };
}

// Claim all accumulated commission → my USDC ATA (one-shot, zeroes unclaimed).
export async function claimCommission(ctx: Ctx): Promise<string> {
  return sendIxs(ctx, [
    await ctx.treasury.methods
      .claimCommission()
      .accountsStrict(
        A({
          inviter: ctx.wallet,
          settleMint: ctx.mint,
          treasuryConfig: pda.treasuryConfig(),
          commissionAccount: pda.commissionAccount(ctx.wallet, ctx.mint),
          treasuryVault: pda.treasuryVault(ctx.mint),
          treasuryVaultAuthority: pda.treasuryVaultAuthority(ctx.mint),
          inviterTokenAccount: pda.ata(ctx.wallet, ctx.mint),
          tokenProgram: TOKEN_PROGRAM,
        })
      )
      .instruction(),
  ]);
}

// =====================================================================
// ADMIN — reads (Anchor account decoder) + write ix (update_pair / update_pool_config).
// Writes require the connected wallet to be GlobalConfig.admin / PoolConfig.admin;
// otherwise the on-chain `has_one`/relation check rejects the tx.
// =====================================================================
const big = (v: any): bigint => BigInt(v.toString());

export interface GlobalCfg {
  admin: string;
  maintenanceMarginRate: bigint; // 1e9
  minDepositAmount: bigint; // 1e9
  orderSwitch: number; // bitmask bit0=market bit1=limit
}
export async function getGlobalConfig(ctx: Ctx): Promise<GlobalCfg | null> {
  const a: any = await ctx.perp.account.globalConfig.fetchNullable(pda.globalConfig());
  if (!a) return null;
  return {
    admin: a.admin.toBase58(),
    maintenanceMarginRate: big(a.maintenanceMarginRate),
    minDepositAmount: big(a.minDepositAmount),
    orderSwitch: a.orderSwitch,
  };
}

export interface PairCfg {
  pairId: number;
  name: string;
  tradingFeeRate: bigint; // 1e9 (1% = 1e7)
  minOrderAmount: bigint; // 1e9 (BTC)
  defaultLeverage: bigint; // 1e9
  status: number; // 0 normal 1 paused 2 offline
  rewardGas: bigint; // lamports
  maxStalenessSecs: bigint;
  oracleSource: number; // 0 Pyth 1 Switchboard 2 Supra(reserved) 3 Chainlink
  chainlinkFeedIdHex: string; // 0x.. (32 bytes); all-zero = unset
}
export async function getPairConfig(ctx: Ctx, pairId = ctx.pairId): Promise<PairCfg | null> {
  const a: any = await ctx.perp.account.pairConfig.fetchNullable(pda.pairConfig(pairId));
  if (!a) return null;
  return {
    pairId: a.pairId,
    name: a.name,
    tradingFeeRate: big(a.tradingFeeRate),
    minOrderAmount: big(a.minOrderAmount),
    defaultLeverage: big(a.defaultLeverage),
    status: a.status,
    rewardGas: big(a.rewardGas),
    maxStalenessSecs: big(a.maxStalenessSecs),
    oracleSource: a.oracleSource,
    chainlinkFeedIdHex: "0x" + (a.chainlinkFeedId as number[]).map((b) => b.toString(16).padStart(2, "0")).join(""),
  };
}

export interface PoolCfg {
  admin: string;
  poolType: number; // 1 PUBLIC 2 PRIVATE 3 MIXED 4 REFUSE
  status: number; // 0 active 1 paused 2 offline
  privateMinProvide: bigint; // base units
  totalLockedLiquidity: bigint;
}
export async function getPoolConfig(ctx: Ctx): Promise<PoolCfg | null> {
  const a: any = await ctx.lp.account.poolConfig.fetchNullable(pda.poolConfig(ctx.mint));
  if (!a) return null;
  return {
    admin: a.admin.toBase58(),
    poolType: a.poolType,
    status: a.status,
    privateMinProvide: big(a.privateMinProvideAmount),
    totalLockedLiquidity: big(a.totalLockedLiquidity),
  };
}

export interface LpRow {
  holder: string;
  amount: bigint;
  available: bigint;
  locked: bigint;
  leverageX: number;
  rejectOrder: boolean;
}
// All LpAccounts on the LP program (the "pool list" = every maker in the pool).
export async function listLpAccounts(ctx: Ctx): Promise<LpRow[]> {
  const all: any[] = await ctx.lp.account.lpAccount.all();
  return all
    .map(({ account: a }) => ({
      holder: a.holder.toBase58(),
      amount: big(a.amount),
      available: big(a.availableAmount),
      locked: big(a.lockedAmount),
      leverageX: Number(big(a.leverage) / 10n ** 7n) / 100,
      rejectOrder: a.rejectOrder,
    }))
    .sort((x, y) => (y.amount > x.amount ? 1 : -1));
}

// True if the connected wallet matches GlobalConfig.admin.
export async function isAdmin(ctx: Ctx): Promise<boolean> {
  const g = await getGlobalConfig(ctx);
  return !!g && g.admin === ctx.wallet.toBase58();
}

const blank = (s?: string) => s === undefined || s.trim() === "";

// update_pair: only the provided fields change (rest = None). leverageX/feeRatePct
// are human units (10 -> 10x, 0.1 -> 0.1%); minOrderBtc in BTC; rewardGas in lamports.
export async function updatePair(
  ctx: Ctx,
  pairId: number,
  opts: {
    leverageX?: string;
    feeRatePct?: string;
    status?: number;
    rewardGas?: string;
    minOrderBtc?: string;
    oracleSource?: number; // 0 Pyth 1 Switchboard 3 Chainlink (2 Supra rejected on-chain)
    chainlinkFeedIdHex?: string; // required when switching to Chainlink
    switchboardFeedAccountB58?: string; // required when switching to Switchboard (PullFeed pubkey)
    switchboardFeedHashHex?: string; // required when switching to Switchboard (32B hex)
  }
): Promise<string> {
  const args = {
    pairId,
    tradingFeeRate: blank(opts.feeRatePct) ? null : bn(toUnits(opts.feeRatePct!, 7)), // pct -> 1e9
    defaultLeverage: blank(opts.leverageX) ? null : bn(toUnits(opts.leverageX!, 9)),
    status: opts.status ?? null,
    rewardGas: blank(opts.rewardGas) ? null : bn(BigInt(opts.rewardGas!.trim())),
    maxStalenessSecs: null,
    maxConfidenceBps: null,
    pythFeedId: null,
    minOrderAmount: blank(opts.minOrderBtc) ? null : bn(toUnits(opts.minOrderBtc!, 9)),
    switchboardFeedAccount: blank(opts.switchboardFeedAccountB58)
      ? null
      : new PublicKey(opts.switchboardFeedAccountB58!.trim()),
    switchboardFeedHash: blank(opts.switchboardFeedHashHex) ? null : hexTo32(opts.switchboardFeedHashHex!),
    switchboardMaxStalenessSecs: null,
    oracleMode: null,
    oracleSource: opts.oracleSource ?? null,
    chainlinkFeedId: blank(opts.chainlinkFeedIdHex) ? null : hexTo32(opts.chainlinkFeedIdHex!),
    orderOverrideMask: null,
    orderOverrideValue: null,
  };
  const ix = await ctx.perp.methods
    .updatePair(args as any)
    .accountsStrict(
      A({
        globalConfig: pda.globalConfig(),
        admin: ctx.wallet,
        pairConfig: pda.pairConfig(pairId),
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// hex (with/without 0x, 64 chars) -> number[32] for a Pyth feed id.
function hexTo32(hex: string): number[] {
  const h = (hex || "").trim().replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(h)) throw new Error("feed id 必须是 32 字节（64 位 hex）");
  const out: number[] = [];
  for (let i = 0; i < 64; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
  return out;
}

// register_pair: create a new PairConfig (pair_id globally unique; init — re-register
// of same id is rejected). Signer must be GlobalConfig.admin. leverageX/feeRatePct are
// human units; blank fee/min -> contract default; blank leverage -> 10x.
export async function registerPair(
  ctx: Ctx,
  p: {
    pairId: number;
    name: string;
    feedHex: string;
    leverageX?: string;
    feeRatePct?: string;
    minOrderAmount?: string; // base contract amount (e.g. "0.01")
    status?: number;
    maxStalenessSecs?: string;
  }
): Promise<string> {
  if (!p.name.trim()) throw new Error("name 不能为空");
  if (!Number.isInteger(p.pairId) || p.pairId <= 0) throw new Error("pair_id 必须是正整数");
  const args = {
    pairId: p.pairId,
    name: p.name.trim(),
    multi: bn(0n), // default 1e9
    tradingFeeRate: blank(p.feeRatePct) ? bn(0n) : bn(toUnits(p.feeRatePct!, 7)), // 0 = default 0.1%
    minOrderAmount: blank(p.minOrderAmount) ? bn(0n) : bn(toUnits(p.minOrderAmount!, 9)),
    defaultLeverage: blank(p.leverageX) ? bn(10n * 10n ** 9n) : bn(toUnits(p.leverageX!, 9)),
    lotMulti: bn(0n), // default 1e9
    status: p.status ?? 0,
    rewardGas: bn(0n),
    pythFeedId: hexTo32(p.feedHex),
    maxStalenessSecs: bn(BigInt((p.maxStalenessSecs || "120").trim())),
    maxConfidenceBps: 0, // default 100 bps
    switchboardFeedAccount: PublicKey.default,
    switchboardFeedHash: new Array(32).fill(0),
    switchboardMaxStalenessSecs: bn(0n),
    oracleMode: 0, // PythOnly
    oracleSource: 0, // Pyth by default; admin switches later via update_pair
    chainlinkFeedId: new Array(32).fill(0),
  };
  const ix = await ctx.perp.methods
    .registerPair(args as any)
    .accountsStrict(
      A({
        globalConfig: pda.globalConfig(),
        admin: ctx.wallet,
        pairConfig: pda.pairConfig(p.pairId),
        payer: ctx.wallet,
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

export interface PairRow {
  pairId: number;
  name: string;
  defaultLeverage: bigint;
  tradingFeeRate: bigint;
  minOrderAmount: bigint;
  status: number;
  feedHex: string;
  oracleSource: number; // 0 Pyth 1 Switchboard 2 Supra(reserved) 3 Chainlink
  chainlinkFeedHex: string;
}
// All registered trading pairs (decode every PairConfig on the program).
export async function listPairs(ctx: Ctx): Promise<PairRow[]> {
  const all: any[] = await ctx.perp.account.pairConfig.all();
  return all
    .map(({ account: a }) => ({
      pairId: a.pairId,
      name: a.name,
      defaultLeverage: big(a.defaultLeverage),
      tradingFeeRate: big(a.tradingFeeRate),
      minOrderAmount: big(a.minOrderAmount),
      status: a.status,
      feedHex: Buffer.from(a.pythFeedId).toString("hex"),
      oracleSource: a.oracleSource,
      chainlinkFeedHex: Buffer.from(a.chainlinkFeedId).toString("hex"),
    }))
    .sort((x, y) => x.pairId - y.pairId);
}

// =====================================================================
// ADMIN — onboard a new SETTLE CURRENCY (collateral mint).
// 5 admin ix across both programs (idempotent — skips already-created):
//   perp_core: init_settle_config -> init_settle_vault -> init_risk_fund_vault
//   liquidity_pool: init_pool_config -> init_pool_vault
// perp ix need GlobalConfig.admin signer; the new pool's admin is set to caller.
// =====================================================================
export async function addSettleCurrency(
  ctx: Ctx,
  mintBase58: string,
  opts?: { defaultLeverageX?: string }
): Promise<string> {
  let mint: PublicKey;
  try {
    mint = new PublicKey((mintBase58 || "").trim());
  } catch {
    throw new Error("无效的 mint 地址");
  }
  if (!(await exists(ctx, mint))) throw new Error("该 mint 在链上不存在 — 请先创建 SPL mint");

  const lev = blank(opts?.defaultLeverageX) ? 10n * 10n ** 9n : toUnits(opts!.defaultLeverageX!, 9);
  const RENT = web3.SYSVAR_RENT_PUBKEY;
  const escrow = pda.escrowAuthority(mint);
  let last = "";

  // perp 1) init_settle_config
  if (!(await exists(ctx, pda.settleConfig(mint)))) {
    const ix = await ctx.perp.methods
      .initSettleConfig({
        maintenanceMarginRate: bn(0n),
        minDepositAmount: bn(0n),
        defaultLeverage: bn(lev),
        status: 0,
      } as any)
      .accountsStrict(
        A({
          globalConfig: pda.globalConfig(),
          admin: ctx.wallet,
          settleMint: mint,
          settleConfig: pda.settleConfig(mint),
          vaultAuthority: pda.vaultAuthority(mint),
          payer: ctx.wallet,
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // perp 2) init_settle_vault (vault_token + seq_counter)
  if (!(await exists(ctx, pda.vaultToken(mint)))) {
    const ix = await ctx.perp.methods
      .initSettleVault()
      .accountsStrict(
        A({
          globalConfig: pda.globalConfig(),
          admin: ctx.wallet,
          payer: ctx.wallet,
          settleMint: mint,
          settleConfig: pda.settleConfig(mint),
          vaultAuthority: pda.vaultAuthority(mint),
          vaultToken: pda.vaultToken(mint),
          seqCounter: pda.seqCounter(mint),
          tokenProgram: TOKEN_PROGRAM,
          systemProgram: SystemProgram.programId,
          rent: RENT,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // perp 3) init_risk_fund_vault
  if (!(await exists(ctx, pda.riskVaultToken(mint)))) {
    const ix = await ctx.perp.methods
      .initRiskFundVault()
      .accountsStrict(
        A({
          globalConfig: pda.globalConfig(),
          admin: ctx.wallet,
          payer: ctx.wallet,
          settleMint: mint,
          settleConfig: pda.settleConfig(mint),
          riskVaultAuthority: pda.riskVaultAuthority(mint),
          riskVaultToken: pda.riskVaultToken(mint),
          tokenProgram: TOKEN_PROGRAM,
          systemProgram: SystemProgram.programId,
          rent: RENT,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // lp 4) init_pool_config (MIXED, admin = caller)
  if (!(await exists(ctx, pda.poolConfig(mint)))) {
    const ix = await ctx.lp.methods
      .initPoolConfig({
        admin: ctx.wallet,
        poolType: 3, // MIXED
        escrowAuthority: escrow,
        perpCoreProgram: ctx.perp.programId,
        status: 0,
        privateMinProvideAmount: bn(0n),
        publicMinProvideAmount: bn(0n),
      } as any)
      .accountsStrict(
        A({
          payer: ctx.wallet,
          settleMint: mint,
          poolConfig: pda.poolConfig(mint),
          vaultAuthority: pda.poolVaultAuthority(mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // lp 5) init_pool_vault (+ escrow LpAccount)
  if (!(await exists(ctx, pda.poolVault(mint)))) {
    const ix = await ctx.lp.methods
      .initPoolVault()
      .accountsStrict(
        A({
          poolConfig: pda.poolConfig(mint),
          admin: ctx.wallet,
          payer: ctx.wallet,
          settleMint: mint,
          vaultAuthority: pda.poolVaultAuthority(mint),
          poolVault: pda.poolVault(mint),
          escrowLpAccount: pda.lpAccount(escrow, mint),
          tokenProgram: TOKEN_PROGRAM,
          systemProgram: SystemProgram.programId,
          rent: RENT,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  if (!last) throw new Error("该结算币已全部初始化，无需重复");
  return last;
}

export interface SettleMintRow {
  mint: string;
  decimals: number;
  defaultLeverage: bigint;
  status: number;
}
// All initialized settle currencies (decode every SettleConfig + read SPL decimals).
export async function listSettleMints(ctx: Ctx): Promise<SettleMintRow[]> {
  const all: any[] = await ctx.perp.account.settleConfig.all();
  const mints: PublicKey[] = all.map(({ account: a }) => a.settleMint);
  // one getMultipleAccounts instead of N getAccountInfo (avoids RPC rate limits)
  const infos = mints.length ? await ctx.connection.getMultipleAccountsInfo(mints) : [];
  const rows = all.map(({ account: a }, i) => ({
    mint: mints[i].toBase58(),
    decimals: infos[i] ? infos[i]!.data[44] : 0, // SPL Mint: decimals @ offset 44
    defaultLeverage: big(a.defaultLeverage),
    status: a.status,
  }));
  return rows.sort((x, y) => x.mint.localeCompare(y.mint));
}

// Transfer perp_core GlobalConfig.admin via set_addresses(new_admin=...).
// Signer must be the CURRENT admin (has_one). One-way: only newAdmin can sign
// perp admin ix afterwards. Does NOT touch PoolConfig.admin (immutable).
export async function transferAdmin(ctx: Ctx, newAdminBase58: string): Promise<string> {
  const s = (newAdminBase58 || "").trim();
  let newAdmin: PublicKey;
  try {
    newAdmin = new PublicKey(s);
  } catch {
    throw new Error("无效的地址（不是合法的 base58 公钥）");
  }
  if (newAdmin.equals(ctx.wallet)) throw new Error("新 admin 与当前钱包相同，无需转移");
  const args = {
    newAdmin,
    riskFundAuthority: null,
    platformFeeAuthority: null,
    tradeFeeAuthority: null,
    liquidityPoolProgram: null,
    treasuryProgram: null,
    maintenanceMarginRate: null,
    minDepositAmount: null,
    toPlatformTradeFeePct: null,
    mergeRemainingFeeToBuyback: null,
    orderSwitch: null,
  };
  const ix = await ctx.perp.methods
    .setAddresses(args as any)
    .accountsStrict(
      A({
        globalConfig: pda.globalConfig(),
        admin: ctx.wallet,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// update_pool_config: status / pool_type / private min-provide.
export async function updatePoolConfig(
  ctx: Ctx,
  opts: { status?: number; poolType?: number; privateMinUsdc?: string }
): Promise<string> {
  const args = {
    status: opts.status ?? null,
    poolType: opts.poolType ?? null,
    privateMinProvideAmount: blank(opts.privateMinUsdc) ? null : bn(toUnits(opts.privateMinUsdc!, ctx.mintDecimals)),
    publicMinProvideAmount: null,
    perpCoreProgram: null,
  };
  const ix = await ctx.lp.methods
    .updatePoolConfig(args as any)
    .accountsStrict(
      A({
        admin: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: pda.poolConfig(ctx.mint),
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}
