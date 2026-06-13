// =====================================================================
// reads-admin.ts — 管理员面板「拉取合约数据」方法（只读）
//
// req1：数值 BigNumber。req3：程序 ID 走 ctx.programs，PDA 走 ctx.pda（不再 import 地址常量）。
// 账户解码 fetchAcct；列表(原 .all())走 allAccts（判别式 memcmp + 解码）。
// =====================================================================
import { web3 } from "@anchor-lang/core";
import { BigNumber } from "ethers";
import { PullCtx, perpCoder, lpCoder, fetchAcct, allAccts, big } from "./ctx";

type PublicKey = web3.PublicKey;

export interface GlobalCfg {
  admin: string;
  maintenanceMarginRate: BigNumber; // 1e9
  minDepositAmount: BigNumber; // 1e9
  orderSwitch: number; // bitmask bit0=market bit1=limit
}
export async function getGlobalConfig(ctx: PullCtx): Promise<GlobalCfg | null> {
  const a: any = await fetchAcct(ctx.connection, perpCoder, "GlobalConfig", ctx.pda.globalConfig());
  if (!a) return null;
  return {
    admin: a.admin.toBase58(),
    maintenanceMarginRate: big(a.maintenanceMarginRate),
    minDepositAmount: big(a.minDepositAmount),
    orderSwitch: a.orderSwitch,
  };
}

// True if the connected wallet matches GlobalConfig.admin.
export async function isAdmin(ctx: PullCtx): Promise<boolean> {
  const g = await getGlobalConfig(ctx);
  return !!g && g.admin === ctx.wallet.toBase58();
}

export interface PairCfg {
  pairId: number;
  name: string;
  tradingFeeRate: BigNumber; // 1e9 (1% = 1e7)
  minOrderAmount: BigNumber; // 1e9 (BTC)
  defaultLeverage: BigNumber; // 1e9
  status: number; // 0 normal 1 paused 2 offline
  rewardGas: BigNumber; // lamports
  maxStalenessSecs: BigNumber;
  oracleSource: number; // 0 Pyth 1 Switchboard 2 Supra(reserved) 3 Chainlink
  chainlinkFeedIdHex: string; // 0x.. (32 bytes); all-zero = unset
}
export async function getPairConfig(ctx: PullCtx, pairId: number): Promise<PairCfg | null> {
  const a: any = await fetchAcct(ctx.connection, perpCoder, "PairConfig", ctx.pda.pairConfig(pairId));
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
    chainlinkFeedIdHex:
      "0x" + (a.chainlinkFeedId as number[]).map((b) => b.toString(16).padStart(2, "0")).join(""),
  };
}

export interface PoolCfg {
  admin: string;
  poolType: number; // 1 PUBLIC 2 PRIVATE 3 MIXED 4 REFUSE
  status: number; // 0 active 1 paused 2 offline
  privateMinProvide: BigNumber; // base units
  totalLockedLiquidity: BigNumber;
}
export async function getPoolConfig(ctx: PullCtx): Promise<PoolCfg | null> {
  const a: any = await fetchAcct(ctx.connection, lpCoder, "PoolConfig", ctx.pda.poolConfig(ctx.mint));
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
  amount: BigNumber;
  available: BigNumber;
  locked: BigNumber;
  leverageX: number;
  rejectOrder: boolean;
}
// All LpAccounts on the LP program (the "pool list" = every maker in the pool).
export async function listLpAccounts(ctx: PullCtx): Promise<LpRow[]> {
  const all = await allAccts<any>(ctx.connection, lpCoder, ctx.programs.lp, "LpAccount");
  return all
    .map(({ account: a }) => ({
      holder: a.holder.toBase58(),
      amount: big(a.amount),
      available: big(a.availableAmount),
      locked: big(a.lockedAmount),
      leverageX: Number(big(a.leverage).toString()) / 1e9, // 1e9 -> x
      rejectOrder: a.rejectOrder,
    }))
    .sort((x, y) => (y.amount.gt(x.amount) ? 1 : -1));
}

export interface PairRow {
  pairId: number;
  name: string;
  defaultLeverage: BigNumber;
  tradingFeeRate: BigNumber;
  minOrderAmount: BigNumber;
  status: number;
  feedHex: string;
  oracleSource: number; // 0 Pyth 1 Switchboard 2 Supra(reserved) 3 Chainlink
  chainlinkFeedHex: string;
}
// All registered trading pairs (decode every PairConfig on the program).
export async function listPairs(ctx: PullCtx): Promise<PairRow[]> {
  const all = await allAccts<any>(ctx.connection, perpCoder, ctx.programs.perp, "PairConfig");
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

export interface SettleMintRow {
  mint: string;
  decimals: number;
  defaultLeverage: BigNumber;
  status: number;
}
// All initialized settle currencies (decode every SettleConfig + read SPL decimals).
export async function listSettleMints(ctx: PullCtx): Promise<SettleMintRow[]> {
  const all = await allAccts<any>(ctx.connection, perpCoder, ctx.programs.perp, "SettleConfig");
  const mints: PublicKey[] = all.map(({ account: a }) => a.settleMint);
  const infos = mints.length ? await ctx.connection.getMultipleAccountsInfo(mints) : [];
  const rows = all.map(({ account: a }, i) => ({
    mint: mints[i].toBase58(),
    decimals: infos[i] ? infos[i]!.data[44] : 0, // SPL Mint: decimals @ offset 44
    defaultLeverage: big(a.defaultLeverage),
    status: a.status,
  }));
  return rows.sort((x, y) => x.mint.localeCompare(y.mint));
}
