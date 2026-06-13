// =====================================================================
// ops-admin.ts — 管理员「主动操作（签名合约）」方法
//
// PDA 走 ctx.pda（程序 ID 已注入）。金额经 toUnits→BigNumber→bn(BN)。
// 写入需连接钱包 = GlobalConfig.admin / PoolConfig.admin。
// =====================================================================
import { web3 } from "@anchor-lang/core";
import { SignCtx, sendIxs, toUnits, bn, exists, mintDecimals } from "./ctx";
import { TOKEN_PROGRAM } from "./config";

const { PublicKey, SystemProgram } = web3;

const A = (o: Record<string, web3.PublicKey | null>) => o as any;
const blank = (s?: string) => s === undefined || s.trim() === "";

// hex (with/without 0x, 64 chars) -> number[32] for a 32-byte feed id.
function hexTo32(hex: string): number[] {
  const h = (hex || "").trim().replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(h)) throw new Error("feed id 必须是 32 字节（64 位 hex）");
  const out: number[] = [];
  for (let i = 0; i < 64; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
  return out;
}

// =====================================================================
// update_pair: 只改传入的字段（其余 = None）。leverageX/feeRatePct 人类单位。
// =====================================================================
export async function updatePair(
  ctx: SignCtx,
  pairId: number,
  opts: {
    leverageX?: string;
    feeRatePct?: string;
    status?: number;
    rewardGas?: string;
    minOrderBtc?: string;
    oracleSource?: number; // 0 Pyth 1 Switchboard 3 Chainlink
    chainlinkFeedIdHex?: string;
    switchboardFeedAccountB58?: string;
    switchboardFeedHashHex?: string;
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
    switchboardFeedHash: blank(opts.switchboardFeedHashHex)
      ? null
      : hexTo32(opts.switchboardFeedHashHex!),
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
        globalConfig: ctx.pda.globalConfig(),
        admin: ctx.wallet,
        pairConfig: ctx.pda.pairConfig(pairId),
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// register_pair: 新建 PairConfig（pair_id 全局唯一）。
// =====================================================================
export async function registerPair(
  ctx: SignCtx,
  p: {
    pairId: number;
    name: string;
    feedHex: string;
    leverageX?: string;
    feeRatePct?: string;
    minOrderAmount?: string;
    status?: number;
    maxStalenessSecs?: string;
  }
): Promise<string> {
  if (!p.name.trim()) throw new Error("name 不能为空");
  if (!Number.isInteger(p.pairId) || p.pairId <= 0) throw new Error("pair_id 必须是正整数");
  const args = {
    pairId: p.pairId,
    name: p.name.trim(),
    multi: bn(0), // default 1e9
    tradingFeeRate: blank(p.feeRatePct) ? bn(0) : bn(toUnits(p.feeRatePct!, 7)), // 0 = default 0.1%
    minOrderAmount: blank(p.minOrderAmount) ? bn(0) : bn(toUnits(p.minOrderAmount!, 9)),
    defaultLeverage: blank(p.leverageX) ? bn(toUnits("10", 9)) : bn(toUnits(p.leverageX!, 9)),
    lotMulti: bn(0), // default 1e9
    status: p.status ?? 0,
    rewardGas: bn(0),
    pythFeedId: hexTo32(p.feedHex),
    maxStalenessSecs: bn(BigInt((p.maxStalenessSecs || "120").trim())),
    maxConfidenceBps: 0, // default 100 bps
    switchboardFeedAccount: PublicKey.default,
    switchboardFeedHash: new Array(32).fill(0),
    switchboardMaxStalenessSecs: bn(0),
    oracleMode: 0, // PythOnly
    oracleSource: 0, // Pyth by default
    chainlinkFeedId: new Array(32).fill(0),
  };
  const ix = await ctx.perp.methods
    .registerPair(args as any)
    .accountsStrict(
      A({
        globalConfig: ctx.pda.globalConfig(),
        admin: ctx.wallet,
        pairConfig: ctx.pda.pairConfig(p.pairId),
        payer: ctx.wallet,
        systemProgram: SystemProgram.programId,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// 新增结算币（collateral mint）：跨两程序 5 条 admin ix（幂等）。
// =====================================================================
export async function addSettleCurrency(
  ctx: SignCtx,
  mintBase58: string,
  opts?: { defaultLeverageX?: string }
): Promise<string> {
  let mint: web3.PublicKey;
  try {
    mint = new PublicKey((mintBase58 || "").trim());
  } catch {
    throw new Error("无效的 mint 地址");
  }
  if (!(await exists(ctx, mint))) throw new Error("该 mint 在链上不存在 — 请先创建 SPL mint");

  const lev = blank(opts?.defaultLeverageX) ? toUnits("10", 9) : toUnits(opts!.defaultLeverageX!, 9);
  const RENT = web3.SYSVAR_RENT_PUBKEY;
  const escrow = ctx.pda.escrowAuthority(mint);
  let last = "";

  // perp 1) init_settle_config
  if (!(await exists(ctx, ctx.pda.settleConfig(mint)))) {
    const ix = await ctx.perp.methods
      .initSettleConfig({
        maintenanceMarginRate: bn(0),
        minDepositAmount: bn(0),
        defaultLeverage: bn(lev),
        status: 0,
      } as any)
      .accountsStrict(
        A({
          globalConfig: ctx.pda.globalConfig(),
          admin: ctx.wallet,
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

  // perp 2) init_settle_vault (vault_token + seq_counter)
  if (!(await exists(ctx, ctx.pda.vaultToken(mint)))) {
    const ix = await ctx.perp.methods
      .initSettleVault()
      .accountsStrict(
        A({
          globalConfig: ctx.pda.globalConfig(),
          admin: ctx.wallet,
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

  // perp 3) init_risk_fund_vault
  if (!(await exists(ctx, ctx.pda.riskVaultToken(mint)))) {
    const ix = await ctx.perp.methods
      .initRiskFundVault()
      .accountsStrict(
        A({
          globalConfig: ctx.pda.globalConfig(),
          admin: ctx.wallet,
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

  // lp 4) init_pool_config (MIXED, admin = caller)
  if (!(await exists(ctx, ctx.pda.poolConfig(mint)))) {
    const ix = await ctx.lp.methods
      .initPoolConfig({
        admin: ctx.wallet,
        poolType: 3, // MIXED
        escrowAuthority: escrow,
        perpCoreProgram: ctx.perp.programId,
        status: 0,
        privateMinProvideAmount: bn(0),
        publicMinProvideAmount: bn(0),
      } as any)
      .accountsStrict(
        A({
          payer: ctx.wallet,
          settleMint: mint,
          poolConfig: ctx.pda.poolConfig(mint),
          vaultAuthority: ctx.pda.poolVaultAuthority(mint),
          systemProgram: SystemProgram.programId,
        })
      )
      .instruction();
    last = await sendIxs(ctx, [ix]);
  }

  // lp 5) init_pool_vault (+ escrow LpAccount)
  if (!(await exists(ctx, ctx.pda.poolVault(mint)))) {
    const ix = await ctx.lp.methods
      .initPoolVault()
      .accountsStrict(
        A({
          poolConfig: ctx.pda.poolConfig(mint),
          admin: ctx.wallet,
          payer: ctx.wallet,
          settleMint: mint,
          vaultAuthority: ctx.pda.poolVaultAuthority(mint),
          poolVault: ctx.pda.poolVault(mint),
          escrowLpAccount: ctx.pda.lpAccount(escrow, mint),
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

// =====================================================================
// 转移 perp_core GlobalConfig.admin（set_addresses(new_admin=...)）。
// =====================================================================
export async function transferAdmin(ctx: SignCtx, newAdminBase58: string): Promise<string> {
  const s = (newAdminBase58 || "").trim();
  let newAdmin: web3.PublicKey;
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
        globalConfig: ctx.pda.globalConfig(),
        admin: ctx.wallet,
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}

// =====================================================================
// update_pool_config: status / pool_type / private min-provide。
// =====================================================================
export async function updatePoolConfig(
  ctx: SignCtx,
  opts: { status?: number; poolType?: number; privateMinUsdc?: string }
): Promise<string> {
  const privateMin = blank(opts.privateMinUsdc)
    ? null
    : bn(toUnits(opts.privateMinUsdc!, await mintDecimals(ctx.connection, ctx.mint)));
  const args = {
    status: opts.status ?? null,
    poolType: opts.poolType ?? null,
    privateMinProvideAmount: privateMin,
    publicMinProvideAmount: null,
    perpCoreProgram: null,
  };
  const ix = await ctx.lp.methods
    .updatePoolConfig(args as any)
    .accountsStrict(
      A({
        admin: ctx.wallet,
        settleMint: ctx.mint,
        poolConfig: ctx.pda.poolConfig(ctx.mint),
      })
    )
    .instruction();
  return sendIxs(ctx, [ix]);
}
