import { useCallback, useEffect, useState } from "react";
import { BigNumber } from "ethers";
import { SignCtx, fromUnits } from "./ctx";
import * as actions from "./index";
import { USDC_DECIMALS, PAIR_ID, settleLabel } from "./config";

const PAIR_STATUS: Record<number, string> = { 0: "正常", 1: "暂停", 2: "下线" };
const POOL_TYPE: Record<number, string> = { 1: "PUBLIC", 2: "PRIVATE", 3: "MIXED", 4: "REFUSE" };
const POOL_STATUS: Record<number, string> = { 0: "active", 1: "paused", 2: "offline" };

export default function AdminPanel({
  ctx,
  decimals,
  append,
}: {
  ctx: SignCtx;
  decimals: number; // active settle-mint decimals (passed in; no longer on ctx)
  append: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [amAdmin, setAmAdmin] = useState<boolean | null>(null);
  const [glob, setGlob] = useState<actions.GlobalCfg | null>(null);
  const [pair, setPair] = useState<actions.PairCfg | null>(null);
  const [pool, setPool] = useState<actions.PoolCfg | null>(null);
  const [lps, setLps] = useState<actions.LpRow[]>([]);
  const [pairs, setPairs] = useState<actions.PairRow[]>([]);
  const [mints, setMints] = useState<actions.SettleMintRow[]>([]);

  // ── ② settle currency form (prefilled with the devnet test USDT mint)
  const [sMint, setSMint] = useState("3hUnovN6untakLtsget2f7h1AbrDGbeARCmJ9uPcNg8L");
  const [sLev, setSLev] = useState("10");

  // ── ③ edit-pair: which pair + its editable fields
  const [selPair, setSelPair] = useState<number>(PAIR_ID);
  const [pLev, setPLev] = useState("");
  const [pFee, setPFee] = useState("");
  const [pReward, setPReward] = useState("");
  const [pMinOrder, setPMinOrder] = useState("");
  const [pStatus, setPStatus] = useState<number>(0);
  const [pSource, setPSource] = useState<number>(0); // oracle_source: 0 Pyth 1 SB 3 Chainlink
  const [pClFeed, setPClFeed] = useState(""); // chainlink feed id hex (when switching to Chainlink)
  const [pSbAccount, setPSbAccount] = useState(""); // switchboard PullFeed pubkey (when switching to SB)
  const [pSbHash, setPSbHash] = useState(""); // switchboard feed_hash hex (when switching to SB)

  // ── ③ register-pair form (prefilled with ETH/USD)
  const [rId, setRId] = useState("");
  const [rName, setRName] = useState("ETH/USD");
  const [rFeed, setRFeed] = useState("ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace");
  const [rLev, setRLev] = useState("10");
  const [rFee, setRFee] = useState("0.1");
  const [rMin, setRMin] = useState("0.01");
  const [rStale, setRStale] = useState("120");

  // ── ④ pool config form
  const [poolStatus, setPoolStatus] = useState<number>(0);
  const [poolType, setPoolType] = useState<number>(2);
  const [poolMin, setPoolMin] = useState("");

  const fmt = (v: BigNumber, d: number) => fromUnits(v, d);
  const lev = (v: BigNumber) => `${Number(v.toString()) / 1e9}x`; // leverage 1e9 -> x
  const pct = (v: BigNumber) => `${Number(v.toString()) / 1e7}%`; // rate 1e9 -> % (1% = 1e7)
  const sourceName = (s: number) => ["Pyth", "Switchboard", "Supra", "Chainlink"][s] ?? `#${s}`;

  // fetch one pair's full config into the edit form (light getAccountInfo).
  const fetchPair = useCallback(
    async (id: number) => {
      try {
        const pr = await actions.getPairConfig(ctx, id);
        setPair(pr);
        if (pr) {
          setPLev(String(Number(pr.defaultLeverage.toString()) / 1e9));
          setPFee(String(Number(pr.tradingFeeRate.toString()) / 1e7));
          setPReward(pr.rewardGas.toString());
          setPMinOrder(fromUnits(pr.minOrderAmount, 9));
          setPStatus(pr.status);
          setPSource(pr.oracleSource);
          setPClFeed(pr.oracleSource === 3 ? pr.chainlinkFeedIdHex : "");
        }
      } catch (e: any) {
        append(`⚠ pair #${id}: ${e.message || e}`);
      }
    },
    [ctx, append]
  );

  // load everything except the selected pair (that has its own effect).
  const load = useCallback(async () => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    try {
      const [g, po] = await Promise.all([actions.getGlobalConfig(ctx), actions.getPoolConfig(ctx)]);
      setGlob(g);
      setPool(po);
      setAmAdmin(!!g && g.admin === ctx.wallet.toBase58());
      if (po) {
        setPoolStatus(po.status);
        setPoolType(po.poolType);
        setPoolMin(fromUnits(po.privateMinProvide, decimals));
      }
      // heavy reads (getProgramAccounts) — sequential + spaced (public devnet 429).
      const prs = await actions.listPairs(ctx);
      setPairs(prs);
      setRId((cur) => {
        if (cur) return cur;
        const used = new Set(prs.map((p) => p.pairId));
        let n = 1;
        while (used.has(n)) n++;
        return String(n);
      });
      await sleep(400);
      setMints(await actions.listSettleMints(ctx));
      await sleep(400);
      setLps(await actions.listLpAccounts(ctx));
    } catch (e: any) {
      append(`⚠ admin load: ${e.message || e}`);
    }
  }, [ctx, append]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    fetchPair(selPair);
  }, [selPair, fetchPair]);

  const run = async (label: string, fn: () => Promise<string>, refreshPair = false) => {
    setBusy(true);
    append(`▶ ${label} …`);
    try {
      const sig = await fn();
      append(`✅ ${label}: ${sig}`);
      append(`   https://solscan.io/tx/${sig}?cluster=devnet`);
      await load();
      if (refreshPair) await fetchPair(selPair);
    } catch (e: any) {
      append(`❌ ${label}: ${e.message || JSON.stringify(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const noAdmin = amAdmin === false;
  const short = (s: string) => s.slice(0, 4) + "…" + s.slice(-4);

  const transferAdmin = () => {
    const to = window.prompt(
      "转移 admin —— 输入新管理员地址（base58 公钥）：\n⚠ 单向不可逆，转出后当前钱包将失去 perp_core 管理权。",
      ""
    );
    if (to == null) return;
    const addr = to.trim();
    if (!addr) return;
    if (!window.confirm(`确认把 perp_core admin 转给：\n${addr}\n\n此操作不可逆。`)) return;
    run("转移 admin (set_addresses)", () => actions.transferAdmin(ctx, addr));
  };

  return (
    <>
      {/* ───── header: identity + permission + overview ───── */}
      <section className="card">
        <div className="row">
          <h2>管理员控制台</h2>
          <button className="ghost" disabled={busy} onClick={load}>↻ 刷新</button>
        </div>
        <div className="grid" style={{ marginBottom: 10 }}>
          <Stat label="结算币" v={`${mints.length} 个`} />
          <Stat label="交易对" v={`${pairs.length} 个`} />
          <Stat label="做市账户" v={`${lps.length} 个`} />
          <Stat label="当前结算币" v={settleLabel(ctx.mint.toBase58())} />
        </div>
        <div className="small mono" style={{ marginBottom: 6 }}>连接身份：{ctx.wallet.toBase58()}</div>
        {amAdmin == null ? (
          <p className="small">检查权限中…</p>
        ) : amAdmin ? (
          <p className="small" style={{ color: "#3fb950" }}>✓ 当前钱包是管理员，下方所有写操作可用。</p>
        ) : (
          <p className="small" style={{ color: "#d29922" }}>
            ⚠ 当前钱包<b>不是</b> admin（admin = <span className="mono">{glob ? short(glob.admin) : "…"}</span>）。
            下方为<b>只读</b>视图，写操作已禁用。请在 Phantom 切到 admin 钱包。
          </p>
        )}
      </section>

      {/* ───── ① 平台治理 ───── */}
      <section className="card">
        <h2>① 平台治理 · 全局配置</h2>
        <p className="small">协议级参数与管理员权限（最高权限，谨慎操作）。</p>
        {glob ? (
          <div className="grid" style={{ margin: "12px 0" }}>
            <Stat label="管理员 admin" v={short(glob.admin)} />
            <Stat label="维持保证金率" v={pct(glob.maintenanceMarginRate)} />
            <Stat label="最小入金" v={`${fmt(glob.minDepositAmount, USDC_DECIMALS)}`} />
            <Stat label="下单总闸" v={`市价${glob.orderSwitch & 1 ? "✓" : "✗"} / 限价${glob.orderSwitch & 2 ? "✓" : "✗"}`} />
          </div>
        ) : (
          <p className="small">未初始化</p>
        )}
        <div className="row">
          <button disabled={busy || noAdmin} onClick={transferAdmin}>转移管理员…</button>
          <span className="small">把 perp_core admin 转给另一地址（set_addresses）。⚠ 单向不可逆；不影响池子 admin。</span>
        </div>
      </section>

      {/* ───── ② 结算币（抵押品）───── */}
      <section className="card">
        <h2>② 结算币（抵押品）· {mints.length} 个</h2>
        <p className="small">
          平台的资金基础：每种抵押品是独立的金库 / 账户 / 池。先有结算币，才能建市场和入金。
        </p>
        {mints.length > 0 && (
          <table style={{ margin: "10px 0" }}>
            <thead>
              <tr><th>结算币 mint</th><th>精度</th><th>默认杠杆</th><th>状态</th></tr>
            </thead>
            <tbody>
              {mints.map((mm) => (
                <tr key={mm.mint}>
                  <td className="mono">{short(mm.mint)}</td>
                  <td>{mm.decimals}</td>
                  <td>{lev(mm.defaultLeverage)}</td>
                  <td>{PAIR_STATUS[mm.status] ?? String(mm.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h3 className="sub-h">添加结算币</h3>
        <p className="small">
          需先在链上存在该 SPL mint。点击后跑 5 步初始化（perp: settle_config → settle_vault → risk_fund；lp: pool_config → pool_vault），
          幂等可重跑，会连续弹出最多 5 次签名。
        </p>
        <label style={{ display: "block", marginBottom: 8 }}>结算币 mint 地址
          <input className="mono" style={{ width: "100%" }} value={sMint} onChange={(e) => setSMint(e.target.value)} />
        </label>
        <div className="row">
          <label>默认杠杆 (x)
            <input value={sLev} onChange={(e) => setSLev(e.target.value)} />
          </label>
          <button
            disabled={busy || noAdmin}
            onClick={() => run(`添加结算币 ${short(sMint)}`, () => actions.addSettleCurrency(ctx, sMint, { defaultLeverageX: sLev }))}
          >
            添加结算币（5 步）
          </button>
        </div>
      </section>

      {/* ───── ③ 交易对（市场）───── */}
      <section className="card">
        <h2>③ 交易对（市场）· {pairs.length} 个</h2>
        <p className="small">可交易的盘口。pair 与结算币正交（同一 pair 可用不同抵押品交易）。</p>
        {pairs.length > 0 && (
          <table style={{ margin: "10px 0" }}>
            <thead>
              <tr><th>id</th><th>名称</th><th>默认杠杆</th><th>费率</th><th>最小下单</th><th>状态</th><th>数据源</th><th>feed</th></tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={p.pairId} style={{ cursor: "pointer", fontWeight: p.pairId === selPair ? 700 : 400 }} onClick={() => setSelPair(p.pairId)}>
                  <td>#{p.pairId}</td>
                  <td>{p.name}</td>
                  <td>{lev(p.defaultLeverage)}</td>
                  <td>{pct(p.tradingFeeRate)}</td>
                  <td>{fmt(p.minOrderAmount, 9)}</td>
                  <td>{PAIR_STATUS[p.status] ?? String(p.status)}</td>
                  <td>{sourceName(p.oracleSource)}</td>
                  <td className="mono">{p.feedHex.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="sub-h">编辑交易对参数 · update_pair</h3>
        <div className="formgrid">
          <label>选择 pair
            <select value={selPair} onChange={(e) => setSelPair(Number(e.target.value))}>
              {pairs.map((p) => (
                <option key={p.pairId} value={p.pairId}>#{p.pairId} {p.name}</option>
              ))}
              {pairs.length === 0 && <option value={selPair}>#{selPair}</option>}
            </select>
          </label>
          <label>默认杠杆 (x)
            <input value={pLev} onChange={(e) => setPLev(e.target.value)} />
          </label>
          <label>手续费率 (%)
            <input value={pFee} onChange={(e) => setPFee(e.target.value)} />
          </label>
          <label>最小下单
            <input value={pMinOrder} onChange={(e) => setPMinOrder(e.target.value)} />
          </label>
          <label>keeper 报酬 (lamports)
            <input value={pReward} onChange={(e) => setPReward(e.target.value)} />
          </label>
          <label>状态
            <select value={pStatus} onChange={(e) => setPStatus(Number(e.target.value))}>
              <option value={0}>0 · 正常</option>
              <option value={1}>1 · 暂停</option>
              <option value={2}>2 · 下线</option>
            </select>
          </label>
        </div>
        <button
          disabled={busy || noAdmin || !pair}
          onClick={() =>
            run(
              `update_pair #${selPair}`,
              () =>
                actions.updatePair(ctx, selPair, {
                  leverageX: pLev,
                  feeRatePct: pFee,
                  minOrderBtc: pMinOrder,
                  rewardGas: pReward,
                  status: pStatus,
                }),
              true
            )
          }
        >
          保存 #{selPair} 参数
        </button>

        <h3 className="sub-h">预言机数据源 · oracle_source</h3>
        <p className="small">
          正在编辑 <b>#{selPair}</b> · 当前源：<b>{pair ? sourceName(pair.oracleSource) : "—"}</b>
          {pair && pair.oracleSource === 3 && (
            <> · feed <span className="mono">{pair.chainlinkFeedIdHex.slice(0, 10)}…</span></>
          )}
          。切换只影响新开仓；存量仓位按切换后的当前源结算（Supra 暂不支持 Solana）。
        </p>
        <div className="formgrid">
          <label>数据源
            <select value={pSource} onChange={(e) => setPSource(Number(e.target.value))}>
              <option value={0}>Pyth</option>
              <option value={1}>Switchboard</option>
              <option value={3}>Chainlink</option>
            </select>
          </label>
          {pSource === 3 && (
            <label>Chainlink feed id (32B hex)
              <input
                className="mono"
                value={pClFeed}
                onChange={(e) => setPClFeed(e.target.value)}
                placeholder="0x0003..."
              />
            </label>
          )}
          {pSource === 1 && (
            <>
              <label>Switchboard feed 账户
                <input
                  className="mono"
                  value={pSbAccount}
                  onChange={(e) => setPSbAccount(e.target.value)}
                  placeholder="PullFeed pubkey (base58)"
                />
              </label>
              <label>Switchboard feed_hash (32B hex)
                <input
                  className="mono"
                  value={pSbHash}
                  onChange={(e) => setPSbHash(e.target.value)}
                  placeholder="0x..."
                />
              </label>
            </>
          )}
        </div>
        <button
          disabled={busy || noAdmin || !pair}
          onClick={() =>
            run(
              `switch oracle #${selPair} → ${sourceName(pSource)}`,
              () =>
                actions.updatePair(ctx, selPair, {
                  oracleSource: pSource,
                  chainlinkFeedIdHex: pSource === 3 ? pClFeed : undefined,
                  switchboardFeedAccountB58: pSource === 1 ? pSbAccount : undefined,
                  switchboardFeedHashHex: pSource === 1 ? pSbHash : undefined,
                }),
              true
            )
          }
        >
          切换 #{selPair} 数据源 → {sourceName(pSource)}
        </button>

        <h3 className="sub-h">注册新交易对 · register_pair</h3>
        <p className="small">
          pair_id 全局唯一（已自动填最小可用）。feed id 见{" "}
          <a href="https://www.pyth.network/developers/price-feed-ids" target="_blank" rel="noreferrer">price-feed-ids</a>
          （已预填 ETH/USD）。keeper 无需改动即可成交。
        </p>
        <p className="small" style={{ color: "#d29922" }}>
          ⚠ 交易对<b>不绑定结算币</b>（PairConfig seed 只含 pair_id，无 settle_mint）。注册后<b>所有已初始化的结算币</b>
          （当前 {mints.length} 个）都能用它交易；用哪种抵押品由用户在交易页顶部「结算币」下拉选择。
        </p>
        <div className="formgrid">
          <label>pair_id
            <input value={rId} onChange={(e) => setRId(e.target.value)} />
          </label>
          <label>名称
            <input value={rName} onChange={(e) => setRName(e.target.value)} />
          </label>
          <label>默认杠杆 (x)
            <input value={rLev} onChange={(e) => setRLev(e.target.value)} />
          </label>
          <label>手续费率 (%)
            <input value={rFee} onChange={(e) => setRFee(e.target.value)} />
          </label>
          <label>最小下单
            <input value={rMin} onChange={(e) => setRMin(e.target.value)} />
          </label>
          <label>价格新鲜度 (秒)
            <input value={rStale} onChange={(e) => setRStale(e.target.value)} />
          </label>
        </div>
        <label style={{ display: "block", marginBottom: 10 }}>Pyth feed id (32字节 hex)
          <input className="mono" style={{ width: "100%" }} value={rFeed} onChange={(e) => setRFeed(e.target.value)} />
        </label>
        <button
          disabled={busy || noAdmin}
          onClick={() =>
            run(`注册交易对 #${rId} ${rName}`, () =>
              actions.registerPair(ctx, {
                pairId: Number(rId),
                name: rName,
                feedHex: rFeed,
                leverageX: rLev,
                feeRatePct: rFee,
                minOrderAmount: rMin,
                maxStalenessSecs: rStale,
                status: 0,
              })
            )
          }
        >
          注册交易对
        </button>
      </section>

      {/* ───── ④ 流动性池（当前结算币）───── */}
      <section className="card">
        <h2>④ 流动性池 · {settleLabel(ctx.mint.toBase58())}</h2>
        <p className="small">
          当前结算币 <b>{settleLabel(ctx.mint.toBase58())}</b> 的资金池与做市账户。要管理其它结算币的池，请在用户页顶部切换结算币。
        </p>
        {pool ? (
          <div className="grid" style={{ margin: "12px 0" }}>
            <Stat label="池类型" v={POOL_TYPE[pool.poolType] ?? String(pool.poolType)} />
            <Stat label="状态" v={POOL_STATUS[pool.status] ?? String(pool.status)} />
            <Stat label="私有最小入金" v={fmt(pool.privateMinProvide, decimals)} />
            <Stat label="总锁定流动性" v={fmt(pool.totalLockedLiquidity, decimals)} />
          </div>
        ) : (
          <p className="small">该结算币的池未初始化（在 ② 添加结算币）。</p>
        )}

        <h3 className="sub-h">池配置 · update_pool_config</h3>
        <div className="formgrid">
          <label>池类型
            <select value={poolType} onChange={(e) => setPoolType(Number(e.target.value))}>
              <option value={1}>1 · PUBLIC</option>
              <option value={2}>2 · PRIVATE</option>
              <option value={3}>3 · MIXED</option>
              <option value={4}>4 · REFUSE</option>
            </select>
          </label>
          <label>状态
            <select value={poolStatus} onChange={(e) => setPoolStatus(Number(e.target.value))}>
              <option value={0}>0 · active</option>
              <option value={1}>1 · paused</option>
              <option value={2}>2 · offline</option>
            </select>
          </label>
          <label>私有最小入金 ({settleLabel(ctx.mint.toBase58())})
            <input value={poolMin} onChange={(e) => setPoolMin(e.target.value)} />
          </label>
        </div>
        <button
          disabled={busy || noAdmin || !pool}
          onClick={() =>
            run("update_pool_config", () =>
              actions.updatePoolConfig(ctx, { status: poolStatus, poolType, privateMinUsdc: poolMin })
            )
          }
        >
          保存池配置
        </button>

        <h3 className="sub-h">做市账户（LP）· {lps.length} 个</h3>
        <p className="small">每个钱包一个 LpAccount（私有 maker）+ 公共池 escrow。等价于 EVM PrivatePool 里的 lpAccount[maker] 映射。</p>
        {lps.length === 0 ? (
          <p className="small">暂无</p>
        ) : (
          <table>
            <thead>
              <tr><th>holder</th><th>本金</th><th>可用</th><th>锁定</th><th>杠杆</th><th>接单</th></tr>
            </thead>
            <tbody>
              {lps.map((l) => (
                <tr key={l.holder}>
                  <td className="mono">{short(l.holder)}</td>
                  <td>{fmt(l.amount, decimals)}</td>
                  <td>{fmt(l.available, decimals)}</td>
                  <td>{fmt(l.locked, decimals)}</td>
                  <td>{l.leverageX}x</td>
                  <td>{l.rejectOrder ? "暂停" : "正常"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
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
