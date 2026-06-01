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

const { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, ComputeBudgetProgram } = web3;
type PublicKey = web3.PublicKey;

const POOL_SIDE_PRIVATE = 2;

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
// 1. Create private pool  =  initialize_lp_account (if needed) + provide(PRIVATE)
// =====================================================================
export async function createPrivatePool(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, USDC_DECIMALS);
  if (amount <= 0n) throw new Error("amount must be > 0");

  const lpAcc = pda.lpAccount(ctx.wallet);
  const ixs: web3.TransactionInstruction[] = [];

  if (!(await exists(ctx, lpAcc))) {
    ixs.push(
      await ctx.lp.methods
        .initializeLpAccount()
        .accounts({
          holder: ctx.wallet,
          settleMint: USDC_MINT,
          poolConfig: pda.poolConfig(),
          lpAccount: lpAcc,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
  }

  ixs.push(
    await ctx.lp.methods
      .provide(bn(amount), POOL_SIDE_PRIVATE)
      .accountsPartial({
        provider: ctx.wallet,
        settleMint: USDC_MINT,
        poolConfig: pda.poolConfig(),
        lpAccount: lpAcc, // private path: provider's own LP account
        escrowLpAccount: null, // public-only (None for private)
        publicShare: null, // public-only (None for private)
        providerTokenAccount: pda.ata(ctx.wallet),
        poolVault: pda.poolVault(),
        tokenProgram: TOKEN_PROGRAM,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction()
  );

  return sendIxs(ctx, ixs);
}

// =====================================================================
// 2. Place limit order = initialize_user_account (if needed) + deposit + make_limit_order
// =====================================================================
export interface LimitOrderParams {
  direction: 0 | 1; // 0=LONG 1=SHORT
  amountBtc: string; // e.g. "0.001"
  rewardGasUsdc: string; // keeper reward, e.g. "0.1"
  goodTillMinutes: number;
}

// Pyth latest price, normalized to 1e18 (same convention as the on-chain oracle).
export async function fetchOraclePriceE18(): Promise<bigint> {
  const id = PYTH_FEED_ID.replace(/^0x/, "");
  const r = await fetch(`${HERMES_URL}/v2/updates/price/latest?ids[]=${id}`);
  const j = await r.json();
  const p = j.parsed[0].price; // { price, expo, publish_time }
  const raw = BigInt(p.price);
  const shift = 18 + Number(p.expo);
  return shift >= 0
    ? raw * 10n ** BigInt(shift)
    : raw / 10n ** BigInt(-shift);
}

export async function placeLimitOrder(ctx: Ctx, p: LimitOrderParams): Promise<string> {
  const ua = pda.userAccount(ctx.wallet);
  // make_limit_order boxes many accounts -> needs more than the default 32 KB heap.
  const ixs: web3.TransactionInstruction[] = [
    ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  ];

  if (!(await exists(ctx, ua))) {
    ixs.push(
      await ctx.perp.methods
        .initializeUserAccount()
        .accounts({
          owner: ctx.wallet,
          settleMint: USDC_MINT,
          settleConfig: pda.settleConfig(),
          userAccount: ua,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
  }

  const nextOrderSeq = await getNextOrderSeq(ctx);
  const targetPrice = await fetchOraclePriceE18(); // limit price = Pyth latest (1e18)
  const amount = toUnits(p.amountBtc, 18); // contract amount is 1e18
  const reward = toUnits(p.rewardGasUsdc, USDC_DECIMALS);
  const goodTill = BigInt(Math.floor(Date.now() / 1000) + p.goodTillMinutes * 60);

  ixs.push(
    await ctx.perp.methods
      .makeLimitOrder({
        pairId: PAIR_ID,
        direction: p.direction,
        targetPrice: bn(targetPrice),
        amount: bn(amount),
        rewardGas: bn(reward),
        orderSeq: bn(nextOrderSeq),
        goodTill: bn(goodTill),
        deadline: bn(0n),
      })
      .accounts({
        owner: ctx.wallet,
        settleMint: USDC_MINT,
        globalConfig: pda.globalConfig(),
        settleConfig: pda.settleConfig(),
        pairConfig: pda.pairConfig(PAIR_ID),
        userAccount: ua,
        userLeverage: pda.userLeverage(ctx.wallet, PAIR_ID),
        seqCounter: pda.seqCounter(),
        limitedOrder: pda.limitedOrder(nextOrderSeq),
        triggerCondition: pda.triggerCondition(nextOrderSeq),
        systemProgram: SystemProgram.programId,
      })
      .instruction()
  );

  return sendIxs(ctx, ixs);
}

// =====================================================================
// 3. Trading-account deposit / withdraw (UserAccount margin balance)
// =====================================================================
export async function deposit(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, USDC_DECIMALS);
  if (amount <= 0n) throw new Error("amount must be > 0");
  const ua = pda.userAccount(ctx.wallet);
  const ixs: web3.TransactionInstruction[] = [];
  if (!(await exists(ctx, ua))) {
    ixs.push(
      await ctx.perp.methods
        .initializeUserAccount()
        .accounts({
          owner: ctx.wallet,
          settleMint: USDC_MINT,
          settleConfig: pda.settleConfig(),
          userAccount: ua,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
  }
  ixs.push(
    await ctx.perp.methods
      .deposit(bn(amount))
      .accounts({
        owner: ctx.wallet,
        settleMint: USDC_MINT,
        globalConfig: pda.globalConfig(),
        settleConfig: pda.settleConfig(),
        userAccount: ua,
        userTokenAccount: pda.ata(ctx.wallet),
        vaultToken: pda.vaultToken(),
        tokenProgram: TOKEN_PROGRAM,
      })
      .instruction()
  );
  return sendIxs(ctx, ixs);
}

export async function withdraw(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, USDC_DECIMALS);
  if (amount <= 0n) throw new Error("amount must be > 0");
  const ix = await ctx.perp.methods
    .withdraw(bn(amount))
    .accounts({
      owner: ctx.wallet,
      settleMint: USDC_MINT,
      settleConfig: pda.settleConfig(),
      userAccount: pda.userAccount(ctx.wallet),
      userTokenAccount: pda.ata(ctx.wallet),
      vaultToken: pda.vaultToken(),
      vaultAuthority: pda.vaultAuthority(),
      tokenProgram: TOKEN_PROGRAM,
    })
    .instruction();
  return sendIxs(ctx, [ix]);
}

// Withdraw from the private LP pool (pool_side = PRIVATE, amount = base units).
export async function withdrawLp(ctx: Ctx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, USDC_DECIMALS);
  if (amount <= 0n) throw new Error("amount must be > 0");
  const ix = await ctx.lp.methods
    .withdrawLp(bn(amount), POOL_SIDE_PRIVATE)
    .accountsPartial({
      holder: ctx.wallet,
      settleMint: USDC_MINT,
      poolConfig: pda.poolConfig(),
      lpAccount: pda.lpAccount(ctx.wallet),
      escrowLpAccount: null,
      publicShare: null,
      holderTokenAccount: pda.ata(ctx.wallet),
      poolVault: pda.poolVault(),
      vaultAuthority: pda.poolVaultAuthority(),
      tokenProgram: TOKEN_PROGRAM,
    } as any)
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// Reads
// =====================================================================
export async function getNextOrderSeq(ctx: Ctx): Promise<bigint> {
  const ai = await ctx.connection.getAccountInfo(pda.seqCounter());
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
  const ai = await ctx.connection.getAccountInfo(pda.userAccount(ctx.wallet));
  if (!ai) return null;
  const d = ai.data;
  return {
    deposit: readU128LE(d, 74),
    available: readU128LE(d, 90),
    margin: readU128LE(d, 106),
    orderLocked: readU128LE(d, 122),
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
  const ai = await ctx.connection.getAccountInfo(pda.lpAccount(ctx.wallet));
  if (!ai) return null;
  const d = ai.data;
  return {
    amount: readU128LE(d, 74),
    available: readU128LE(d, 90),
    locked: readU128LE(d, 106),
    leverageX: Number(readU128LE(d, 138) / 10n ** 16n) / 100, // 1e18 -> x
    rejectOrder: d[187] === 1,
  };
}

export async function getUsdcBalance(ctx: Ctx): Promise<bigint> {
  const ai = await ctx.connection.getAccountInfo(pda.ata(ctx.wallet));
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
    if (d.length < 232) continue;
    const orderKind = d[86];
    const state = d[87];
    if (orderKind !== 1 || state !== 1) continue; // LIMIT_OPEN + PENDING
    out.push({
      orderSeq: d.readBigUInt64LE(10),
      direction: d[84],
      state,
      amount: readU128LE(d, 88),
      targetPrice: readU128LE(d, 104),
    });
  }
  return out;
}

// =====================================================================
// History (NO backend DB): decode events from the user's own transactions.
//
// getSignaturesForAddress(user_account PDA) returns every tx that touched the
// user's perp account — placing (own tx) AND filling (keeper's tx, where the
// user appears as `taker`). We then getTransaction() each one and decode the
// Anchor events from its logs with EventParser. The `limited_order` PDA is
// closed on fill, but the events live forever in the ledger.
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
  const ua = pda.userAccount(ctx.wallet);
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
    for (const ev of parser.parseLogs(logs)) {
      const d = ev.data as any;
      if (d.taker?.toBase58?.() !== me) continue;
      const side = d.direction === 0 ? "LONG" : "SHORT";
      if (ev.name === "createLimitedOrder") {
        items.push({
          kind: "下单",
          orderSeq: d.orderSeq.toString(),
          side,
          amount: fromUnits(BigInt(d.amount.toString()), 18),
          price: fromUnits(BigInt(d.targetPrice.toString()), 18),
          time,
          sig: s.signature,
        });
      } else if (ev.name === "limitedOrderHistory") {
        items.push({
          kind: ORDER_STATE_LABEL[d.state] ?? `状态${d.state}`,
          orderSeq: d.orderSeq.toString(),
          side,
          amount: fromUnits(BigInt(d.amount.toString()), 18),
          price: fromUnits(BigInt(d.targetPrice.toString()), 18),
          time,
          sig: s.signature,
        });
      }
    }
  }
  return items.sort((a, b) => b.time - a.time);
}

// ---- Hermes live price (for context display) ----
export async function fetchHermesPrice(): Promise<number> {
  const id = PYTH_FEED_ID.replace(/^0x/, "");
  const r = await fetch(`${HERMES_URL}/v2/updates/price/latest?ids[]=${id}`);
  const j = await r.json();
  const p = j.parsed[0].price;
  return Number(p.price) * Math.pow(10, p.expo);
}
