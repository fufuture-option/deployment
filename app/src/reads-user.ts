// =====================================================================
// reads-user.ts — 用户面板「拉取合约数据」方法（只读）
//
// 签名约定：fn(ctx: PullCtx, pairId?, ...)，pairId 作为 ctx 之后第 1 个位置参数（仅
// 按交易对作用域的方法才有）。PullCtx 不含 Program — 解码统一走 ctx.ts 的 perpCoder/
// lpCoder + EventParser；getProgramAccounts 用 PERP_CORE 常量。
// =====================================================================
import { EventParser, web3 } from "@anchor-lang/core";
import {
  PullCtx,
  perpCoder,
  lpCoder,
  fetchAcct,
  readU128LE,
  fromUnits,
  camelizeKeys,
} from "./ctx";
import * as pda from "./pdas";
import { PERP_CORE, HERMES_URL } from "./config";

const { PublicKey } = web3;

// EventParser yields IDL-raw events: name in PascalCase ("OrderHistory") and fields in
// snake_case (pair_id). Normalize each to { name: camelCase, data: camelCase } so the
// downstream history logic reads ev.name === "orderHistory" / d.pairId as usual.
const normEvents = (logs: string[]): { name: string; data: any }[] =>
  [...new EventParser(PERP_CORE, perpCoder).parseLogs(logs)].map((e) => ({
    name: e.name.charAt(0).toLowerCase() + e.name.slice(1),
    data: camelizeKeys(e.data),
  }));

// =====================================================================
// 基础读取（账户字节偏移解码 —— 只需 connection + mint）
// =====================================================================
export async function getNextOrderSeq(ctx: PullCtx): Promise<bigint> {
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
export async function getUserBalances(ctx: PullCtx): Promise<UserBalances | null> {
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
export async function getLpInfo(ctx: PullCtx): Promise<LpInfo | null> {
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

export async function getUsdcBalance(ctx: PullCtx): Promise<bigint> {
  const ai = await ctx.connection.getAccountInfo(pda.ata(ctx.wallet, ctx.mint));
  if (!ai) return 0n;
  // SPL TokenAccount: mint(32) owner(32) amount(u64 @64)
  return ai.data.readBigUInt64LE(64);
}

// Current user trading leverage for `pairId`, as a multiple (null = not set, pair default
// applies). UserLeverage layout: disc8 ver1 bump1 owner32 settle_mint32 pair_id2 -> leverage(u64) @76.
export async function getUserLeverage(ctx: PullCtx, pairId: number): Promise<number | null> {
  const ai = await ctx.connection.getAccountInfo(pda.userLeverage(ctx.wallet, pairId, ctx.mint));
  if (!ai) return null;
  return Number(ai.data.readBigUInt64LE(76) / 10n ** 7n) / 100; // leverage u64 @76 (9dp), 1e9 -> x
}

// =====================================================================
// 委托 / 持仓 / 成交（getProgramAccounts + 字节偏移）
// =====================================================================
export interface PendingOrder {
  orderSeq: bigint;
  direction: number;
  state: number;
  amount: bigint;
  targetPrice: bigint;
}
// Pending LIMIT_OPEN orders owned by the connected wallet (memcmp on taker @18).
export async function getMyPendingOrders(ctx: PullCtx): Promise<PendingOrder[]> {
  const accts = await ctx.connection.getProgramAccounts(PERP_CORE, {
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
  direction: number; // 0=LONG 1=SHORT (合约存储值)
  size: bigint; // remaining contract size (1e9)
  entryPrice: bigint; // 1e9
}
// Active DealRecords (open positions) owned by the connected wallet on `pairId`.
export async function getMyDeals(ctx: PullCtx, pairId: number): Promise<MyDeal[]> {
  const accts = await ctx.connection.getProgramAccounts(PERP_CORE, {
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
// 专业交易面板 — 持仓 / 当前委托 / 历史成交
// =====================================================================
export const MMR = 0.1; // maintenance margin rate (matches contract default 1e8 @ 1e9)

export interface MyPosition {
  direction: number; // 0 LONG 1 SHORT
  sizeBtc: number; // total size (human)
  avgEntry: number; // weighted avg entry (human USD)
  marginUsdc: number; // total occupied margin (human USDC)
  deals: { seq: bigint; amount1e9: bigint }[]; // underlying deals (single-deal close)
}
// Aggregate the user's active DealRecords (on `pairId`) into positions per direction.
export async function getMyPositions(ctx: PullCtx, pairId: number): Promise<MyPosition[]> {
  const accts = await ctx.connection.getProgramAccounts(PERP_CORE, {
    filters: [{ dataSize: 229 }, { memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const agg: Record<
    number,
    { size: bigint; value: bigint; margin: bigint; deals: { seq: bigint; amount1e9: bigint }[] }
  > = {};
  for (const { account } of accts) {
    const d = account.data;
    if (d.length !== 229 || d.readUInt16LE(82) !== pairId) continue;
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
  return Object.keys(agg)
    .map((k) => {
      const dir = Number(k),
        a = agg[dir];
      const avgEntry1e9 = a.size > 0n ? a.value / a.size : 0n; // bigint → 1e9 price (avoids huge Number)
      return {
        direction: dir,
        sizeBtc: Number(a.size) / 1e9,
        avgEntry: Number(avgEntry1e9) / 1e9,
        marginUsdc: Number(a.margin) / 1e6,
        deals: a.deals,
      };
    })
    .sort((x, y) => x.direction - y.direction);
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
// Pending/partial LimitedOrders (all kinds) for the connected wallet on `pairId`.
export async function getMyOpenOrders(ctx: PullCtx, pairId: number): Promise<OpenOrder[]> {
  const accts = await ctx.connection.getProgramAccounts(PERP_CORE, {
    filters: [{ dataSize: 260 }, { memcmp: { offset: 18, bytes: ctx.wallet.toBase58() } }],
  });
  const out: OpenOrder[] = [];
  for (const { account } of accts) {
    const d = account.data;
    if (d.length !== 260) continue;
    if (d.readUInt16LE(82) !== pairId) continue; // this pair only
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
  ctx: PullCtx,
  pairId: number,
  before?: string,
  pageSize = 25
): Promise<{ rows: TradeRow[]; nextBefore: string | null }> {
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
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
    const evs = normEvents(logs);
    // OrderHistory carries taker+direction+cost_price+order_type; TradeHistory carries the fill numbers.
    let dir = 0,
      costPrice = 0,
      orderType = 0,
      isMine = false;
    for (const ev of evs) {
      const d = ev.data as any;
      if (ev.name === "orderHistory" && d.taker?.toBase58?.() === me && d.pairId === pairId) {
        dir = d.direction;
        costPrice = Number(d.costPrice) / 1e9;
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
// 历史（无后端 DB）：从用户自身交易里解码事件。
// getSignaturesForAddress(user_account PDA) 返回每一笔触达用户 perp 账户的 tx —— 下单
// (本人 tx) 与成交 (keeper 的 tx，用户是 taker)。limited_order PDA 成交后关闭，但事件永存。
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
  const ua = pda.userAccount(ctx.wallet, ctx.mint);
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
    const evs = normEvents(logs);
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
      const side = d.direction === 1 ? "LONG" : "SHORT";
      if (ev.name === "createLimitedOrder") {
        items.push({
          kind: d.offset === 2 ? "平仓挂单" : "下单", // OFFSET_CLOSE=2 (EVM 对齐)
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

// =====================================================================
// 公有池（共享做市金库）只读信息
// =====================================================================
export interface PublicPoolInfo {
  myShares: bigint; // caller's shares (base-unit scale; 1:1 at first deposit)
  totalShares: bigint; // pool-wide shares
  escrowAmount: bigint; // pool TVL in settle base units
  escrowAvailable: bigint; // withdrawable part of TVL
  myValue: bigint; // caller's value ≈ myShares * escrowAmount / totalShares
}
// Read the caller's public-pool position + the pool's net value (Borsh-decoded; no Program).
export async function getPublicPoolInfo(ctx: PullCtx): Promise<PublicPoolInfo> {
  const escrowAuth = pda.escrowAuthority(ctx.mint);
  const [share, escrow, cfg] = await Promise.all([
    fetchAcct(ctx.connection, lpCoder, "PublicShare", pda.publicShare(ctx.wallet, ctx.mint)),
    fetchAcct(ctx.connection, lpCoder, "LpAccount", pda.lpAccount(escrowAuth, ctx.mint)),
    fetchAcct(ctx.connection, lpCoder, "PoolConfig", pda.poolConfig(ctx.mint)),
  ]);
  const toBig = (v: any) => (v == null ? 0n : BigInt(v.toString()));
  const myShares = toBig((share as any)?.shares);
  const totalShares = toBig((cfg as any)?.totalShares);
  const escrowAmount = toBig((escrow as any)?.amount);
  const escrowAvailable = toBig((escrow as any)?.availableAmount);
  const myValue = totalShares > 0n ? (myShares * escrowAmount) / totalShares : 0n;
  return { myShares, totalShares, escrowAmount, escrowAvailable, myValue };
}

// =====================================================================
// 返佣 / 邀请（treasury program）只读
// =====================================================================
// My inviter (who referred me), or null if not bound yet.
export async function getInviteRelation(ctx: PullCtx): Promise<string | null> {
  const ai = await ctx.connection.getAccountInfo(pda.inviteRelation(ctx.wallet));
  if (!ai) return null;
  // InviteRelation: disc8 ver1 bump1 invitee32 inviter32 …  → inviter @42
  return new PublicKey(ai.data.subarray(42, 74)).toBase58();
}

export interface CommissionInfo {
  unclaimed: bigint;
  claimed: bigint;
}
// My accumulated referral commission for the active settle mint (null = none yet).
export async function getCommission(ctx: PullCtx): Promise<CommissionInfo | null> {
  const ai = await ctx.connection.getAccountInfo(pda.commissionAccount(ctx.wallet, ctx.mint));
  if (!ai) return null;
  const d = ai.data;
  // CommissionAccount: disc8 ver1 bump1 inviter32 settle_mint32 total_unclaimed(u64) total_claimed(u64) …
  const base = 8 + 1 + 1 + 32 + 32; // = 74
  return { unclaimed: d.readBigUInt64LE(base), claimed: d.readBigUInt64LE(base + 8) };
}

// =====================================================================
// 预言机价格（纯 HTTP，无需 ctx）
// =====================================================================
// Pyth latest price, normalized to 1e9 (same convention as the on-chain oracle). Used as
// the make_limit_order target price.
export async function fetchOraclePriceE9(feedHex: string): Promise<bigint> {
  const id = feedHex.replace(/^0x/, "");
  const r = await fetch(`${HERMES_URL}/v2/updates/price/latest?ids[]=${id}`);
  const j = await r.json();
  const p = j.parsed[0].price; // { price, expo, publish_time }
  const raw = BigInt(p.price);
  const shift = 9 + Number(p.expo);
  return shift >= 0 ? raw * 10n ** BigInt(shift) : raw / 10n ** BigInt(-shift);
}

// Hermes live price as a human number (for context display).
export async function fetchHermesPrice(feedHex: string): Promise<number> {
  const id = feedHex.replace(/^0x/, "");
  const r = await fetch(`${HERMES_URL}/v2/updates/price/latest?ids[]=${id}`);
  const j = await r.json();
  const p = j.parsed[0].price;
  return Number(p.price) * Math.pow(10, p.expo);
}
