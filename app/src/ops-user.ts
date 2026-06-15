// =====================================================================
// ops-user.ts — 用户「主动操作（签名合约）」方法
//
// 签名约定：fn(ctx: SignCtx, pairId?, ...args)。PDA 走 ctx.pda（程序 ID 已注入）。
// req1：金额/价格用 ethers BigNumber。req2：placeLimitOrder 价格由调用方传入（targetPrice）。
// 金额类参数为人类字符串，内部用 mintDecimals(connection, mint) 现取小数位换算。
// =====================================================================
import { web3 } from "@anchor-lang/core";
import { BigNumber } from "ethers";
import { SignCtx, sendIxs, toUnits, bn, exists, mintDecimals } from "./solana";
import { TOKEN_PROGRAM } from "./pdas";
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

// =====================================================================
// createMarket — 无许可建市（任何人用任意经典 SPL 代币当结算币，对齐 EVM）。
//
// 走每个 program 的「无许可路径」(admin = null)，合约自动套护栏：钳制风险参数 /
// 拒绝 freeze-authority mint / 强制官方 perp_core_program / 强制私有池 / 记录 creator。
// 6 步（幂等，按需弹签名）：perp settle_config→vault→risk + treasury vault + lp pool_config→vault。
// 前置：lp_global_config 已由管理员初始化（提供官方 perp_core_program）。
// =====================================================================
const POOL_TYPE_PRIVATE = 2;

export async function createMarket(ctx: SignCtx, mintBase58: string): Promise<string> {
  let mint: web3.PublicKey;
  try {
    mint = new PublicKey((mintBase58 || "").trim());
  } catch {
    throw new Error("无效的 mint 地址");
  }

  // 1) 护栏预检：mint 必须存在 + 经典 SPL Token + 无 freeze authority（无许可路径合约会拒绝带 freeze 的）。
  const ai = await ctx.connection.getAccountInfo(mint);
  if (!ai) throw new Error("该 mint 在链上不存在 — 请先创建/确认 SPL mint");
  if (!ai.owner.equals(TOKEN_PROGRAM))
    throw new Error("仅支持经典 SPL Token（Token-2022 暂不支持）");
  // SPL Mint 布局：freeze_authority 是 COption<Pubkey>，4 字节 tag @offset 46；tag≠0 = 有 freeze authority。
  if (ai.data.length >= 50 && ai.data.readUInt32LE(46) !== 0)
    throw new Error(
      "该 mint 带 freeze authority（可冻结金库），无许可建市不允许。请换无 freeze 的代币，或让管理员在「管理员」页用 admin 路径添加（USDC/USDT 这类合规稳定币走管理员）。"
    );

  // 2) lp_global_config 必须已初始化（提供强制写入 PoolConfig 的官方 perp_core_program）。
  if (!(await exists(ctx, ctx.pda.lpGlobalConfig())))
    throw new Error("lp_global_config 尚未初始化 — 请让管理员先在「管理员」页一键初始化（init_lp_global_config）。");

  const RENT = web3.SYSVAR_RENT_PUBKEY;
  let last = "";

  // perp 1) init_settle_config（无许可：admin=null → 钳制风险参数 + 记录 creator）
  if (!(await exists(ctx, ctx.pda.settleConfig(mint)))) {
    const ix = await ctx.perp.methods
      .initSettleConfig({
        maintenanceMarginRate: bn(0), // 无许可路径忽略 → 走全局默认
        minDepositAmount: bn(0),
        defaultLeverage: bn(toUnits("10", 9)), // 会被钳制到 MAX_PERMISSIONLESS_LEVERAGE
        status: 0,
      } as any)
      .accountsStrict(
        A({
          globalConfig: ctx.pda.globalConfig(),
          admin: null,
          settleMint: mint,
          settleConfig: ctx.pda.settleConfig(mint),
          vaultAuthority: ctx.pda.vaultAuthority(mint),
          payer: ctx.wallet,
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // perp 2) init_settle_vault（无许可：拒绝 freeze-authority mint）
  if (!(await exists(ctx, ctx.pda.vaultToken(mint)))) {
    const ix = await ctx.perp.methods
      .initSettleVault()
      .accountsStrict(
        A({
          globalConfig: ctx.pda.globalConfig(),
          admin: null,
          payer: ctx.wallet,
          settleMint: mint,
          settleConfig: ctx.pda.settleConfig(mint),
          vaultAuthority: ctx.pda.vaultAuthority(mint),
          vaultToken: ctx.pda.vaultToken(mint),
          seqCounter: ctx.pda.seqCounter(mint),
          tokenProgram: TOKEN_PROGRAM,
          systemProgram: SystemProgram.programId,
          rent: RENT,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // perp 3) init_risk_fund_vault（无许可；vault 初始为空）
  if (!(await exists(ctx, ctx.pda.riskVaultToken(mint)))) {
    const ix = await ctx.perp.methods
      .initRiskFundVault()
      .accountsStrict(
        A({
          globalConfig: ctx.pda.globalConfig(),
          admin: null,
          payer: ctx.wallet,
          settleMint: mint,
          settleConfig: ctx.pda.settleConfig(mint),
          riskVaultAuthority: ctx.pda.riskVaultAuthority(mint),
          riskVaultToken: ctx.pda.riskVaultToken(mint),
          tokenProgram: TOKEN_PROGRAM,
          systemProgram: SystemProgram.programId,
          rent: RENT,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // treasury 4) init_treasury_vault（传递性闸门：要求 perp vault_token 已存在 → 上面 step2 已建）
  if (!(await exists(ctx, ctx.pda.treasuryVault(mint)))) {
    const ix = await ctx.treasury.methods
      .initTreasuryVault()
      .accountsStrict(
        A({
          treasuryConfig: ctx.pda.treasuryConfig(),
          payer: ctx.wallet,
          settleMint: mint,
          perpCoreVaultToken: ctx.pda.vaultToken(mint),
          vaultAuthority: ctx.pda.treasuryVaultAuthority(mint),
          treasuryVault: ctx.pda.treasuryVault(mint),
          platformFeeVault: ctx.pda.platformFeeVault(mint),
          tradeFeeVault: ctx.pda.tradeFeeVault(mint),
          tokenProgram: TOKEN_PROGRAM,
          systemProgram: SystemProgram.programId,
          rent: RENT,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // lp 5) init_pool_config（无许可 → 强制 PRIVATE 池 + 官方 perp_core_program + 记录 creator）
  if (!(await exists(ctx, ctx.pda.poolConfig(mint)))) {
    const ix = await ctx.lp.methods
      .initPoolConfig({
        admin: ctx.wallet, // 无许可路径忽略（pool_config.admin 强制 = payer）
        poolType: POOL_TYPE_PRIVATE, // 无许可强制 PRIVATE
        escrowAuthority: PublicKey.default, // 无许可强制 default
        status: 0,
        privateMinProvideAmount: bn(0),
        publicMinProvideAmount: bn(0),
      } as any)
      .accountsStrict(
        A({
          payer: ctx.wallet,
          lpGlobalConfig: ctx.pda.lpGlobalConfig(),
          admin: null,
          settleMint: mint,
          poolConfig: ctx.pda.poolConfig(mint),
          vaultAuthority: ctx.pda.poolVaultAuthority(mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // lp 6) init_pool_vault（传递性闸门：perp vault_token 已存在；escrow = default）
  if (!(await exists(ctx, ctx.pda.poolVault(mint)))) {
    const ix = await ctx.lp.methods
      .initPoolVault()
      .accountsStrict(
        A({
          poolConfig: ctx.pda.poolConfig(mint),
          payer: ctx.wallet,
          settleMint: mint,
          perpCoreVaultToken: ctx.pda.vaultToken(mint),
          vaultAuthority: ctx.pda.poolVaultAuthority(mint),
          poolVault: ctx.pda.poolVault(mint),
          escrowLpAccount: ctx.pda.lpAccount(PublicKey.default, mint),
          tokenProgram: TOKEN_PROGRAM,
          systemProgram: SystemProgram.programId,
          rent: RENT,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  if (!last) throw new Error("该市场已全部初始化，无需重复。");
  return last;
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

// 做市方手动追加某笔接单的保证金（EVM addMarginAmount）= lp.add_margin(taker_deal_seq, amount)。
// 按 taker 的 deal_seq 定位 MakerDeal；amount 为人类字符串（结算币单位）。
export async function addMakerMargin(
  ctx: SignCtx,
  takerDealSeq: BigNumber,
  amountUsdc: string
): Promise<string> {
  const amount = toUnits(amountUsdc, await mintDecimals(ctx.connection, ctx.mint));
  if (amount.lte(0)) throw new Error("amount must be > 0");
  const lpAcc = ctx.pda.lpAccount(ctx.wallet, ctx.mint);
  if (!(await exists(ctx, lpAcc))) throw new Error("私有池/做市账户不存在 — 你不是该笔的做市方。");
  const ix = await ctx.lp.methods
    .addMargin(bn(takerDealSeq), bn(amount))
    .accountsStrict(
      A({
        maker: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: ctx.pda.poolConfig(ctx.mint),
        lpAccount: lpAcc,
        makerDeal: ctx.pda.makerDeal(takerDealSeq, ctx.mint),
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
// 2b. 止盈止损开仓（OCO）= stop_take_order(StopTakeArgs::Open)
//
// 触发开仓 + 可选自动挂 TP/SL。keeper 通过 trigger_stop_take_open 撮合。
// triggerPrice 必填 >0；openLimitPrice 0=触发后市价开、>0=限价开；
// gain/lossTriggerPrice 为开仓后自动挂的止盈/止损触发价（0=不挂）。
// =====================================================================
export interface OcoOpenParams {
  direction: 1 | 2; // 1=LONG 2=SHORT
  amountBtc: string;
  triggerPrice: BigNumber; // 触发开仓价 (1e9)，必填 >0
  openLimitPrice?: BigNumber; // 0/缺省=市价开；>0=限价开
  gainTriggerPrice?: BigNumber; // 自动 TP 触发价 (1e9)，0/缺省=不挂
  lossTriggerPrice?: BigNumber; // 自动 SL 触发价 (1e9)，0/缺省=不挂
  rewardGasSol: string; // keeper 预付（原生 SOL）
  goodTillMinutes: number;
}
export async function ocoTrade(ctx: SignCtx, pairId: number, p: OcoOpenParams): Promise<string> {
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
  const amount = toUnits(p.amountBtc, 9);
  const reward = toUnits(p.rewardGasSol, 9);
  const goodTill = Math.floor(Date.now() / 1000) + p.goodTillMinutes * 60;
  const Z = bn(0);

  ixs.push(
    await ctx.perp.methods
      .stopTakeOrder({
        pairId,
        direction: p.direction,
        amount: bn(amount),
        rewardGas: bn(reward),
        orderSeq: bn(nextOrderSeq),
        goodTill: bn(goodTill),
        deadline: bn(0),
        // Anchor enum: { open: {...} }（变体名首字母小写，字段 camelCase）。
        variant: {
          open: {
            triggerPrice: bn(p.triggerPrice),
            openLimitPrice: p.openLimitPrice ? bn(p.openLimitPrice) : Z,
            gainTriggerPrice: p.gainTriggerPrice ? bn(p.gainTriggerPrice) : Z,
            lossTriggerPrice: p.lossTriggerPrice ? bn(p.lossTriggerPrice) : Z,
          },
        },
      } as any)
      .accountsStrict(
        A({
          owner: ctx.wallet,
          settleMint: ctx.mint,
          globalConfig: ctx.pda.globalConfig(),
          settleConfig: ctx.pda.settleConfig(ctx.mint),
          pairConfig: ctx.pda.pairConfig(pairId),
          userAccount: ua,
          seqCounter: ctx.pda.seqCounter(ctx.mint),
          position: null, // 开仓时仓位尚不存在（IDL optional）；触发成交时由 keeper 创建
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
// 撤单：对齐 EVM「仅凭 orderSeq 取消」。pairId/direction/orderKind 内部按 orderSeq
// 读 LimitedOrder 反查（平仓委托 orderKind===2 需要 Position 账户）。调用方若已持有这些
// 字段（如 getMyOpenOrders 的返回行）可经 `hints` 传入省去一次 RPC。
export async function cancelOrder(
  ctx: SignCtx,
  orderSeq: BigNumber,
  hints?: { pairId: number; direction: number; orderKind: number }
): Promise<string> {
  let pairId: number, direction: number, orderKind: number;
  if (hints) {
    ({ pairId, direction, orderKind } = hints);
  } else {
    const ai = await ctx.connection.getAccountInfo(ctx.pda.limitedOrder(orderSeq, ctx.mint));
    if (!ai) throw new Error("委托不存在或已成交/撤销");
    const d = ai.data; // LimitedOrder: pair_id u16 @82, direction @84, order_kind @86
    pairId = d.readUInt16LE(82);
    direction = d[84];
    orderKind = d[86];
  }
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
