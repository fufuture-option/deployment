// =====================================================================
// reads-user.ts — 用户面板「拉取合约数据」方法（只读）
//
// req1：数值统一 ethers v5 BigNumber。req3：程序 ID 走 ctx.programs / PDA 走 ctx.pda。
// 解码统一走 ctx.ts 的 perpCoder/lpCoder + EventParser；getProgramAccounts 用 ctx.programs.perp。
// =====================================================================
import { EventParser, web3 } from "@anchor-lang/core";
import { BigNumber } from "ethers";
import {
  PullCtx,
  perpCoder,
  lpCoder,
  fetchAcct,
  readU128LE,
  u64,
  fromUnits,
  big,
  camelizeKeys,
} from "./ctx";
import { HERMES_URL } from "./config";

const { PublicKey } = web3;
const ZERO = BigNumber.from(0);
const cmp = (a: BigNumber, b: BigNumber) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0);

// EventParser yields IDL-raw events: name PascalCase ("OrderHistory"), fields snake_case.
// Normalize to { name: camelCase, data: camelCase } so downstream logic stays unchanged.
const normEvents = (perpId: web3.PublicKey, logs: string[]): { name: string; data: any }[] =>
  [...new EventParser(perpId, perpCoder).parseLogs(logs)].map((e) => ({
    name: e.name.charAt(0).toLowerCase() + e.name.slice(1),
    data: camelizeKeys(e.data),
  }));

// =====================================================================
// 基础读取（账户字节偏移解码 —— 只需 connection + mint）
// =====================================================================
export async function getNextOrderSeq(ctx: PullCtx): Promise<BigNumber> {
  const ai = await ctx.connection.getAccountInfo(ctx.pda.seqCounter(ctx.mint));
  if (!ai) throw new Error("SeqCounter missing");
  return u64(ai.data, 50); // disc8+ver1+bump1+mint32+next_deal_seq8
}

export interface UserBalances {
  deposit: BigNumber;
  available: BigNumber;
  margin: BigNumber;
  orderLocked: BigNumber;
}
export async function getUserBalances(ctx: PullCtx): Promise<UserBalances | null> {
  const ai = await ctx.connection.getAccountInfo(ctx.pda.userAccount(ctx.wallet, ctx.mint));
  if (!ai) return null;
  const d = ai.data;
  // 9dp UserAccount: deposit/available/margin/order_locked u64 @74/82/90/98.
  return {
    deposit: u64(d, 74),
    available: u64(d, 82),
    margin: u64(d, 90),
    orderLocked: u64(d, 98),
  };
}

export interface LpInfo {
  amount: BigNumber; // 本金 (base units)
  available: BigNumber; // 可用
  locked: BigNumber; // 已锁定(接单占用)
  leverageX: number; // 杠杆倍数
  rejectOrder: boolean; // 是否暂停接单
}
export async function getLpInfo(ctx: PullCtx): Promise<LpInfo | null> {
  const ai = await ctx.connection.getAccountInfo(ctx.pda.lpAccount(ctx.wallet, ctx.mint));
  if (!ai) return null;
  const d = ai.data;
  // 9dp LpAccount: amount/available/locked u64 @74/82/90; leverage u64 @106; reject_order @131.
  return {
    amount: u64(d, 74),
    available: u64(d, 82),
    locked: u64(d, 90),
    leverageX: Number(d.readBigUInt64LE(106) / 10n ** 7n) / 100, // 1e9 -> x
    rejectOrder: d[131] === 1,
  };
}

export async function getUsdcBalance(ctx: PullCtx): Promise<BigNumber> {
  const ai = await ctx.connection.getAccountInfo(ctx.pda.ata(ctx.wallet, ctx.mint));
  if (!ai) return ZERO;
  // SPL TokenAccount: mint(32) owner(32) amount(u64 @64)
  return u64(ai.data, 64);
}

// Current user trading leverage for `pairId`, as a multiple (null = not set, pair default
// applies). UserLeverage layout: ... leverage(u64) @76.
export async function getUserLeverage(ctx: PullCtx, pairId: number): Promise<number | null> {
  const ai = await ctx.connection.getAccountInfo(ctx.pda.userLeverage(ctx.wallet, pairId, ctx.mint));
  if (!ai) return null;
  return Number(ai.data.readBigUInt64LE(76) / 10n ** 7n) / 100; // 1e9 -> x
}

// =====================================================================
// 委托 / 持仓 / 成交（getProgramAccounts + 字节偏移）
// =====================================================================
export interface PendingOrder {
  orderSeq: BigNumber;
  direction: number;
  state: number;
  amount: BigNumber;
  targetPrice: BigNumber;
}
// Pending LIMIT_OPEN orders owned by the connected wallet (memcmp on taker @18).
export async function getMyPendingOrders(ctx: PullCtx): Promise<PendingOrder[]> {
  const accts = await ctx.connection.getProgramAccounts(ctx.programs.perp, {
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
      orderSeq: u64(d, 10),
      direction: d[84],
      state,
      amount: readU128LE(d, 88), // amount u128 @88
      targetPrice: u64(d, 104), // target_price u64 @104 (9dp)
    });
  }
  return out;
}

export interface MyDeal {
  dealSeq: BigNumber;
  direction: number; // 0=LONG 1=SHORT (合约存储值)
  size: BigNumber; // remaining contract size (1e9)
  entryPrice: BigNumber; // 1e9
}
// Active DealRecords (open positions) owned by the connected wallet on `pairId`.
export async function getMyDeals(ctx: PullCtx, pairId: number): Promise<MyDeal[]> {
  const accts = await ctx.connection.getProgramAccounts(ctx.programs.perp, {
    filters: [{ dataSize: 229 }, { memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const out: MyDeal[] = [];
  for (const { account } of accts) {
    const d = account.data;
    if (d.length !== 229) continue;
    if (d.readUInt16LE(82) !== pairId) continue; // this page's pair only
    const state = d[142];
    if (state !== 0 && state !== 1) continue; // Active / Partial
    const remaining = readU128LE(d, 126);
    if (remaining.isZero()) continue;
    out.push({ dealSeq: u64(d, 10), direction: d[84], size: remaining, entryPrice: u64(d, 102) });
  }
  out.sort((a, b) => cmp(a.dealSeq, b.dealSeq));
  return out;
}

// =====================================================================
// 专业交易面板 — 持仓 / 当前委托 / 历史成交
// =====================================================================
export const MMR = 0.1; // maintenance margin rate (matches contract default 1e8 @ 1e9)

export interface MyPosition {
  direction: number; // 0 LONG 1 SHORT
  sizeBtc: number; // total size (human)
  avgEntry: number; // weighted avg entry (human USD)
  marginUsdc: number; // total occupied margin (human USDC)
  deals: { seq: BigNumber; amount1e9: BigNumber }[]; // underlying deals (single-deal close)
}
// Aggregate the user's active DealRecords (on `pairId`) into positions per direction.
export async function getMyPositions(ctx: PullCtx, pairId: number): Promise<MyPosition[]> {
  const accts = await ctx.connection.getProgramAccounts(ctx.programs.perp, {
    filters: [{ dataSize: 229 }, { memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const agg: Record<
    number,
    { size: BigNumber; value: BigNumber; margin: BigNumber; deals: { seq: BigNumber; amount1e9: BigNumber }[] }
  > = {};
  for (const { account } of accts) {
    const d = account.data;
    if (d.length !== 229 || d.readUInt16LE(82) !== pairId) continue;
    const state = d[142];
    if (state !== 0 && state !== 1) continue;
    const remaining = readU128LE(d, 126);
    if (remaining.isZero()) continue;
    const dir = d[84];
    const a = (agg[dir] ||= { size: ZERO, value: ZERO, margin: ZERO, deals: [] });
    a.size = a.size.add(remaining);
    a.value = a.value.add(remaining.mul(u64(d, 102))); // remaining(1e9) × entry(1e9)
    a.margin = a.margin.add(u64(d, 110));
    a.deals.push({ seq: u64(d, 10), amount1e9: remaining });
  }
  return Object.keys(agg)
    .map((k) => {
      const dir = Number(k),
        a = agg[dir];
      const avgEntry1e9 = a.size.gt(0) ? a.value.div(a.size) : ZERO; // 1e9 price
      return {
        direction: dir,
        sizeBtc: Number(a.size.toString()) / 1e9,
        avgEntry: Number(avgEntry1e9.toString()) / 1e9,
        marginUsdc: Number(a.margin.toString()) / 1e6,
        deals: a.deals,
      };
    })
    .sort((x, y) => x.direction - y.direction);
}

export interface OpenOrder {
  orderSeq: BigNumber;
  startTime: number;
  direction: number;
  offset: number; // 0 open 1 close
  orderKind: number; // 1 limit-open 2 limit-close 3 stop-take-open 4 stop-take-close
  amount1e9: BigNumber;
  targetPrice1e9: BigNumber;
}
// Pending/partial LimitedOrders (all kinds) for the connected wallet on `pairId`.
export async function getMyOpenOrders(ctx: PullCtx, pairId: number): Promise<OpenOrder[]> {
  const accts = await ctx.connection.getProgramAccounts(ctx.programs.perp, {
    filters: [{ dataSize: 260 }, { memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const out: OpenOrder[] = [];
  for (const { account } of accts) {
    const d = account.data;
    if (d.length !== 260) continue;
    if (d.readUInt16LE(82) !== pairId) continue; // this pair only
    if (d[87] !== 1 && d[87] !== 2) continue; // PENDING / PARTIAL
    out.push({
      orderSeq: u64(d, 10),
      startTime: Number(d.readBigInt64LE(136)), // start_time @136
      direction: d[84],
      offset: d[85],
      orderKind: d[86],
      amount1e9: readU128LE(d, 88),
      targetPrice1e9: u64(d, 104),
    });
  }
  return out.sort((a, b) => cmp(b.orderSeq, a.orderSeq));
}

export interface TradeRow {
  time: number;
  direction: number;
  price: number; // 成交均价 (human)
  amountBtc: number;
  feeUsdc: number;
  realizedPnl: number; // profit − loss (human USDC)
  costPrice: number; // entry (human), for ROI
  orderType: number; // OrderHistory.order_type — the action
  sig: string;
}
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
export async function getTradeHistoryPaged(
  ctx: PullCtx,
  pairId: number,
  before?: string,
  pageSize = 25
): Promise<{ rows: TradeRow[]; nextBefore: string | null }> {
  const ua = ctx.pda.userAccount(ctx.wallet, ctx.mint);
  const sigs = await ctx.connection.getSignaturesForAddress(
    ua,
    before ? { limit: pageSize, before } : { limit: pageSize }
  );
  const me = ctx.wallet.toBase58();
  const rows: TradeRow[] = [];
  for (const s of sigs) {
    const tx = await ctx.connection.getTransaction(s.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    const logs = tx?.meta?.logMessages;
    if (!logs) continue;
    const time = tx!.blockTime ?? 0;
    const evs = normEvents(ctx.programs.perp, logs);
    // OrderHistory carries taker+direction+cost_price+order_type; TradeHistory carries fills.
    let dir = 0,
      costPrice = 0,
      orderType = 0,
      isMine = false;
    for (const ev of evs) {
      const d = ev.data as any;
      if (ev.name === "orderHistory" && d.taker?.toBase58?.() === me && d.pairId === pairId) {
        dir = d.direction;
        costPrice = Number(d.costPrice.toString()) / 1e9;
        orderType = d.orderType;
        isMine = true;
      }
    }
    if (!isMine) continue;
    for (const ev of evs) {
      const d = ev.data as any;
      if (ev.name !== "tradeHistory") continue;
      rows.push({
        time,
        direction: dir,
        price: Number(d.price.toString()) / 1e9,
        amountBtc: Number(d.amount.toString()) / 1e9,
        feeUsdc: Number(d.tradingFee.toString()) / 1e6,
        realizedPnl: (Number(d.profit.toString()) - Number(d.loss.toString())) / 1e6,
        costPrice,
        orderType,
        sig: s.signature,
      });
    }
  }
  return { rows, nextBefore: sigs.length === pageSize ? sigs[sigs.length - 1].signature : null };
}

// =====================================================================
// 历史（无后端 DB）：从用户自身交易里解码事件。
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

export async function getMyHistory(ctx: PullCtx, limit = 25): Promise<HistoryItem[]> {
  const ua = ctx.pda.userAccount(ctx.wallet, ctx.mint);
  const sigs = await ctx.connection.getSignaturesForAddress(ua, { limit });
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
    const evs = normEvents(ctx.programs.perp, logs);
    // Real fill/settlement price lives in OrderHistory.price; limitedOrderHistory only
    // carries the order's target_price.
    let tradePrice: BigNumber | null = null;
    for (const ev of evs) {
      const d = ev.data as any;
      if (ev.name === "orderHistory" && d.taker?.toBase58?.() === me && d.price !== undefined) {
        tradePrice = big(d.price);
      }
    }
    for (const ev of evs) {
      const d = ev.data as any;
      if (d.taker?.toBase58?.() !== me) continue;
      const side = d.direction === 1 ? "LONG" : "SHORT";
      if (ev.name === "createLimitedOrder") {
        items.push({
          kind: d.offset === 2 ? "平仓挂单" : "下单", // OFFSET_CLOSE=2 (EVM 对齐)
          orderSeq: d.orderSeq.toString(),
          side,
          amount: fromUnits(big(d.amount), 9),
          price: fromUnits(big(d.targetPrice), 9),
          time,
          sig: s.signature,
        });
      } else if (ev.name === "limitedOrderHistory") {
        const filled = d.state === 3 && tradePrice !== null;
        items.push({
          kind: ORDER_STATE_LABEL[d.state] ?? `状态${d.state}`,
          orderSeq: d.orderSeq.toString(),
          side,
          amount: fromUnits(big(d.amount), 9),
          price: fromUnits(filled ? (tradePrice as BigNumber) : big(d.targetPrice), 9),
          time,
          sig: s.signature,
        });
      }
    }
  }
  return items.sort((a, b) => b.time - a.time);
}

// =====================================================================
// 公有池（共享做市金库）只读信息
// =====================================================================
export interface PublicPoolInfo {
  myShares: BigNumber;
  totalShares: BigNumber;
  escrowAmount: BigNumber; // pool TVL
  escrowAvailable: BigNumber;
  myValue: BigNumber; // ≈ myShares * escrowAmount / totalShares
}
export async function getPublicPoolInfo(ctx: PullCtx): Promise<PublicPoolInfo> {
  const escrowAuth = ctx.pda.escrowAuthority(ctx.mint);
  const [share, escrow, cfg] = await Promise.all([
    fetchAcct(ctx.connection, lpCoder, "PublicShare", ctx.pda.publicShare(ctx.wallet, ctx.mint)),
    fetchAcct(ctx.connection, lpCoder, "LpAccount", ctx.pda.lpAccount(escrowAuth, ctx.mint)),
    fetchAcct(ctx.connection, lpCoder, "PoolConfig", ctx.pda.poolConfig(ctx.mint)),
  ]);
  const toBig = (v: any) => (v == null ? ZERO : big(v));
  const myShares = toBig((share as any)?.shares);
  const totalShares = toBig((cfg as any)?.totalShares);
  const escrowAmount = toBig((escrow as any)?.amount);
  const escrowAvailable = toBig((escrow as any)?.availableAmount);
  const myValue = totalShares.gt(0) ? myShares.mul(escrowAmount).div(totalShares) : ZERO;
  return { myShares, totalShares, escrowAmount, escrowAvailable, myValue };
}

// =====================================================================
// 返佣 / 邀请（treasury program）只读
// =====================================================================
export async function getInviteRelation(ctx: PullCtx): Promise<string | null> {
  const ai = await ctx.connection.getAccountInfo(ctx.pda.inviteRelation(ctx.wallet));
  if (!ai) return null;
  // InviteRelation: disc8 ver1 bump1 invitee32 inviter32 …  → inviter @42
  return new PublicKey(ai.data.subarray(42, 74)).toBase58();
}

export interface CommissionInfo {
  unclaimed: BigNumber;
  claimed: BigNumber;
}
export async function getCommission(ctx: PullCtx): Promise<CommissionInfo | null> {
  const ai = await ctx.connection.getAccountInfo(ctx.pda.commissionAccount(ctx.wallet, ctx.mint));
  if (!ai) return null;
  const d = ai.data;
  // CommissionAccount: disc8 ver1 bump1 inviter32 settle_mint32 total_unclaimed(u64) total_claimed(u64)
  const base = 8 + 1 + 1 + 32 + 32; // = 74
  return { unclaimed: u64(d, base), claimed: u64(d, base + 8) };
}

// =====================================================================
// 预言机价格（纯 HTTP）—— 仅 demo 显示用；下单价格由调用方传入（见 ops-user.placeLimitOrder）。
// =====================================================================
export async function fetchHermesPrice(feedHex: string): Promise<number> {
  const id = feedHex.replace(/^0x/, "");
  const r = await fetch(`${HERMES_URL}/v2/updates/price/latest?ids[]=${id}`);
  const j = await r.json();
  const p = j.parsed[0].price;
  return Number(p.price) * Math.pow(10, p.expo);
}
