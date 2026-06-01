import { useCallback, useEffect, useRef, useState } from "react";
import { getPhantom, makeCtx, Ctx } from "./solana";
import * as actions from "./actions";
import { fromUnits } from "./actions";
import { PAIR_NAME, USDC_DECIMALS, RPC_URL } from "./config";

export default function App() {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [addr, setAddr] = useState<string>("");
  const [price, setPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const logEnd = useRef<HTMLDivElement>(null);

  // state panel
  const [usdc, setUsdc] = useState<bigint>(0n);
  const [lpInfo, setLpInfo] = useState<actions.LpInfo | null>(null);
  const [bal, setBal] = useState<actions.UserBalances | null>(null);
  const [orders, setOrders] = useState<actions.PendingOrder[]>([]);
  const [history, setHistory] = useState<actions.HistoryItem[]>([]);
  const [histBusy, setHistBusy] = useState(false);

  // form: private pool (provide / withdraw)
  const [poolAmt, setPoolAmt] = useState("20");
  const [lpWdAmt, setLpWdAmt] = useState("10");
  // form: trading-account deposit / withdraw
  const [depAmt, setDepAmt] = useState("50");
  const [wdAmt, setWdAmt] = useState("10");
  // form: limit order
  const [dir, setDir] = useState<0 | 1>(0);
  const [amount, setAmount] = useState("0.001");
  const [reward, setReward] = useState("0.1");
  const [goodTill, setGoodTill] = useState(60);

  const append = (m: string) =>
    setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${m}`]);
  useEffect(() => logEnd.current?.scrollIntoView({ behavior: "smooth" }), [log]);

  // live price
  useEffect(() => {
    let alive = true;
    const tick = () =>
      actions.fetchHermesPrice().then((p) => alive && setPrice(p)).catch(() => {});
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const connect = async () => {
    try {
      const phantom = getPhantom();
      const { publicKey } = await phantom.connect();
      const c = makeCtx(phantom);
      setCtx(c);
      setAddr(publicKey.toBase58());
      append(`✅ connected ${publicKey.toBase58()}`);
      refresh(c);
      loadHistory(c);
    } catch (e: any) {
      append(`❌ ${e.message || e}`);
    }
  };

  const refresh = useCallback(async (c?: Ctx) => {
    const cc = c || ctx;
    if (!cc) return;
    try {
      const [u, l, b, o] = await Promise.all([
        actions.getUsdcBalance(cc),
        actions.getLpInfo(cc),
        actions.getUserBalances(cc),
        actions.getMyPendingOrders(cc),
      ]);
      setUsdc(u);
      setLpInfo(l);
      setBal(b);
      setOrders(o);
    } catch (e: any) {
      append(`⚠ refresh: ${e.message || e}`);
    }
  }, [ctx]);

  const loadHistory = useCallback(async (c?: Ctx) => {
    const cc = c || ctx;
    if (!cc) return;
    setHistBusy(true);
    try {
      setHistory(await actions.getMyHistory(cc));
    } catch (e: any) {
      append(`⚠ history: ${e.message || e}`);
    } finally {
      setHistBusy(false);
    }
  }, [ctx]);

  const run = async (label: string, fn: () => Promise<string>) => {
    if (!ctx) return;
    setBusy(true);
    append(`▶ ${label} …`);
    try {
      const sig = await fn();
      append(`✅ ${label}: ${sig}`);
      append(`   https://solscan.io/tx/${sig}?cluster=devnet`);
      await refresh();
      loadHistory();
    } catch (e: any) {
      append(`❌ ${label}: ${e.message || JSON.stringify(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const fmt6 = (v: bigint | null) => (v == null ? "—" : fromUnits(v, USDC_DECIMALS));
  const fmt18 = (v: bigint) => fromUnits(v, 18);

  return (
    <div className="wrap">
      <header>
        <h1>Future&nbsp;Solana — Limit Order Demo</h1>
        <div className="sub">
          {PAIR_NAME} · devnet · live Pyth&nbsp;
          <b>{price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "…"}</b>
        </div>
      </header>

      <section className="card">
        {!ctx ? (
          <button onClick={connect}>Connect Phantom</button>
        ) : (
          <div className="row">
            <div>
              <div className="mono small">{addr}</div>
              <div className="small">RPC: {RPC_URL}</div>
            </div>
            <button className="ghost" onClick={() => refresh()}>↻ refresh</button>
          </div>
        )}
      </section>

      {ctx && (
        <>
          <section className="card grid">
            <Stat label="钱包 USDC" v={fmt6(usdc)} />
            <Stat label="私有池本金" v={fmt6(lpInfo?.amount ?? null)} />
            <Stat label="可用(交易)" v={fmt6(bal?.available ?? null)} />
            <Stat label="挂单冻结" v={fmt6(bal?.orderLocked ?? null)} />
          </section>

          <section className="card">
            <h2>1 · 我的私有池（LP）</h2>
            {lpInfo ? (
              <div className="grid" style={{ marginBottom: 12 }}>
                <Stat label="本金" v={fmt6(lpInfo.amount)} />
                <Stat label="可用" v={fmt6(lpInfo.available)} />
                <Stat label="已锁定(接单)" v={fmt6(lpInfo.locked)} />
                <Stat label="杠杆 / 接单" v={`${lpInfo.leverageX}x / ${lpInfo.rejectOrder ? "暂停" : "正常"}`} />
              </div>
            ) : (
              <p className="small">
                你还没有私有池。入金即创建：<code>initialize_lp_account</code> + <code>provide(side=PRIVATE)</code>（需要钱包里有测试 USDC）。
              </p>
            )}
            <div className="row">
              <label>入金额 (USDC)
                <input value={poolAmt} onChange={(e) => setPoolAmt(e.target.value)} />
              </label>
              <button disabled={busy} onClick={() => run("私有池入金 (provide)", () => actions.createPrivatePool(ctx, poolAmt))}>
                入金
              </button>
              <label>出金额 (USDC)
                <input value={lpWdAmt} onChange={(e) => setLpWdAmt(e.target.value)} />
              </label>
              <button className="ghost" disabled={busy || !lpInfo} onClick={() => run("私有池出金 (withdraw_lp)", () => actions.withdrawLp(ctx, lpWdAmt))}>
                出金
              </button>
            </div>
            <p className="small">出金只能提"可用"部分(已被接单锁定的不可提);池暂停/下线时禁止出金。</p>
          </section>

          <section className="card">
            <h2>2 · 出入金（交易账户）</h2>
            <p className="small">
              交易/下单用的保证金账户。<code>deposit</code> 把钱包 USDC 转入,<code>withdraw</code> 提回钱包(仅可提"可用"余额,不含持仓/挂单占用)。
            </p>
            <div className="row">
              <label>存入 (USDC)
                <input value={depAmt} onChange={(e) => setDepAmt(e.target.value)} />
              </label>
              <button disabled={busy} onClick={() => run("入金 (deposit)", () => actions.deposit(ctx, depAmt))}>
                存入
              </button>
              <label>提取 (USDC)
                <input value={wdAmt} onChange={(e) => setWdAmt(e.target.value)} />
              </label>
              <button className="ghost" disabled={busy} onClick={() => run("出金 (withdraw)", () => actions.withdraw(ctx, wdAmt))}>
                提取
              </button>
            </div>
          </section>

          <section className="card">
            <h2>3 · Place limit order</h2>
            <p className="small">
              限价 = <b>下单时的 Pyth 最新价</b>(自动取,无需手填)。keeper 在 Pyth 价穿透该价时以该价成交。
              <br />⚠ 下单前请先在上方「出入金」卡片<b>存入</b>保证金(可用余额要 ≥ 保证金+手续费+keeper 报酬)。
            </p>
            <div className="oracle-box">
              下单价(Pyth 最新价):
              <b>{price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "加载中…"}</b>
            </div>
            <div className="formgrid">
              <label>Side
                <select value={dir} onChange={(e) => setDir(Number(e.target.value) as 0 | 1)}>
                  <option value={0}>LONG</option>
                  <option value={1}>SHORT</option>
                </select>
              </label>
              <label>Amount (BTC)
                <input value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label>Keeper reward (USDC)
                <input value={reward} onChange={(e) => setReward(e.target.value)} />
              </label>
              <label>Good-till (min)
                <input type="number" value={goodTill} onChange={(e) => setGoodTill(Number(e.target.value))} />
              </label>
            </div>
            <button
              disabled={busy}
              onClick={() =>
                run("place limit order", () =>
                  actions.placeLimitOrder(ctx, {
                    direction: dir,
                    amountBtc: amount,
                    rewardGasUsdc: reward,
                    goodTillMinutes: goodTill,
                  })
                )
              }
            >
              Place order @ Pyth price
            </button>
          </section>

          <section className="card">
            <h2>My pending limit orders</h2>
            {orders.length === 0 ? (
              <p className="small">none — place one above, then watch the keeper fill it.</p>
            ) : (
              <table>
                <thead>
                  <tr><th>seq</th><th>side</th><th>amount</th><th>target</th><th>state</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.orderSeq.toString()}>
                      <td>{o.orderSeq.toString()}</td>
                      <td>{o.direction === 0 ? "LONG" : "SHORT"}</td>
                      <td>{fmt18(o.amount)}</td>
                      <td>${fmt18(o.targetPrice)}</td>
                      <td>PENDING</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="card">
            <div className="row">
              <h2>下单 / 成交记录（链上事件，无后端）</h2>
              <button className="ghost" disabled={histBusy} onClick={() => loadHistory()}>
                {histBusy ? "…" : "↻ 刷新历史"}
              </button>
            </div>
            <p className="small">
              来自 <code>getSignaturesForAddress(userAccount)</code> + <code>getTransaction</code> +
              Anchor <code>EventParser</code> 解码事件（成交单已 close，但事件永久留在链上账本）。
            </p>
            {history.length === 0 ? (
              <p className="small">{histBusy ? "加载中…" : "暂无记录"}</p>
            ) : (
              <table>
                <thead>
                  <tr><th>时间</th><th>类型</th><th>seq</th><th>方向</th><th>数量</th><th>价格</th><th>tx</th></tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td>{h.time ? new Date(h.time * 1000).toLocaleString() : "—"}</td>
                      <td>{h.kind}</td>
                      <td>{h.orderSeq}</td>
                      <td>{h.side}</td>
                      <td>{h.amount}</td>
                      <td>${h.price}</td>
                      <td>
                        <a href={`https://solscan.io/tx/${h.sig}?cluster=devnet`} target="_blank" rel="noreferrer">
                          {h.sig.slice(0, 8)}…
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <section className="card log">
        <h2>Log</h2>
        {log.map((l, i) => (
          <div key={i} className="mono small">{l}</div>
        ))}
        <div ref={logEnd} />
      </section>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="stat">
      <div className="small">{label}</div>
      <div className="statv">{v}</div>
    </div>
  );
}
