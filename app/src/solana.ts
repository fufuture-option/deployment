// =====================================================================
// solana.ts — 基础设施层（被 reads-*/ops-* 共用）
//
// 两个上下文：
//   PullCtx { connection, wallet, mint, programs, pda }                 — 只读
//   SignCtx { phantom, connection, wallet, mint, perp,lp,treasury, programs, pda } — 写
// SignCtx 结构上是 PullCtx 的超集；写方法里可直接把 signCtx 当 PullCtx 传给读方法。
//
// req1：数值统一用 ethers v5 `BigNumber`（对齐同事 SldDecimal/ethers 栈）。
// req3：程序 ID（perp/lp/treasury）+ 默认 mint 动态注入 —— 经 builders 传入，绑定到 ctx.pda
//        与 ctx.programs；config 里的常量只作为 builders 的默认值。
// 读方法不依赖 Program：用 IDL 现场构建 BorshCoder（perpCoder/lpCoder）解码。
// =====================================================================
import { AnchorProvider, BN, BorshCoder, Program, utils, web3 } from "@anchor-lang/core";
import { BigNumber } from "ethers";
import { PERP_CORE, LIQUIDITY_POOL, TREASURY, USDC_MINT } from "./config";
import { createPdas, Pdas, ProgramIds } from "./pdas";
import perpIdl from "./idl/perp_core.json";
import lpIdl from "./idl/liquidity_pool.json";
import treasuryIdl from "./idl/treasury.json";
import type { PerpCore } from "./types/perp_core";
import type { LiquidityPool } from "./types/liquidity_pool";
import type { Treasury } from "./types/treasury";

const { Connection, Transaction, PublicKey } = web3;
type Connection = web3.Connection;
type PublicKey = web3.PublicKey;
type TransactionInstruction = web3.TransactionInstruction;

// Re-export the Anchor-generated program types + handy aliases + pda types.
export type { PerpCore, LiquidityPool, Treasury };
export type { Pdas, ProgramIds };
export type PerpProgram = Program<PerpCore>;
export type LpProgram = Program<LiquidityPool>;
export type TreasuryProgram = Program<Treasury>;

// ---------------------------------------------------------------------
// Phantom wallet
// ---------------------------------------------------------------------
export interface Phantom {
  publicKey: PublicKey | null;
  isPhantom?: boolean;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  signTransaction(tx: web3.Transaction): Promise<web3.Transaction>;
  signAllTransactions(txs: web3.Transaction[]): Promise<web3.Transaction[]>;
  signAndSendTransaction(tx: web3.Transaction): Promise<{ signature: string }>;
}

export function getPhantom(): Phantom {
  const w = (window as any).solana as Phantom | undefined;
  if (!w || !w.isPhantom) {
    throw new Error("Phantom wallet not found. Install it from https://phantom.app");
  }
  return w;
}

// Minimal wallet adapter so Anchor can build a Program (only used to encode ixs).
class PhantomWalletAdapter {
  constructor(private phantom: Phantom) {}
  get publicKey() {
    return this.phantom.publicKey!;
  }
  signTransaction(tx: web3.Transaction) {
    return this.phantom.signTransaction(tx);
  }
  signAllTransactions(txs: web3.Transaction[]) {
    return this.phantom.signAllTransactions(txs);
  }
}

// ---------------------------------------------------------------------
// 两个上下文形状
// ---------------------------------------------------------------------
export interface PullCtx {
  connection: Connection;
  wallet: PublicKey;
  mint: PublicKey; // active settle currency (collateral); defaults to USDC.
  programs: ProgramIds; // injected program IDs (perp/lp/treasury)
  pda: Pdas; // PDA helper bound to programs + mint
}

export interface SignCtx {
  phantom: Phantom;
  connection: Connection;
  wallet: PublicKey;
  mint: PublicKey;
  perp: PerpProgram;
  lp: LpProgram;
  treasury: TreasuryProgram;
  programs: ProgramIds;
  pda: Pdas;
}

// builder 选项：覆盖默认 mint / 程序 ID（不传 = 用 config 默认）。
export interface CtxOpts {
  mint?: PublicKey;
  programs?: Partial<ProgramIds>;
}
const resolvePrograms = (p?: Partial<ProgramIds>): ProgramIds => ({
  perp: p?.perp ?? PERP_CORE,
  lp: p?.lp ?? LIQUIDITY_POOL,
  treasury: p?.treasury ?? TREASURY,
});

// ---------------------------------------------------------------------
// Connection 构建（单节点：公共 devnet）
// 已取消 Alchemy 主 + fallback 双节点分流；所有 RPC（含 getProgramAccounts）走同一节点。
// 默认公共 devnet（RPC_FALLBACK），可经 VITE_RPC_FALLBACK 覆盖。
// ---------------------------------------------------------------------
import { RPC_FALLBACK } from "./config";
export function makeConnection(): Connection {
  return new Connection(RPC_FALLBACK, "confirmed");
}

// ---------------------------------------------------------------------
// 上下文 builders（同事可传 opts 注入自己的程序 ID / mint；不传 = config 默认）
// ---------------------------------------------------------------------
// Patch idl.address so a (possibly overridden) program id is used (default = idl's own).
const withAddr = (idl: any, addr: PublicKey) => ({ ...idl, address: addr.toBase58() });

export function makeSignCtx(phantom: Phantom, opts?: CtxOpts): SignCtx {
  const connection = makeConnection();
  const programs = resolvePrograms(opts?.programs);
  const mint = opts?.mint ?? USDC_MINT;
  const provider = new AnchorProvider(connection, new PhantomWalletAdapter(phantom) as any, {
    commitment: "confirmed",
  });
  const perp = new Program<PerpCore>(withAddr(perpIdl, programs.perp) as PerpCore, provider);
  const lp = new Program<LiquidityPool>(withAddr(lpIdl, programs.lp) as LiquidityPool, provider);
  const treasury = new Program<Treasury>(withAddr(treasuryIdl, programs.treasury) as Treasury, provider);
  return {
    phantom,
    connection,
    wallet: phantom.publicKey!,
    mint,
    perp,
    lp,
    treasury,
    programs,
    pda: createPdas(programs, mint),
  };
}

export function makePullCtx(connection: Connection, wallet: PublicKey, opts?: CtxOpts): PullCtx {
  const programs = resolvePrograms(opts?.programs);
  const mint = opts?.mint ?? USDC_MINT;
  return { connection, wallet, mint, programs, pda: createPdas(programs, mint) };
}

// Switch the active settle currency (reuses connection/programs; rebuilds the mint-bound pda).
export function withMint<T extends { mint: PublicKey; programs: ProgramIds; pda: Pdas }>(
  ctx: T,
  mint: PublicKey
): T {
  return { ...ctx, mint, pda: createPdas(ctx.programs, mint) };
}

// ---------------------------------------------------------------------
// 发交易 + 确认
// ---------------------------------------------------------------------
export async function confirm(connection: Connection, sig: string, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const st = (await connection.getSignatureStatuses([sig])).value[0];
    if (st) {
      if (st.err) throw new Error("tx failed: " + JSON.stringify(st.err));
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") return;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error("confirmation timeout: " + sig);
}

// Bundle instructions into one tx, let Phantom sign+send, then confirm.
export async function sendIxs(ctx: SignCtx, ixs: TransactionInstruction[]): Promise<string> {
  const tx = new Transaction();
  ixs.forEach((ix) => tx.add(ix));
  tx.feePayer = ctx.wallet;
  tx.recentBlockhash = (await ctx.connection.getLatestBlockhash("confirmed")).blockhash;
  const { signature } = await ctx.phantom.signAndSendTransaction(tx);
  await confirm(ctx.connection, signature);
  return signature;
}

// ---------------------------------------------------------------------
// IDL coders（读方法专用：无需 Program 即可解码账户/事件）
// ---------------------------------------------------------------------
export const perpCoder = new BorshCoder(perpIdl as any);
export const lpCoder = new BorshCoder(lpIdl as any);
export const treasuryCoder = new BorshCoder(treasuryIdl as any);

// snake_case → camelCase（standalone BorshCoder 解出来是 snake_case；递归，保留 BN/PublicKey/Buffer）
const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
export function camelizeKeys(v: any): any {
  if (Array.isArray(v)) return v.map(camelizeKeys);
  if (v && typeof v === "object" && v.constructor === Object) {
    const out: any = {};
    for (const k of Object.keys(v)) out[toCamel(k)] = camelizeKeys(v[k]);
    return out;
  }
  return v;
}

export async function fetchAcct<T = any>(
  connection: Connection,
  coder: BorshCoder,
  name: string,
  pk: PublicKey
): Promise<T | null> {
  const ai = await connection.getAccountInfo(pk);
  return ai ? (camelizeKeys(coder.accounts.decode(name, ai.data)) as T) : null;
}

export async function allAccts<T = any>(
  connection: Connection,
  coder: BorshCoder,
  program: PublicKey,
  name: string
): Promise<{ pubkey: PublicKey; account: T }[]> {
  const disc = coder.accounts.accountDiscriminator(name);
  const accts = await connection.getProgramAccounts(program, {
    filters: [{ memcmp: { offset: 0, bytes: utils.bytes.bs58.encode(disc) } }],
  });
  return accts.map(({ pubkey, account }) => ({
    pubkey,
    account: camelizeKeys(coder.accounts.decode(name, account.data)) as T,
  }));
}

// ---------------------------------------------------------------------
// 数值工具（req1：统一 ethers v5 BigNumber）
// ---------------------------------------------------------------------
// Anchor 1.0 strictly types `.accountsStrict/.accountsPartial`; pass the full devnet-
// verified account set and cast the literal to bypass that type friction.
export const A = (o: Record<string, PublicKey | null>) => o as any;

// decimal string -> base units (BigNumber, no float; truncates excess fraction digits)
export function toUnits(s: string, decimals: number): BigNumber {
  s = (s || "").trim();
  if (!s) return BigNumber.from(0);
  const [i, f = ""] = s.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  const v = BigInt(i || "0") * 10n ** BigInt(decimals) + BigInt(frac || "0");
  return BigNumber.from(v.toString());
}
export function fromUnits(v: BigNumber, decimals: number): string {
  let big = BigInt(v.toString());
  const neg = big < 0n;
  if (neg) big = -big;
  const base = 10n ** BigInt(decimals);
  const whole = big / base;
  const frac = (big % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + whole.toString() + (frac ? "." + frac : "");
}

// Anchor BN from anything stringifiable (BigNumber / bigint / number / string).
export const bn = (v: BigNumber | bigint | number | string) => new BN(v.toString());
// Wrap an Anchor-decoded value (BN/number/string) into a BigNumber.
export const big = (v: any): BigNumber => BigNumber.from(v.toString());

// little-endian readers → BigNumber
export const u64 = (b: Buffer, o: number): BigNumber =>
  BigNumber.from(b.readBigUInt64LE(o).toString());
export const readU128LE = (b: Buffer, o: number): BigNumber => {
  let v = 0n;
  for (let i = 0; i < 16; i++) v += BigInt(b[o + i]) << (8n * BigInt(i));
  return BigNumber.from(v.toString());
};

export async function exists(ctx: { connection: Connection }, k: PublicKey): Promise<boolean> {
  return (await ctx.connection.getAccountInfo(k)) !== null;
}

// SPL Mint decimals (byte @ offset 44), cached per mint.
const _decimalsCache = new Map<string, number>();
export async function mintDecimals(connection: Connection, mint: PublicKey): Promise<number> {
  const key = mint.toBase58();
  const hit = _decimalsCache.get(key);
  if (hit !== undefined) return hit;
  const ai = await connection.getAccountInfo(mint);
  if (!ai) throw new Error("mint 不存在: " + key);
  const d = ai.data[44];
  _decimalsCache.set(key, d);
  return d;
}
