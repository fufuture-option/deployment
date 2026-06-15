// =====================================================================
// index.ts — barrel（仅 demo UI 方便用 `import * as api from "./index"`）
//
// 同事接入时**不需要**这个 barrel —— 他直接按需 import 四个方法文件：
//   reads-user / reads-admin（拉取，PullCtx）   ops-user / ops-admin（签名，SignCtx）
// 以及基础设施 ctx / 配置 config / PDA pdas。
// =====================================================================
export * from "./solana";
export * from "./config";
export * from "./reads-user";
export * from "./reads-admin";
export * from "./ops-user";
export * from "./ops-admin";
