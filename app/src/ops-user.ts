// =====================================================================
// ops-user.ts — 用户「主动操作（签名合约）」方法
//
// 签名约定：fn(ctx: SignCtx, pairId?, ...args)。SignCtx 携带 phantom + 三个 Anchor
// Program（perp/lp/treasury），用 Program.methods.X().accounts().instruction() 构建
// 指令，再 sendIxs() 让 Phantom 签名发送。pairId 按交易对作用域的方法才有。
// 金额类参数为「人类可读字符串」，内部用 mintDecimals(connection, mint) 现取小数位换算。
// =====================================================================
import { web3 } from "@anchor-lang/core";
import { SignCtx, sendIxs, toUnits, bn, A, exists, mintDecimals } from "./ctx";
import * as pda from "./pdas";
import { TOKEN_PROGRAM, feedHexByPair } from "./config";
import {
  getNextOrderSeq,
  getPublicPoolInfo,
  fetchOraclePriceE9,
  MyPosition,
} from "./reads-user";

const { PublicKey, SystemProgram, ComputeBudgetProgram } = web3;

const POOL_SIDE_PRIVATE = 2;
const POOL_SIDE_PUBLIC = 1;

// =====================================================================
// 1. 私有池：创建账户 / 入金 / 设置风控参数
// =====================================================================
// 1a. Create private pool account = initialize_lp_account ONLY (funding is separate).
export async function createPrivatePool(ctx: SignCtx): Promise<string> {
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

// 1b. Add funds to the private pool = provide(side=PRIVATE). Requires the LpAccount first.
export async function providePrivatePool(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
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

// 1c. Set private-pool risk params = set_lp_params.
//   leverageX: pool leverage multiple (e.g. "10" -> 10x). undefined = leave.
//   rejectOrder: pause/resume taking orders. undefined = leave.
export async function setLpParams(
  ctx: SignCtx,
  opts: { leverageX?: string; rejectOrder?: boolean }
): Promise<string> {
  const lpAcc = pda.lpAccount(ctx.wallet, ctx.mint);
  if (!(await exists(ctx, lpAcc))) {
    throw new Error("私有池尚未创建 — 请先点「创建私有池」。");
  }
  let leverage: any = null;
  if (opts.leverageX !== undefined && opts.leverageX.trim() !== "") {
    const lev = toUnits(opts.leverageX, 9); // multiple -> 1e9 precision
    if (lev < 10n ** 9n) throw new Error("杠杆至少 1x");
    leverage = bn(lev);
  }
  const ix = await ctx.lp.methods
    .setLpParams({
      leverage,
      maintenanceMarginRate: null,
      addMarginRate: null,
      autoAddMargin: null,
      rejectOrder: opts.rejectOrder ?? null,
    } as any)
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
// 2. 限价开仓 / 限价平仓
// =====================================================================
export interface LimitOrderParams {
  direction: 1 | 2; // 1=LONG 2=SHORT (EVM 对齐)
  amountBtc: string; // e.g. "0.001"
  rewardGasSol: string; // keeper reward in 原生 SOL, e.g. "0.002"（挂单预付，撤单/过期退回）
  goodTillMinutes: number;
}

// 限价开仓 = initialize_user_account (if needed) + make_limit_order. limit price = Pyth latest.
export async function placeLimitOrder(
  ctx: SignCtx,
  pairId: number,
  p: LimitOrderParams
): Promise<string> {
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
  const targetPrice = await fetchOraclePriceE9(feedHexByPair(pairId)); // limit price = Pyth latest (1e9)
  const amount = toUnits(p.amountBtc, 9); // contract amount is 1e9
  const reward = toUnits(p.rewardGasSol, 9); // reward 现为原生 SOL（lamports，9 位小数），托管进订单 PDA
  const goodTill = BigInt(Math.floor(Date.now() / 1000) + p.goodTillMinutes * 60);

  ixs.push(
    await ctx.perp.methods
      .makeLimitOrder({
        pairId,
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
          pairConfig: pda.pairConfig(pairId),
          userAccount: ua,
          userLeverage: pda.userLeverage(ctx.wallet, pairId, ctx.mint),
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

// 限价平仓挂单 = make_limit_close（oracle-free；keeper 通过 trigger_limit_close 触发）。
// targetPrice 是触发阈值(1e9)：LONG 价>=target、SHORT 价<=target 触发；按当前价结算。
export async function placeLimitClose(
  ctx: SignCtx,
  pairId: number,
  p: {
    direction: number;
    amount1e9: bigint;
    targetPrice: bigint;
    rewardGasSol: string;
    goodTillMinutes: number;
  }
): Promise<string> {
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
  const ixs: web3.TransactionInstruction[] = [
    ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  ];
  const nextOrderSeq = await getNextOrderSeq(ctx);
  const amount = p.amount1e9; // exact remaining size (1e9), from the deal
  const reward = toUnits(p.rewardGasSol, 9); // 原生 SOL reward
  const goodTill = BigInt(Math.floor(Date.now() / 1000) + p.goodTillMinutes * 60);

  ixs.push(
    await ctx.perp.methods
      .makeLimitClose({
        pairId,
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
          pairConfig: pda.pairConfig(pairId),
          userAccount: ua,
          position: pda.position(ctx.wallet, pairId, p.direction, ctx.mint),
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
// 3. 交易账户保证金充值 / 提取（UserAccount margin balance）
// =====================================================================
export async function deposit(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
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

export async function withdraw(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
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
        vaultAuthority: pda.vaultAuthority(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 4. 公有池（共享做市金库）：入金 / 提取 / 私有池提取
// =====================================================================
// Add funds to the PUBLIC pool = provide(side=PUBLIC). Mints shares to PublicShare.
export async function providePublicPool(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
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

// Withdraw from the PUBLIC pool = withdraw_lp(shares, side=PUBLIC).
//   opts.all        -> burn ALL of the caller's shares
//   opts.amountUsdc -> burn enough shares for ~that payout (rounded down, capped at balance)
export async function withdrawPublicPool(
  ctx: SignCtx,
  opts: { amountUsdc?: string; all?: boolean }
): Promise<string> {
  const info = await getPublicPoolInfo(ctx);
  if (info.myShares <= 0n) throw new Error("公有池没有可提取的份额");
  let shares: bigint;
  if (opts.all) {
    shares = info.myShares;
  } else {
    const usdc = toUnits(opts.amountUsdc ?? "", await mintDecimals(ctx.connection, ctx.mint));
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
export async function withdrawLp(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
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
// 5. 用户交易杠杆 = set_user_leverage(pair_id, leverage)。
//    首调自动创建 UserLeverage PDA；后续覆盖。leverageX 为倍数（"20"->20x），1e9 存储。
// =====================================================================
export async function setUserLeverage(
  ctx: SignCtx,
  pairId: number,
  leverageX: string
): Promise<string> {
  const lev = toUnits(leverageX, 9); // multiple -> 1e9
  if (lev < 10n ** 9n) throw new Error("杠杆至少 1x");
  const ix = await ctx.perp.methods
    .setUserLeverage(pairId, bn(lev))
    .accountsStrict(
      A({
        owner: ctx.wallet,
        settleMint: ctx.mint,
        pairConfig: pda.pairConfig(pairId),
        userLeverage: pda.userLeverage(ctx.wallet, pairId, ctx.mint),
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 6. 撤单 / 市价平仓（批量 make_limit_close）
// =====================================================================
// Cancel a pending order (cancel_limit_order).
// position 仅 LIMIT_CLOSE(kind=2)需要（解冻 Position.freeze）；其它类型传 null=None，
// 避免去加载一个可能不存在的 Position 账户（撤单 revert 的根因）。
export async function cancelOrder(
  ctx: SignCtx,
  pairId: number,
  orderSeq: bigint,
  direction: number,
  orderKind: number
): Promise<string> {
  return sendIxs(ctx, [
    await ctx.perp.methods
      .cancelLimitOrder({ orderSeq: bn(orderSeq) })
      .accountsStrict(
        A({
          owner: ctx.wallet,
          settleMint: ctx.mint,
          settleConfig: pda.settleConfig(ctx.mint),
          userAccount: pda.userAccount(ctx.wallet, ctx.mint),
          position: orderKind === 2 ? pda.position(ctx.wallet, pairId, direction, ctx.mint) : null,
          limitedOrder: pda.limitedOrder(orderSeq, ctx.mint),
          triggerCondition: pda.triggerCondition(orderSeq, ctx.mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction(),
  ]);
}

// Close a whole position: one make_limit_close per underlying deal (single-deal close is
// the contract's model), batched in one tx with sequential order_seqs. markPrice (human)
// sets an immediate-trigger threshold; settles at the live price.
export async function closePosition(
  ctx: SignCtx,
  pairId: number,
  pos: MyPosition,
  markPrice: number
): Promise<string> {
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
  const ixs: web3.TransactionInstruction[] = [
    ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
  ];
  let seq = await getNextOrderSeq(ctx);
  const goodTill = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const px = BigInt(Math.round(markPrice * 1e9));
  const target = pos.direction === 1 ? (px * 95n) / 100n : (px * 105n) / 100n; // LONG=1
  for (const dl of pos.deals) {
    ixs.push(
      await ctx.perp.methods
        .makeLimitClose({
          pairId,
          direction: pos.direction,
          targetPrice: bn(target),
          amount: bn(dl.amount1e9),
          rewardGas: bn(2_000_000n), // 0.002 SOL（原生 SOL reward，托管进各平仓订单 PDA）
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
            pairConfig: pda.pairConfig(pairId),
            userAccount: ua,
            position: pda.position(ctx.wallet, pairId, pos.direction, ctx.mint),
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

// =====================================================================
// 7. 返佣 / 邀请（treasury program）
// =====================================================================
// Bind my inviter (one-time; the contract's init prevents re-binding).
export async function bindInviter(ctx: SignCtx, inviterB58: string): Promise<string> {
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

// Claim all accumulated commission → my USDC ATA (one-shot, zeroes unclaimed).
export async function claimCommission(ctx: SignCtx): Promise<string> {
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
