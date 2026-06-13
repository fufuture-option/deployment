// =====================================================================
// reads-admin.ts — 管理员面板「拉取合约数据」方法（只读）
//
// 与 reads-user 一样不含 Program：账户解码走 perpCoder/lpCoder（fetchAcct），
// 列表(原 Anchor `.all()`)走 allAccts（按账户判别式 memcmp + 解码）。
// =====================================================================
import { web3 } from "@anchor-lang/core";
import { PullCtx, perpCoder, lpCoder, fetchAcct, allAccts, big } from "./ctx";
import * as pda from "./pdas";
import { PERP_CORE, LIQUIDITY_POOL } from "./config";

type PublicKey = web3.PublicKey;

export interface GlobalCfg {
  admin: string;
  maintenanceMarginRate: bigint; // 1e9
  minDepositAmount: bigint; // 1e9
  orderSwitch: number; // bitmask bit0=market bit1=limit
}
export async function getGlobalConfig(ctx: PullCtx): Promise<GlobalCfg | null> {
  const a: any = await fetchAcct(ctx.connection, perpCoder, "GlobalConfig", pda.globalConfig());
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
  tradingFeeRate: bigint; // 1e9 (1% = 1e7)
  minOrderAmount: bigint; // 1e9 (BTC)
  defaultLeverage: bigint; // 1e9
  status: number; // 0 normal 1 paused 2 offline
  rewardGas: bigint; // lamports
  maxStalenessSecs: bigint;
  oracleSource: number; // 0 Pyth 1 Switchboard 2 Supra(reserved) 3 Chainlink
  chainlinkFeedIdHex: string; // 0x.. (32 bytes); all-zero = unset
}
export async function getPairConfig(ctx: PullCtx, pairId: number): Promise<PairCfg | null> {
  const a: any = await fetchAcct(ctx.connection, perpCoder, "PairConfig", pda.pairConfig(pairId));
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
  privateMinProvide: bigint; // base units
  totalLockedLiquidity: bigint;
}
export async function getPoolConfig(ctx: PullCtx): Promise<PoolCfg | null> {
  const a: any = await fetchAcct(ctx.connection, lpCoder, "PoolConfig", pda.poolConfig(ctx.mint));
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
export async function listLpAccounts(ctx: PullCtx): Promise<LpRow[]> {
  const all = await allAccts<any>(ctx.connection, lpCoder, LIQUIDITY_POOL, "LpAccount");
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
export async function listPairs(ctx: PullCtx): Promise<PairRow[]> {
  const all = await allAccts<any>(ctx.connection, perpCoder, PERP_CORE, "PairConfig");
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
  defaultLeverage: bigint;
  status: number;
}
// All initialized settle currencies (decode every SettleConfig + read SPL decimals).
export async function listSettleMints(ctx: PullCtx): Promise<SettleMintRow[]> {
  const all = await allAccts<any>(ctx.connection, perpCoder, PERP_CORE, "SettleConfig");
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
