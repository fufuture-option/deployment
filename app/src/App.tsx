import { useCallback, useEffect, useRef, useState } from "react";
import TradePanel from "./TradePanel";
import { web3 } from "@anchor-lang/core";
import { BigNumber } from "ethers";
import { getPhantom, makeSignCtx, withMint, SignCtx, fromUnits } from "./ctx";
import * as actions from "./index";
import {
  PAIRS,
  USDC_DECIMALS,
  RPC_URL,
  RPC_FALLBACK,
  settleLabel,
  feedHexByPair,
  pairNameById,
} from "./config";
import AdminPanel from "./AdminPanel";

type Tab = "user" | "admin";

// host of an RPC URL (hide the api key in the UI)
const rpcHost = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

export default function App() {
  const [ctx, setCtx] = useState<SignCtx | null>(null);
  // pairId/decimals 现在是显式 UI 状态（不再挂在 ctx 上）。
  const [pairId, setPairId] = useState<number>(PAIRS[0].id);
  const [decimals, setDecimals] = useState<number>(USDC_DECIMALS);
  const [addr, setAddr] = useState<string>("");
  const [tab, setTab] = useState<Tab>("user");
  const [price, setPrice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const logBox = useRef<HTMLDivElement>(null);

  // state panel
  const [usdc, setUsdc] = useState<BigNumber>(BigNumber.from(0));
  const [lpInfo, setLpInfo] = useState<actions.LpInfo | null>(null);
  const [pubInfo, setPubInfo] = useState<actions.PublicPoolInfo | null>(null);
  const [bal, setBal] = useState<actions.UserBalances | null>(null);
  const [orders, setOrders] = useState<actions.PendingOrder[]>([]);
  const [deals, setDeals] = useState<actions.MyDeal[]>([]);
  const [inviter, setInviter] = useState<string | null>(null);
  const [commission, setCommission] = useState<actions.CommissionInfo | null>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [history, setHistory] = useState<actions.HistoryItem[]>([]);
  const [histBusy, setHistBusy] = useState(false);
  const [userLev, setUserLev] = useState<number | null>(null);
  const [settles, setSettles] = useState<actions.SettleMintRow[]>([]);

  // form: private pool (provide / withdraw)
  const [poolAmt, setPoolAmt] = useState("20");
  const [lpWdAmt, setLpWdAmt] = useState("10");
  // form: public pool (provide / withdraw)
  const [pubAmt, setPubAmt] = useState("20");
  const [pubWdAmt, setPubWdAmt] = useState("10");
  // form: pool risk params (set_lp_params)
  const [lpLevX, setLpLevX] = useState("10");
  // form: user trading leverage (set_user_leverage)
  const [userLevX, setUserLevX] = useState("10");
  // form: trading-account deposit / withdraw
  const [depAmt, setDepAmt] = useState("50");
  const [wdAmt, setWdAmt] = useState("10");
  // form: limit order
  const [dir, setDir] = useState<1 | 2>(1); // 1=LONG 2=SHORT (EVM 对齐)
  const [amount, setAmount] = useState("0.001");
  // keeper 报酬：现为**原生 SOL**（对齐 EVM 的 msg.value），覆盖 keeper 触发成交 + 归集两笔 gas；
  // 挂单时托管进订单 PDA，成交划给 keeper，撤单/过期则全额退回。默认 0.002 SOL（留余量）。
  const [reward, setReward] = useState("0.002");
  const [goodTill, setGoodTill] = useState(60);
  // form: create market (permissionless) — any classic SPL token as settle currency
  const [newMint, setNewMint] = useState("");

  // stable identity — otherwise it changes every render and any useCallback/effect
  // depending on it (e.g. AdminPanel.load) refires on every render → RPC 429 storm.
  const append = useCallback(
    (m: string) => setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${m}`]),
    []
  );
  // auto-scroll the log box internally (do NOT scroll the whole page)
  useEffect(() => {
    const el = logBox.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  // live price (of the active pair; re-subscribes when the pair switches)
  useEffect(() => {
    let alive = true;
    const feed = feedHexByPair(pairId);
    setPrice(null);
    const tick = () =>
      actions.fetchHermesPrice(feed).then((p) => alive && setPrice(p)).catch(() => {});
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pairId]);

  const connect = async () => {
    try {
      const phantom = getPhantom();
      const { publicKey } = await phantom.connect();
      const c = makeSignCtx(phantom);
      setCtx(c);
      setAddr(publicKey.toBase58());
      append(`✅ connected ${publicKey.toBase58()}`);
      refresh(c);
      loadHistory(c);
      loadSettles(c);
    } catch (e: any) {
      append(`❌ ${e.message || e}`);
    }
  };

  const loadSettles = useCallback(async (c?: SignCtx) => {
    const cc = c || ctx;
    if (!cc) return;
    try {
      setSettles(await actions.listSettleMints(cc));
    } catch (e: any) {
      append(`⚠ settles: ${e.message || e}`);
    }
  }, [ctx]);

  // switch active settle currency (collateral): rebuild ctx + decimals, reload.
  const switchSettle = (mintB58: string) => {
    if (!ctx || mintB58 === ctx.mint.toBase58()) return;
    const row = settles.find((s) => s.mint === mintB58);
    const c = withMint(ctx, new web3.PublicKey(mintB58));
    setCtx(c);
    setDecimals(row ? row.decimals : USDC_DECIMALS);
    append(`↔ 切换结算币 → ${settleLabel(c.mint.toBase58())}`);
    refresh(c);
    loadHistory(c);
  };

  // switch active trading pair: just update pairId state (TradePanel + price re-fetch react to it).
  const switchPair = (idStr: string) => {
    if (!ctx) return;
    const pair = PAIRS.find((p) => String(p.id) === idStr);
    if (!pair || pair.id === pairId) return;
    setPairId(pair.id);
    append(`↔ 切换交易对 → ${pair.name}`);
    refresh(ctx, pair.id);
  };

  const refresh = useCallback(async (c?: SignCtx, pid: number = pairId) => {
    const cc = c || ctx;
    if (!cc) return;
    try {
      // positions + open orders are loaded by <TradePanel> itself (its own gPA);
      // refresh only does the cheap account reads here to avoid extra getProgramAccounts.
      const [u, l, b, ul, pp, inv, comm] = await Promise.all([
        actions.getUsdcBalance(cc),
        actions.getLpInfo(cc),
        actions.getUserBalances(cc),
        actions.getUserLeverage(cc, pid),
        actions.getPublicPoolInfo(cc),
        actions.getInviteRelation(cc),
        actions.getCommission(cc),
      ]);
      setUsdc(u);
      setLpInfo(l);
      setBal(b);
      setUserLev(ul);
      setPubInfo(pp);
      setInviter(inv);
      setCommission(comm);
    } catch (e: any) {
      append(`⚠ refresh: ${e.message || e}`);
    }
  }, [ctx, pairId]);

  const loadHistory = useCallback(async (c?: SignCtx) => {
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

  // permissionless create-market: run the 6-step bundle, then reload the settle list
  // so the new market shows up in the 结算币 selector immediately.
  const onCreateMarket = async () => {
    if (!ctx) return;
    await run("创建市场 (无许可)", () => actions.createMarket(ctx, newMint));
    await loadSettles();
  };

  const fmt6 = (v: BigNumber | null) => (v == null ? "—" : fromUnits(v, decimals));
  const fmt9 = (v: BigNumber) => fromUnits(v, 9);
  const settle = ctx ? settleLabel(ctx.mint.toBase58()) : "USDC";

  return (
    <div className="wrap">
      <header>
        <h1>Future&nbsp;Solana — Limit Order Demo</h1>
        <div className="sub">
          {pairNameById(pairId)} · devnet · live Pyth&nbsp;
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
              <div className="small">RPC: {rpcHost(RPC_URL)} · gPA→{rpcHost(RPC_FALLBACK)}</div>
            </div>
            <label className="small">交易对&nbsp;
              <select value={String(pairId)} onChange={(e) => switchPair(e.target.value)}>
                {PAIRS.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="small">结算币&nbsp;
              <select value={ctx.mint.toBase58()} onChange={(e) => switchSettle(e.target.value)}>
                {settles.length === 0 && <option value={ctx.mint.toBase58()}>{settleLabel(ctx.mint.toBase58())}</option>}
                {settles.map((s) => (
                  <option key={s.mint} value={s.mint}>
                    {settleLabel(s.mint)}（{s.decimals} 位）
                  </option>
                ))}
              </select>
            </label>
            <button className="ghost" onClick={() => refresh()}>↻ refresh</button>
          </div>
        )}
      </section>

      {ctx && (
        <nav className="tabs">
          <button className={tab === "user" ? "tab active" : "tab"} onClick={() => setTab("user")}>
            用户
          </button>
          <button className={tab === "admin" ? "tab active" : "tab"} onClick={() => setTab("admin")}>
            管理员
          </button>
        </nav>
      )}

      {ctx && tab === "admin" && <AdminPanel ctx={ctx} decimals={decimals} append={append} />}

      {ctx && tab === "user" && (
        <>
          <section className="card grid">
            <Stat label={`钱包 ${settle}`} v={fmt6(usdc)} />
            <Stat label="私有池本金" v={fmt6(lpInfo?.amount ?? null)} />
            <Stat label="可用(交易)" v={fmt6(bal?.available ?? null)} />
            <Stat label="挂单冻结" v={fmt6(bal?.orderLocked ?? null)} />
          </section>

          <section className="card">
            <h2>＋ 创建市场（任意 SPL 代币当结算币 · 无许可）</h2>
            <p className="small">
              对齐 EVM「任何人都能开市场」：粘贴一个<b>经典 SPL 代币</b> mint，一键拉起该结算币的完整市场
              （perp settle/vault/risk + treasury + 私有池，最多 6 次签名，幂等可重跑），随后即可用它交易<b>所有已上线的交易对</b>。
              走<b>无许可路径</b>，合约自动套护栏：杠杆/保证金钳制、强制私有池、记录创建者。
              <br />⚠ <b>不支持带 freeze authority 的代币</b>（USDC/USDT 这类合规稳定币请到「管理员」页用 admin 路径添加）。
              建好后会出现在顶部「结算币」下拉里，选中即可交易。
            </p>
            <div className="row">
              <input
                className="mono"
                style={{ flex: 1 }}
                placeholder="SPL 代币 mint 地址（base58，需无 freeze authority）"
                value={newMint}
                onChange={(e) => setNewMint(e.target.value)}
              />
              <button disabled={busy || !newMint.trim()} onClick={onCreateMarket}>
                创建市场
              </button>
            </div>
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
                你还没有私有池。<b>第一步</b>先「创建私有池」(<code>initialize_lp_account</code>，仅建账户、不转账)，
                <b>第二步</b>再「入金」(<code>provide(side=PRIVATE)</code>，需钱包里有测试 USDC)。
                合约里每个钱包/结算币对应<b>一个</b> LpAccount。
              </p>
            )}

            <div className="row" style={{ marginBottom: 8 }}>
              <button disabled={busy || !!lpInfo} onClick={() => run("创建私有池 (initialize_lp_account)", () => actions.createPrivatePool(ctx))}>
                {lpInfo ? "私有池已创建 ✓" : "创建私有池"}
              </button>
              <span className="small">创建与入金分开：先建账户，再分次入金。</span>
            </div>

            <div className="row">
              <label>入金额 ({settle})
                <input value={poolAmt} onChange={(e) => setPoolAmt(e.target.value)} />
              </label>
              <button disabled={busy || !lpInfo} onClick={() => run("私有池入金 (provide)", () => actions.providePrivatePool(ctx, poolAmt))}>
                入金
              </button>
              <label>出金额 ({settle})
                <input value={lpWdAmt} onChange={(e) => setLpWdAmt(e.target.value)} />
              </label>
              <button className="ghost" disabled={busy || !lpInfo} onClick={() => run("私有池出金 (withdraw_lp)", () => actions.withdrawLp(ctx, lpWdAmt))}>
                出金
              </button>
            </div>
            <p className="small">出金只能提"可用"部分(已被接单锁定的不可提);池暂停/下线时禁止出金。</p>

            <h3 style={{ margin: "14px 0 6px" }}>池参数 (set_lp_params)</h3>
            <div className="row">
              <label>接单杠杆 (x)
                <input value={lpLevX} onChange={(e) => setLpLevX(e.target.value)} />
              </label>
              <button disabled={busy || !lpInfo} onClick={() => run(`设置池杠杆 ${lpLevX}x`, () => actions.setLpParams(ctx, { leverageX: lpLevX }))}>
                设杠杆
              </button>
              <button
                className="ghost"
                disabled={busy || !lpInfo}
                onClick={() =>
                  run(
                    lpInfo?.rejectOrder ? "恢复接单" : "暂停接单",
                    () => actions.setLpParams(ctx, { rejectOrder: !lpInfo?.rejectOrder })
                  )
                }
              >
                {lpInfo?.rejectOrder ? "恢复接单" : "暂停接单"}
              </button>
            </div>
            <p className="small">接单杠杆决定池子作为对手方时每笔占用的保证金；暂停后不再被 keeper 选为对手方。</p>
          </section>

          <section className="card">
            <h2>2 · 公有池（共享做市金库）</h2>
            {pubInfo && (pubInfo.myShares.gt(0) || pubInfo.escrowAmount.gt(0)) ? (
              <div className="grid" style={{ marginBottom: 12 }}>
                <Stat label="我的估值" v={fmt6(pubInfo.myValue)} />
                <Stat label="我的份额" v={fmt6(pubInfo.myShares)} />
                <Stat label="池总规模(TVL)" v={fmt6(pubInfo.escrowAmount)} />
              </div>
            ) : (
              <p className="small">
                公有池是所有出资人<b>共担盈亏</b>的做市金库。入金按当前净值发<b>份额</b>
                (<code>provide(side=PUBLIC)</code>)，<b>无需先「创建账户」</b>——首次入金自动建份额账户。
                池子做市赚/亏时，所有份额持有人按比例分担。
              </p>
            )}
            <div className="row">
              <label>入金额 ({settle})
                <input value={pubAmt} onChange={(e) => setPubAmt(e.target.value)} />
              </label>
              <button disabled={busy} onClick={() => run("公有池入金 (provide PUBLIC)", () => actions.providePublicPool(ctx, pubAmt))}>
                入金
              </button>
              <label>提取额 ({settle})
                <input value={pubWdAmt} onChange={(e) => setPubWdAmt(e.target.value)} />
              </label>
              <button className="ghost" disabled={busy || !pubInfo || pubInfo.myShares.lte(0)} onClick={() => run("公有池提取 (withdraw PUBLIC)", () => actions.withdrawPublicPool(ctx, { amountUsdc: pubWdAmt }))}>
                提取
              </button>
              <button className="ghost" disabled={busy || !pubInfo || pubInfo.myShares.lte(0)} onClick={() => run("公有池全部提取", () => actions.withdrawPublicPool(ctx, { all: true }))}>
                全部提取
              </button>
            </div>
            <p className="small">提取按份额<b>当前净值</b>结算(份额 × 池净值);输入金额会换算成对应份额(向下取整)。池下线时禁止提取。</p>
          </section>

          <section className="card">
            <h2>2 · 出入金（交易账户）</h2>
            <p className="small">
              交易/下单用的保证金账户。<code>deposit</code> 把钱包 USDC 转入,<code>withdraw</code> 提回钱包(仅可提"可用"余额,不含持仓/挂单占用)。
            </p>
            <div className="row">
              <label>存入 ({settle})
                <input value={depAmt} onChange={(e) => setDepAmt(e.target.value)} />
              </label>
              <button disabled={busy} onClick={() => run("入金 (deposit)", () => actions.deposit(ctx, depAmt))}>
                存入
              </button>
              <label>提取 ({settle})
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
              <br />⚠ 下单前请先在上方「出入金」卡片<b>存入</b>保证金(可用余额要 ≥ 保证金+手续费)。keeper 报酬为<b>原生 SOL</b>(钱包需备少量 SOL),覆盖 keeper <b>触发成交 + 归集手续费</b>两笔,挂单时托管、成交不了撤单则全额退回。
            </p>
            <div className="oracle-box">
              下单价(Pyth 最新价):
              <b>{price ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "加载中…"}</b>
            </div>
            <div className="row" style={{ margin: "8px 0" }}>
              <label>交易杠杆 (x)
                <input value={userLevX} onChange={(e) => setUserLevX(e.target.value)} />
              </label>
              <button className="ghost" disabled={busy} onClick={() => run(`设置交易杠杆 ${userLevX}x`, () => actions.setUserLeverage(ctx, pairId, userLevX))}>
                设置交易杠杆
              </button>
              <span className="small">
                当前：{userLev != null ? `${userLev}x（已自定义）` : "未设置 → 取 pair 默认值"}。
                影响开仓保证金占用；不设也能下单。
              </span>
            </div>
            <div className="formgrid">
              <label>Side
                <select value={dir} onChange={(e) => setDir(Number(e.target.value) as 1 | 2)}>
                  <option value={1}>LONG</option>
                  <option value={2}>SHORT</option>
                </select>
              </label>
              <label>Amount (BTC)
                <input value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <label>Keeper reward (SOL)
                <input value={reward} onChange={(e) => setReward(e.target.value)} />
              </label>
              <label>Good-till (min)
                <input type="number" value={goodTill} onChange={(e) => setGoodTill(Number(e.target.value))} />
              </label>
            </div>
            <button
              disabled={busy || !price}
              onClick={() =>
                run("place limit order", () =>
                  actions.placeLimitOrder(ctx, pairId, {
                    direction: dir,
                    amountBtc: amount,
                    // req2: 价格由调用方传入。demo 用实时 Pyth 显示价换算成 1e9。
                    targetPrice: BigNumber.from(Math.round((price ?? 0) * 1e9)),
                    rewardGasSol: reward,
                    goodTillMinutes: goodTill,
                  })
                )
              }
            >
              Place order @ Pyth price
            </button>
          </section>

          <section className="card">
            <h2>用户邀请 / 推荐返佣</h2>
            <p className="small">
              绑定邀请人后，你的交易手续费会按比例返佣给邀请人；把<b>你的地址</b>分享给别人，他们绑定后<b>你赚返佣</b>。
            </p>
            <div className="row" style={{ marginBottom: 8, gap: 8 }}>
              <div className="small">我的邀请地址（分享给别人）：<span className="mono">{addr}</span></div>
              <button className="ghost" onClick={() => { navigator.clipboard?.writeText(addr); append("✅ 已复制邀请地址"); }}>复制</button>
            </div>
            <div style={{ marginBottom: 10 }}>
              {inviter ? (
                <div className="small">我的邀请人：<span className="mono">{inviter}</span>（已绑定，一次性不可更改）</div>
              ) : (
                <div className="row" style={{ gap: 8 }}>
                  <input
                    placeholder="输入邀请人地址（base58）"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button disabled={busy || !inviteInput.trim()} onClick={() => run("绑定邀请人", () => actions.bindInviter(ctx, inviteInput))}>
                    绑定邀请人
                  </button>
                </div>
              )}
            </div>
            <div className="row" style={{ gap: 16, marginBottom: 8 }}>
              <div className="small">可领返佣：<b style={{ color: "#3fb950" }}>{fmt6(commission?.unclaimed ?? BigNumber.from(0))} {settle}</b></div>
              <div className="small">已领返佣：{fmt6(commission?.claimed ?? BigNumber.from(0))} {settle}</div>
            </div>
            <button
              disabled={busy || !commission || commission.unclaimed.isZero()}
              onClick={() => run("领取返佣", () => actions.claimCommission(ctx))}
            >
              领取返佣
            </button>
          </section>

          <TradePanel
            ctx={ctx}
            pairId={pairId}
            mark={price}
            userLev={userLev}
            busy={busy}
            setBusy={setBusy}
            append={append}
            onRefresh={refresh}
          />
        </>
      )}

      <section className="card">
        <h2>Log</h2>
        <div className="logbox" ref={logBox}>
          {log.map((l, i) => (
            <div key={i} className="mono small">{l}</div>
          ))}
        </div>
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
