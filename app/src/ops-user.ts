// =====================================================================
// ops-user.ts — 用户「主动操作（签名合约）」方法
//
// 签名约定：fn(ctx: SignCtx, pairId?, ...args)。PDA 走 ctx.pda（程序 ID 已注入）。
// req1：金额/价格用 ethers BigNumber。req2：placeLimitOrder 价格由调用方传入（targetPrice）。
// 金额类参数为人类字符串，内部用 mintDecimals(connection, mint) 现取小数位换算。
// =====================================================================
import { web3 } from "@anchor-lang/core";
import { BigNumber } from "ethers";
import { SignCtx, sendIxs, toUnits, bn, exists, mintDecimals } from "./ctx";
import { TOKEN_PROGRAM } from "./config";
import { getNextOrderSeq, getPublicPoolInfo, MyPosition } from "./reads-user";

const { PublicKey, SystemProgram, ComputeBudgetProgram } = web3;

const POOL_SIDE_PRIVATE = 2;
const POOL_SIDE_PUBLIC = 1;
const E9 = BigNumber.from("1000000000"); // 1e9 (leverage precision)

// Anchor 1.0 strict accounts type friction bypass.
const A = (o: Record<string, web3.PublicKey | null>) => o as any;

// =====================================================================
// 1. 私有池：创建账户 / 入金 / 设置风控参数
// =====================================================================
export async function createPrivatePool(ctx: SignCtx): Promise<string> {
  const lpAcc = ctx.pda.lpAccount(ctx.wallet, ctx.mint);
  if (await exists(ctx, lpAcc)) {
    throw new Error("私有池已存在（每个钱包/结算币一个 LpAccount）。直接入金即可。");
  }
  const ix = await ctx.lp.methods
    .initializeLpAccount()
    .accountsStrict(
      A({
        holder: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: ctx.pda.poolConfig(ctx.mint),
        lpAccount: lpAcc,
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

export async function providePrivatePool(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
  if (amount.lte(0)) throw new Error("amount must be > 0");

  const lpAcc = ctx.pda.lpAccount(ctx.wallet, ctx.mint);
  if (!(await exists(ctx, lpAcc))) {
    throw new Error("私有池尚未创建 — 请先点「创建私有池」。");
  }

  const ix = await ctx.lp.methods
    .provide(bn(amount), POOL_SIDE_PRIVATE)
    .accountsPartial(
      A({
        provider: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: ctx.pda.poolConfig(ctx.mint),
        lpAccount: lpAcc,
        escrowLpAccount: null,
        publicShare: null,
        providerTokenAccount: ctx.pda.ata(ctx.wallet, ctx.mint),
        poolVault: ctx.pda.poolVault(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

export async function setLpParams(
  ctx: SignCtx,
  opts: { leverageX?: string; rejectOrder?: boolean }
): Promise<string> {
  const lpAcc = ctx.pda.lpAccount(ctx.wallet, ctx.mint);
  if (!(await exists(ctx, lpAcc))) {
    throw new Error("私有池尚未创建 — 请先点「创建私有池」。");
  }
  let leverage: any = null;
  if (opts.leverageX !== undefined && opts.leverageX.trim() !== "") {
    const lev = toUnits(opts.leverageX, 9); // multiple -> 1e9
    if (lev.lt(E9)) throw new Error("杠杆至少 1x");
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
        poolConfig: ctx.pda.poolConfig(ctx.mint),
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
  targetPrice: BigNumber; // 限价（1e9 精度）—— 由调用方提供（req2：不再内部取 Pyth）
  rewardGasSol: string; // keeper reward in 原生 SOL（挂单预付，撤单/过期退回）
  goodTillMinutes: number;
}

// 限价开仓 = initialize_user_account (if needed) + make_limit_order。
// 限价由 p.targetPrice 传入（1e9 精度），不再内部拉 Pyth。
export async function placeLimitOrder(
  ctx: SignCtx,
  pairId: number,
  p: LimitOrderParams
): Promise<string> {
  const ua = ctx.pda.userAccount(ctx.wallet, ctx.mint);
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
            settleConfig: ctx.pda.settleConfig(ctx.mint),
            userAccount: ua,
            systemProgram: SystemProgram.programId,
          })
        )
        .instruction()
    );
  }

  const nextOrderSeq = await getNextOrderSeq(ctx);
  const amount = toUnits(p.amountBtc, 9); // contract amount is 1e9
  const reward = toUnits(p.rewardGasSol, 9); // 原生 SOL（lamports，9 位小数）
  const goodTill = Math.floor(Date.now() / 1000) + p.goodTillMinutes * 60;

  ixs.push(
    await ctx.perp.methods
      .makeLimitOrder({
        pairId,
        direction: p.direction,
        targetPrice: bn(p.targetPrice),
        amount: bn(amount),
        rewardGas: bn(reward),
        orderSeq: bn(nextOrderSeq),
        goodTill: bn(goodTill),
        deadline: bn(0),
      })
      .accountsStrict(
        A({
          owner: ctx.wallet,
          settleMint: ctx.mint,
          globalConfig: ctx.pda.globalConfig(),
          settleConfig: ctx.pda.settleConfig(ctx.mint),
          pairConfig: ctx.pda.pairConfig(pairId),
          userAccount: ua,
          userLeverage: ctx.pda.userLeverage(ctx.wallet, pairId, ctx.mint),
          seqCounter: ctx.pda.seqCounter(ctx.mint),
          limitedOrder: ctx.pda.limitedOrder(nextOrderSeq, ctx.mint),
          triggerCondition: ctx.pda.triggerCondition(nextOrderSeq, ctx.mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction()
  );

  return sendIxs(ctx, ixs);
}

// 限价平仓挂单 = make_limit_close（oracle-free）。targetPrice 是触发阈值(1e9)。
export async function placeLimitClose(
  ctx: SignCtx,
  pairId: number,
  p: {
    direction: number;
    amount1e9: BigNumber;
    targetPrice: BigNumber;
    rewardGasSol: string;
    goodTillMinutes: number;
  }
): Promise<string> {
  const ua = ctx.pda.userAccount(ctx.wallet, ctx.mint);
  const ixs: web3.TransactionInstruction[] = [
    ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
  ];
  const nextOrderSeq = await getNextOrderSeq(ctx);
  const reward = toUnits(p.rewardGasSol, 9);
  const goodTill = Math.floor(Date.now() / 1000) + p.goodTillMinutes * 60;

  ixs.push(
    await ctx.perp.methods
      .makeLimitClose({
        pairId,
        direction: p.direction,
        targetPrice: bn(p.targetPrice),
        amount: bn(p.amount1e9),
        rewardGas: bn(reward),
        orderSeq: bn(nextOrderSeq),
        goodTill: bn(goodTill),
        deadline: bn(0),
      })
      .accountsStrict(
        A({
          owner: ctx.wallet,
          settleMint: ctx.mint,
          globalConfig: ctx.pda.globalConfig(),
          settleConfig: ctx.pda.settleConfig(ctx.mint),
          pairConfig: ctx.pda.pairConfig(pairId),
          userAccount: ua,
          position: ctx.pda.position(ctx.wallet, pairId, p.direction, ctx.mint),
          seqCounter: ctx.pda.seqCounter(ctx.mint),
          limitedOrder: ctx.pda.limitedOrder(nextOrderSeq, ctx.mint),
          triggerCondition: ctx.pda.triggerCondition(nextOrderSeq, ctx.mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction()
  );

  return sendIxs(ctx, ixs);
}

// =====================================================================
// 3. 交易账户保证金充值 / 提取
// =====================================================================
export async function deposit(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
  if (amount.lte(0)) throw new Error("amount must be > 0");
  const ua = ctx.pda.userAccount(ctx.wallet, ctx.mint);
  const ixs: web3.TransactionInstruction[] = [];
  if (!(await exists(ctx, ua))) {
    ixs.push(
      await ctx.perp.methods
        .initializeUserAccount()
        .accountsStrict(
          A({
            owner: ctx.wallet,
            settleMint: ctx.mint,
            settleConfig: ctx.pda.settleConfig(ctx.mint),
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
          globalConfig: ctx.pda.globalConfig(),
          settleConfig: ctx.pda.settleConfig(ctx.mint),
          userAccount: ua,
          userTokenAccount: ctx.pda.ata(ctx.wallet, ctx.mint),
          vaultToken: ctx.pda.vaultToken(ctx.mint),
          tokenProgram: TOKEN_PROGRAM,
        })
      )
      .instruction()
  );
  return sendIxs(ctx, ixs);
}

export async function withdraw(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
  if (amount.lte(0)) throw new Error("amount must be > 0");
  const ix = await ctx.perp.methods
    .withdraw(bn(amount))
    .accountsStrict(
      A({
        owner: ctx.wallet,
        settleMint: ctx.mint,
        settleConfig: ctx.pda.settleConfig(ctx.mint),
        userAccount: ctx.pda.userAccount(ctx.wallet, ctx.mint),
        userTokenAccount: ctx.pda.ata(ctx.wallet, ctx.mint),
        vaultToken: ctx.pda.vaultToken(ctx.mint),
        vaultAuthority: ctx.pda.vaultAuthority(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 4. 公有池：入金 / 提取 / 私有池提取
// =====================================================================
export async function providePublicPool(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
  if (amount.lte(0)) throw new Error("入金额必须 > 0");
  const escrowAuth = ctx.pda.escrowAuthority(ctx.mint);
  const ix = await ctx.lp.methods
    .provide(bn(amount), POOL_SIDE_PUBLIC)
    .accountsPartial(
      A({
        provider: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: ctx.pda.poolConfig(ctx.mint),
        lpAccount: null,
        escrowLpAccount: ctx.pda.lpAccount(escrowAuth, ctx.mint),
        publicShare: ctx.pda.publicShare(ctx.wallet, ctx.mint),
        providerTokenAccount: ctx.pda.ata(ctx.wallet, ctx.mint),
        poolVault: ctx.pda.poolVault(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// Withdraw from the PUBLIC pool = withdraw_lp(shares, side=PUBLIC).
export async function withdrawPublicPool(
  ctx: SignCtx,
  opts: { amountUsdc?: string; all?: boolean }
): Promise<string> {
  const info = await getPublicPoolInfo(ctx);
  if (info.myShares.lte(0)) throw new Error("公有池没有可提取的份额");
  let shares: BigNumber;
  if (opts.all) {
    shares = info.myShares;
  } else {
    const usdc = toUnits(opts.amountUsdc ?? "", await mintDecimals(ctx.connection, ctx.mint));
    if (usdc.lte(0)) throw new Error("提取金额必须 > 0");
    if (info.escrowAmount.lte(0)) throw new Error("公有池为空");
    shares = usdc.mul(info.totalShares).div(info.escrowAmount); // round down -> payout ≤ requested
    if (shares.lte(0)) throw new Error("提取金额太小（不足 1 份额）");
    if (shares.gt(info.myShares)) shares = info.myShares; // cap at balance
  }
  const escrowAuth = ctx.pda.escrowAuthority(ctx.mint);
  const ix = await ctx.lp.methods
    .withdrawLp(bn(shares), POOL_SIDE_PUBLIC)
    .accountsPartial(
      A({
        holder: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: ctx.pda.poolConfig(ctx.mint),
        lpAccount: null,
        escrowLpAccount: ctx.pda.lpAccount(escrowAuth, ctx.mint),
        publicShare: ctx.pda.publicShare(ctx.wallet, ctx.mint),
        holderTokenAccount: ctx.pda.ata(ctx.wallet, ctx.mint),
        poolVault: ctx.pda.poolVault(ctx.mint),
        vaultAuthority: ctx.pda.poolVaultAuthority(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// Withdraw from the private LP pool (pool_side = PRIVATE, amount = base units).
export async function withdrawLp(ctx: SignCtx, amountUsdc: string): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
  if (amount.lte(0)) throw new Error("amount must be > 0");
  const ix = await ctx.lp.methods
    .withdrawLp(bn(amount), POOL_SIDE_PRIVATE)
    .accountsPartial(
      A({
        holder: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: ctx.pda.poolConfig(ctx.mint),
        lpAccount: ctx.pda.lpAccount(ctx.wallet, ctx.mint),
        escrowLpAccount: null,
        publicShare: null,
        holderTokenAccount: ctx.pda.ata(ctx.wallet, ctx.mint),
        poolVault: ctx.pda.poolVault(ctx.mint),
        vaultAuthority: ctx.pda.poolVaultAuthority(ctx.mint),
        tokenProgram: TOKEN_PROGRAM,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 5. 用户交易杠杆 = set_user_leverage(pair_id, leverage)
// =====================================================================
export async function setUserLeverage(
  ctx: SignCtx,
  pairId: number,
  leverageX: string
): Promise<string> {
  const lev = toUnits(leverageX, 9); // multiple -> 1e9
  if (lev.lt(E9)) throw new Error("杠杆至少 1x");
  const ix = await ctx.perp.methods
    .setUserLeverage(pairId, bn(lev))
    .accountsStrict(
      A({
        owner: ctx.wallet,
        settleMint: ctx.mint,
        pairConfig: ctx.pda.pairConfig(pairId),
        userLeverage: ctx.pda.userLeverage(ctx.wallet, pairId, ctx.mint),
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 6. 撤单 / 市价平仓（批量 make_limit_close）
// =====================================================================
export async function cancelOrder(
  ctx: SignCtx,
  pairId: number,
  orderSeq: BigNumber,
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
          settleConfig: ctx.pda.settleConfig(ctx.mint),
          userAccount: ctx.pda.userAccount(ctx.wallet, ctx.mint),
          position:
            orderKind === 2 ? ctx.pda.position(ctx.wallet, pairId, direction, ctx.mint) : null,
          limitedOrder: ctx.pda.limitedOrder(orderSeq, ctx.mint),
          triggerCondition: ctx.pda.triggerCondition(orderSeq, ctx.mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction(),
  ]);
}

// Close a whole position: one make_limit_close per underlying deal, batched.
// markPrice (human) sets an immediate-trigger threshold; settles at the live price.
export async function closePosition(
  ctx: SignCtx,
  pairId: number,
  pos: MyPosition,
  markPrice: number
): Promise<string> {
  const ua = ctx.pda.userAccount(ctx.wallet, ctx.mint);
  const ixs: web3.TransactionInstruction[] = [
    ComputeBudgetProgram.requestHeapFrame({ bytes: 256 * 1024 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
  ];
  let seq = await getNextOrderSeq(ctx);
  const goodTill = Math.floor(Date.now() / 1000) + 3600;
  const px = BigNumber.from(Math.round(markPrice * 1e9));
  const target = pos.direction === 1 ? px.mul(95).div(100) : px.mul(105).div(100); // LONG=1
  for (const dl of pos.deals) {
    ixs.push(
      await ctx.perp.methods
        .makeLimitClose({
          pairId,
          direction: pos.direction,
          targetPrice: bn(target),
          amount: bn(dl.amount1e9),
          rewardGas: bn(2_000_000), // 0.002 SOL（原生 SOL reward）
          orderSeq: bn(seq),
          goodTill: bn(goodTill),
          deadline: bn(0),
        })
        .accountsStrict(
          A({
            owner: ctx.wallet,
            settleMint: ctx.mint,
            globalConfig: ctx.pda.globalConfig(),
            settleConfig: ctx.pda.settleConfig(ctx.mint),
            pairConfig: ctx.pda.pairConfig(pairId),
            userAccount: ua,
            position: ctx.pda.position(ctx.wallet, pairId, pos.direction, ctx.mint),
            seqCounter: ctx.pda.seqCounter(ctx.mint),
            limitedOrder: ctx.pda.limitedOrder(seq, ctx.mint),
            triggerCondition: ctx.pda.triggerCondition(seq, ctx.mint),
            systemProgram: SystemProgram.programId,
          })
        )
        .instruction()
    );
    seq = seq.add(1);
  }
  return sendIxs(ctx, ixs);
}

// =====================================================================
// 7. 返佣 / 邀请（treasury program）
// =====================================================================
export async function bindInviter(ctx: SignCtx, inviterB58: string): Promise<string> {
  const inviter = new PublicKey(inviterB58.trim());
  if (inviter.equals(ctx.wallet)) throw new Error("不能绑定自己为邀请人");
  return sendIxs(ctx, [
    await ctx.treasury.methods
      .bindInviter(inviter)
      .accountsStrict(
        A({
          invitee: ctx.wallet,
          inviteRelation: ctx.pda.inviteRelation(ctx.wallet),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction(),
  ]);
}

export async function claimCommission(ctx: SignCtx): Promise<string> {
  return sendIxs(ctx, [
    await ctx.treasury.methods
      .claimCommission()
      .accountsStrict(
        A({
          inviter: ctx.wallet,
          settleMint: ctx.mint,
          treasuryConfig: ctx.pda.treasuryConfig(),
          commissionAccount: ctx.pda.commissionAccount(ctx.wallet, ctx.mint),
          treasuryVault: ctx.pda.treasuryVault(ctx.mint),
          treasuryVaultAuthority: ctx.pda.treasuryVaultAuthority(ctx.mint),
          inviterTokenAccount: ctx.pda.ata(ctx.wallet, ctx.mint),
          tokenProgram: TOKEN_PROGRAM,
        })
      )
      .instruction(),
  ]);
}
