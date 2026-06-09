import { useCallback, useEffect, useState } from "react";
import * as actions from "./actions";
import { Ctx } from "./solana";
// 合约名来自 ctx.pairName（随交易对切换）

type Tab = "pos" | "orders" | "histOrders" | "histTrades" | "funds";

const ORDER_KIND_LABEL: Record<number, string> = {
  1: "限价开仓",
  2: "限价平仓",
  3: "止盈止损开",
  4: "止盈止损平",
};

const f2 = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—");
const f4 = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—");
const pct = (n: number) => (Number.isFinite(n) ? n.toFixed(2) + "%" : "—");
const ts = (t: number) => (t ? new Date(t * 1000).toLocaleString() : "—");
const sideZh = (d: number) => (d === 0 ? "做多" : "做空");

interface Props {
  ctx: Ctx;
  mark: number | null; // live mark price (human)
  userLev: number | null;
  busy: boolean;
  setBusy: (b: boolean) => void;
  append: (s: string) => void;
  onRefresh: () => Promise<void> | void; // refresh App-level balances
}

export default function TradePanel({ ctx, mark, userLev, busy, setBusy, append, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>("pos");
  const [positions, setPositions] = useState<actions.MyPosition[]>([]);
  const [orders, setOrders] = useState<actions.OpenOrder[]>([]);
  const [trades, setTrades] = useState<actions.TradeRow[]>([]);
  const [tradeBefore, setTradeBefore] = useState<string | null>(null);
  const [tradeBusy, setTradeBusy] = useState(false);
  const lev = userLev || 10;

  const loadPosOrders = useCallback(async () => {
    try {
      const [p, o] = await Promise.all([actions.getMyPositions(ctx), actions.getMyOpenOrders(ctx)]);
      setPositions(p);
      setOrders(o);
    } catch (e: any) {
      append(`⚠ 加载持仓/委托: ${e.message || e}`);
    }
  }, [ctx, append]);

  useEffect(() => {
    loadPosOrders();
  }, [loadPosOrders]);

  const loadTrades = useCallback(
    async (reset: boolean) => {
      setTradeBusy(true);
      try {
        const { rows, nextBefore } = await actions.getTradeHistoryPaged(ctx, reset ? undefined : tradeBefore || undefined, 25);
        setTrades((cur) => (reset ? rows : [...cur, ...rows]));
        setTradeBefore(nextBefore);
      } catch (e: any) {
        append(`⚠ 历史成交: ${e.message || e}`);
      } finally {
        setTradeBusy(false);
      }
    },
    [ctx, tradeBefore, append]
  );

  // action runner: busy + log + reload local + App refresh
  const act = async (label: string, fn: () => Promise<string>) => {
    setBusy(true);
    append(`▶ ${label} …`);
    try {
      const sig = await fn();
      append(`✅ ${label}: ${sig}`);
      append(`   https://solscan.io/tx/${sig}?cluster=devnet`);
      await loadPosOrders();
      await onRefresh();
    } catch (e: any) {
      append(`❌ ${label}: ${e.message || JSON.stringify(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const exportTrades = () => {
    const head = ["时间", "合约", "方向", "成交均价", "数量", "手续费", "已实现盈亏", "回报率", "仓位状态"];
    const lines = trades.map((t) => {
      const roi = t.amountBtc * t.costPrice > 0 ? (t.realizedPnl * lev) / (t.amountBtc * t.costPrice) * 100 : 0;
      return [ts(t.time), ctx.pairName, sideZh(t.direction), t.price, t.amountBtc, t.feeUsdc, t.realizedPnl, roi.toFixed(2) + "%", actions.orderTypeLabel(t.orderType)].join(",");
    });
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `trades_${Date.now()}.csv`;
    a.click();
  };

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <button
      className={tab === id ? "" : "ghost"}
      style={{ borderBottom: tab === id ? "2px solid #3b82f6" : "2px solid transparent", borderRadius: 0 }}
      onClick={() => {
        setTab(id);
        if (id === "histTrades") loadTrades(true); // always reload fresh on open
      }}
    >
      {label}
    </button>
  );

  return (
    <section className="card">
      <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <TabBtn id="pos" label={`仓位 (${positions.length})`} />
        <TabBtn id="orders" label={`当前委托 (${orders.length})`} />
        <TabBtn id="histOrders" label="历史委托" />
        <TabBtn id="histTrades" label="历史成交" />
        <TabBtn id="funds" label="资金流水" />
        <span style={{ flex: 1 }} />
        <button className="ghost" disabled={busy} onClick={loadPosOrders}>↻</button>
      </div>

      {/* ───── 仓位 ───── */}
      {tab === "pos" &&
        (positions.length === 0 ? (
          <p className="small">无数据 — 下单成交后持仓出现在这里。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th><th>合约</th><th>数量</th><th>方向</th><th>开仓价</th><th>标记价</th>
                <th>预估强平价</th><th>保证金率</th><th>保证金</th><th>盈亏(回报率)</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const m = mark ?? 0;
                const pnl = (p.direction === 0 ? m - p.avgEntry : p.avgEntry - m) * p.sizeBtc;
                const roi = p.marginUsdc > 0 ? (pnl / p.marginUsdc) * 100 : 0;
                const liq =
                  p.direction === 0
                    ? p.avgEntry - (p.marginUsdc * (1 - actions.MMR)) / p.sizeBtc
                    : p.avgEntry + (p.marginUsdc * (1 - actions.MMR)) / p.sizeBtc;
                const notional = p.sizeBtc * m;
                const marginRatio = notional > 0 ? ((p.marginUsdc + pnl) / notional) * 100 : 0;
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{ctx.pairName}</td>
                    <td>{f4(p.sizeBtc)}</td>
                    <td style={{ color: p.direction === 0 ? "#3fb950" : "#f85149" }}>{sideZh(p.direction)}</td>
                    <td>${f2(p.avgEntry)}</td>
                    <td>{mark ? "$" + f2(m) : "—"}</td>
                    <td>${f2(liq)}</td>
                    <td>{pct(marginRatio)}</td>
                    <td>{f2(p.marginUsdc)}</td>
                    <td style={{ color: pnl >= 0 ? "#3fb950" : "#f85149" }}>
                      {pnl >= 0 ? "+" : ""}{f2(pnl)} ({pct(roi)})
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        disabled={busy || !mark}
                        onClick={() => act(`平仓 ${sideZh(p.direction)} ${f4(p.sizeBtc)}`, () => actions.closePosition(ctx, p, mark!))}
                      >
                        市价平仓
                      </button>{" "}
                      <button className="ghost" disabled title="二期接入" onClick={() => append("止盈止损：二期接入")}>
                        止盈止损
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}

      {/* ───── 当前委托 ───── */}
      {tab === "orders" &&
        (orders.length === 0 ? (
          <p className="small">无数据 — 挂限价/止盈止损单后出现在这里。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>时间</th><th>合约</th><th>类型</th><th>方向</th>
                <th>触发价</th><th>委托价</th><th>数量</th><th>成交量</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.orderSeq.toString()}>
                  <td>{o.orderSeq.toString()}</td>
                  <td>{ts(o.startTime)}</td>
                  <td>{ctx.pairName}</td>
                  <td>{ORDER_KIND_LABEL[o.orderKind] ?? o.orderKind}</td>
                  <td style={{ color: o.direction === 0 ? "#3fb950" : "#f85149" }}>{sideZh(o.direction)}</td>
                  <td>${f2(Number(o.targetPrice1e9) / 1e9)}</td>
                  <td>${f2(Number(o.targetPrice1e9) / 1e9)}</td>
                  <td>{f4(Number(o.amount1e9) / 1e9)}</td>
                  <td>0</td>
                  <td>
                    <button disabled={busy} onClick={() => act(`撤单 #${o.orderSeq}`, () => actions.cancelOrder(ctx, o.orderSeq, o.direction))}>
                      撤单
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}

      {/* ───── 历史成交 ───── */}
      {tab === "histTrades" && (
        <>
          <div className="row" style={{ marginBottom: 6 }}>
            <button className="ghost" disabled={tradeBusy} onClick={() => loadTrades(true)}>{tradeBusy ? "…" : "↻ 刷新"}</button>
            <button className="ghost" disabled={trades.length === 0} onClick={exportTrades}>导出历史记录</button>
          </div>
          {trades.length === 0 ? (
            <p className="small">{tradeBusy ? "加载中…" : "无数据"}</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>时间</th><th>合约</th><th>方向</th><th>成交均价</th>
                    <th>数量</th><th>手续费</th><th>已实现盈亏</th><th>回报率</th><th>仓位状态</th><th>tx</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => {
                    const roi = t.amountBtc * t.costPrice > 0 ? (t.realizedPnl * lev) / (t.amountBtc * t.costPrice) * 100 : 0;
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{ts(t.time)}</td>
                        <td>{ctx.pairName}</td>
                        <td style={{ color: t.direction === 0 ? "#3fb950" : "#f85149" }}>{sideZh(t.direction)}</td>
                        <td>${f2(t.price)}</td>
                        <td>{f4(t.amountBtc)}</td>
                        <td>{f4(t.feeUsdc)}</td>
                        <td style={{ color: t.realizedPnl >= 0 ? "#3fb950" : "#f85149" }}>
                          {t.realizedPnl >= 0 ? "+" : ""}{f2(t.realizedPnl)}
                        </td>
                        <td>{t.realizedPnl !== 0 ? pct(roi) : "—"}</td>
                        <td>{actions.orderTypeLabel(t.orderType)}</td>
                        <td>
                          <a href={`https://solscan.io/tx/${t.sig}?cluster=devnet`} target="_blank" rel="noreferrer">
                            {t.sig.slice(0, 6)}…
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="row" style={{ marginTop: 6 }}>
                {tradeBefore ? (
                  <button className="ghost" disabled={tradeBusy} onClick={() => loadTrades(false)}>{tradeBusy ? "…" : "加载更多 (25)"}</button>
                ) : (
                  <span className="small">— 没有更多记录了 —</span>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ───── 历史委托 / 资金流水（二期）───── */}
      {tab === "histOrders" && <p className="small">历史委托：二期接入（已有 LimitedOrderHistory 事件，加时间筛选 + 分页即可）。</p>}
      {tab === "funds" && <p className="small">资金流水：二期接入（TransactionHistory / Deposited / Withdrawn 事件）。</p>}
    </section>
  );
}
