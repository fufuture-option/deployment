# SVM 前端接入说明（option-web / svmV3）

这套 demo 已按你的 4 条要求重构：**读/写拆分、用户/管理员拆分、显式 `pullCtx`/`signCtx`、`pairId` 单独传参**。
纯 `async/await`（返回 `Promise`），方法体内已处理好 9dp 三程序（perp_core / liquidity_pool / treasury）的全部细节，你直接调用即可。

## 文件清单（`app/src/`）

| 文件 | 作用 | 上下文 | 对应你项目里的位置 |
|---|---|---|---|
| `reads-user.ts` | 用户面板读取（余额/持仓/委托/成交/历史/公有池/返佣/价格） | `PullCtx` | 并入 `contract-getter-svm.ts` |
| `reads-admin.ts` | 管理员读取（全局配置/交易对/池/做市账户/结算币列表） | `PullCtx` | 并入 `contract-getter-svm.ts`（或单独 admin getter） |
| `ops-user.ts` | 用户签名操作（建池/出入金/下单/平仓/撤单/杠杆/返佣） | `SignCtx` | 填进 `fu-contract-trade-svm.service.ts` / `fu-contract-liquidity-svm.service.ts` |
| `ops-admin.ts` | 管理员签名操作（updatePair/registerPair/加结算币/转 admin/池配置） | `SignCtx` | 新建 `fu-contract-admin-svm.service.ts` |
| `ctx.ts` | 基础设施：两个上下文类型 + builders + `sendIxs`/`confirm` + IDL coders + 小工具 | — | 并入 `wallet/solana*.ts` 或单独 util |
| `config.ts` | 程序 ID / USDC / 交易对(PAIRS) / `feedHexByPair` 等 | — | 并入你的 `config/` |
| `pdas.ts` | 全部 PDA 推导（已按 `(owner, pairId, mint)` 参数化） | — | 直接复用 |
| `idl/`, `types/` | 三程序 IDL + 生成的 TS 类型 | — | 你已有，保持同步即可 |

> `index.ts` 只是 demo UI 图省事的 barrel，你接入时**不需要**，按需 import 上面的文件即可。

## 两个上下文

```ts
interface PullCtx { connection: Connection; wallet: PublicKey; mint: PublicKey; }
interface SignCtx { phantom; connection; wallet; mint; perp; lp; treasury; } // perp/lp/treasury 是 Anchor Program
```

- **`SignCtx` 是 `PullCtx` 的超集** —— 在写操作里要顺便读数据时，直接把 `signCtx` 当 `PullCtx` 传给读方法即可（TS 结构化类型放行）。
- `pullCtx` **不含 Program**：读取层用 `ctx.ts` 里从 IDL 现场构建的 `BorshCoder` 解码，因此读取不需要钱包/Provider。
- 从你现有 `wallet/solana.ts` 拼装（`(window as any).solana` = phantom、`new Connection(...)`、`resp.publicKey` = wallet）：

```ts
import { makeSignCtx, makePullCtx } from "./ctx";
const signCtx = makeSignCtx(phantom /*, mint?*/);          // 内部 new 三个 Program，mint 默认 USDC
const pullCtx = makePullCtx(connection, wallet /*, mint?*/);
// 也可不用 builder，自己拼对象，字段对上即可。
```

## 签名约定：pairId 单独传

按交易对作用域的方法，`pairId` 永远是 **ctx 之后第 1 个位置参数**：

```ts
// targetPrice 由你传入（BigNumber，1e9 精度）；orderSeq 等返回值也是 BigNumber。
await placeLimitOrder(signCtx, pairId, { direction:1, amountBtc:"0.001", targetPrice, rewardGasSol:"0.002", goodTillMinutes:60 });
await setUserLeverage(signCtx, pairId, "20");
await cancelOrder(signCtx, pairId, orderSeq /* BigNumber */, direction, orderKind);
const positions = await getMyPositions(pullCtx, pairId);
const trades    = await getTradeHistoryPaged(pullCtx, pairId, before, 25);
```

非交易对方法（deposit/withdraw/池子/返佣/余额）不带 pairId。

## 包进你的 RxJS service

方法是 `Promise`，用 `from()` 一行即可变 `Observable`：

```ts
import { from } from "rxjs";
public openOrderLimit(pairId:number, p) { return from(placeLimitOrder(this.signCtx, pairId, p)); }
```

## 数值：统一 ethers v5 BigNumber（req1）

所有合约数值（余额/持仓/委托/价格/份额 等的**接口字段、参数、返回值**）都是 **ethers v5 `BigNumber`**，直接喂 `SldDecimal.fromE18/fromOrigin` 即可。比较/运算用 `.lte/.gt/.isZero/.add/.mul/.div`。`toUnits(str, decimals)` 返回 BigNumber、`fromUnits(bn, decimals)` 返回字符串。内部传给合约的 Anchor `BN` 由 `bn()` 统一转换（接受 BigNumber/bigint/number/string）。demo 已加 `ethers@^5.x` 依赖；你项目本来就有。

## 价格：placeLimitOrder 由调用方传 targetPrice（req2）

`placeLimitOrder(signCtx, pairId, { ..., targetPrice })` 的 `targetPrice` 是 **BigNumber（1e9 精度）**，由你用自己的价格服务（如 `fu-price.service` 的 `getPriceData`）算好传入。**已删除** `reads-user` 里的 `fetchOraclePriceE9`（不再内部拉 Pyth）。`fetchHermesPrice`（仅 demo 显示用）保留，你可忽略。

## 地址：程序 ID 动态注入（req3）

`PERP_CORE/LIQUIDITY_POOL/TREASURY/USDC_MINT` 不再硬编码进 `pdas`/`reads`。改由 **builder 注入**：

```ts
makeSignCtx(phantom, { programs: { perp, lp, treasury }, mint });  // 不传 = 用 config 默认（demo 用）
makePullCtx(connection, wallet, { programs, mint });
```

注入后挂在 `ctx.programs`（三个 PublicKey）与 `ctx.pda`（绑定了程序 ID + 默认 mint 的 PDA 工厂）；`reads` 的 `getProgramAccounts` 用 `ctx.programs.perp/lp`，所有 PDA 走 `ctx.pda.X(...)`。`config.ts` 仍导出这 4 个常量，仅作为 builder 默认值。`withMint(ctx, mint)` 会自动重建 `ctx.pda`。SPL 的 `TOKEN_PROGRAM`/`ASSOCIATED_TOKEN_PROGRAM` 是固定系统程序，未参与注入。

## 注意点

- **金额参数是“人类可读字符串”**（如 `"20"`、`"0.001"`）。写操作内部用 `mintDecimals(connection, mint)`（读 mint 账户、带缓存）换算精度，所以 `signCtx` 只带 `mint` 不带 decimals。合约数量统一 1e9，USDC 6 位。
- **读取层已自动处理大小写**：standalone `BorshCoder` 解出来的账户字段是 snake_case、事件名是 PascalCase + 字段 snake_case；`ctx.ts` 的 `fetchAcct`/`allAccts` 和 `reads-user` 的 `normEvents` 已统一转成 camelCase（`a.pairId`/`ev.name==="orderHistory"`/`d.costPrice`），你拿到的就是 camelCase。
- **getProgramAccounts**：Alchemy 免费档封了 gPA，`ctx.ts` 的 `makeConnection` 已把 gPA 路由到公共 devnet 兜底；列表类读取（持仓/委托/`listPairs` 等）依赖它。你自管 connection 时注意同样处理。
- **web3 版本**：上下文用的 `Connection`/`PublicKey` 来自 `@anchor-lang/core` 的 `web3`（即 `@solana/web3.js` 的再导出）。确保项目里 `@solana/web3.js` 单版本 hoist。

## 验证

demo 自身 `npx tsc --noEmit` + `npx vite build` 均零错误；读取层（账户解码 + 事件解析）已对 devnet 实测解码正确。
