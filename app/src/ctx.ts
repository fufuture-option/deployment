// =====================================================================
// ctx.ts — 基础设施层（被 reads-*/ops-* 共用）
//
// 两个上下文：
//   PullCtx { connection, wallet, mint }                      — 只读，不含 Program
//   SignCtx { phantom, connection, wallet, mint, perp,lp,treasury } — 写操作，含 Anchor Program
// SignCtx 结构上是 PullCtx 的超集，所以写方法里可直接把 signCtx 当 PullCtx 传给读方法。
//
// 读方法不依赖 Program：本文件用 IDL 现场构建 BorshCoder（perpCoder/lpCoder），
// 读方法用它解码 getAccountInfo/getProgramAccounts 的原始字节、以及 EventParser 解析日志。
// =====================================================================
import { AnchorProvider, BN, BorshCoder, Program, utils, web3 } from "@anchor-lang/core";
import {
  RPC_URL,
  RPC_FALLBACK,
  PERP_CORE,
  LIQUIDITY_POOL,
  USDC_MINT,
} from "./config";
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

// Re-export the Anchor-generated program types + handy aliases.
export type { PerpCore, LiquidityPool, Treasury };
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
}

export interface SignCtx {
  phantom: Phantom;
  connection: Connection;
  wallet: PublicKey;
  mint: PublicKey;
  perp: PerpProgram;
  lp: LpProgram;
  treasury: TreasuryProgram;
}

// ---------------------------------------------------------------------
// Connection 构建（Alchemy 主 + 公共 fallback 兜 getProgramAccounts）
// ---------------------------------------------------------------------
// Build the primary (Alchemy) connection but route getProgramAccounts to the
// public fallback — Alchemy's free tier blocks getProgramAccounts. Everything
// else stays on the fast/high-limit primary.
export function makeConnection(): Connection {
  const primary = new Connection(RPC_URL, "confirmed");
  if (!RPC_FALLBACK || RPC_FALLBACK === RPC_URL) return primary;
  const fallback = new Connection(RPC_FALLBACK, "confirmed");
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const routeToFallback = (method: "getProgramAccounts" | "getProgramAccountsWithOpts") => {
    const orig = (fallback as any)[method];
    if (typeof orig !== "function") return; // method not present in this web3.js build
    const fn = orig.bind(fallback);
    (primary as any)[method] = async (...args: any[]) => {
      let delay = 600;
      for (let attempt = 0; ; attempt++) {
        try {
          return await fn(...args);
        } catch (e: any) {
          const is429 = /429|too many requests/i.test(String(e?.message || e));
          if (attempt >= 2 || !is429) throw e;
          await sleep(delay);
          delay *= 2; // 600ms -> 1.2s -> 2.4s
        }
      }
    };
  };
  routeToFallback("getProgramAccounts");
  routeToFallback("getProgramAccountsWithOpts");
  return primary;
}

// ---------------------------------------------------------------------
// 上下文 builders（同事也可在自己 wallet 层自行拼装这两个对象）
// ---------------------------------------------------------------------
// Build a SignCtx from a connected Phantom. Builds the 3 Anchor Programs (these are
// what signCtx.perp/lp/treasury are). mint defaults to USDC (admin pins USDC; the
// user-page settle selector passes another mint here / via withMint).
export function makeSignCtx(phantom: Phantom, mint: PublicKey = USDC_MINT): SignCtx {
  const connection = makeConnection();
  const provider = new AnchorProvider(connection, new PhantomWalletAdapter(phantom) as any, {
    commitment: "confirmed",
  });
  // Type from types/*.ts; runtime IDL data from idl/*.json.
  const perp = new Program<PerpCore>(perpIdl as PerpCore, provider);
  const lp = new Program<LiquidityPool>(lpIdl as LiquidityPool, provider);
  const treasury = new Program<Treasury>(treasuryIdl as Treasury, provider);
  return { phantom, connection, wallet: phantom.publicKey!, mint, perp, lp, treasury };
}

// Build a read-only PullCtx (no Program needed). Reuse an existing connection when you
// have one (e.g. derive a pull view from a signCtx for read calls inside a write flow).
export function makePullCtx(
  connection: Connection,
  wallet: PublicKey,
  mint: PublicKey = USDC_MINT
): PullCtx {
  return { connection, wallet, mint };
}

// Switch the active settle currency on an existing ctx (reuses connection/programs —
// only the mint changes). Generic over PullCtx/SignCtx.
export function withMint<T extends { mint: PublicKey }>(ctx: T, mint: PublicKey): T {
  return { ...ctx, mint };
}

// ---------------------------------------------------------------------
// 发交易 + 确认
// ---------------------------------------------------------------------
// HTTP-poll confirmation (avoids relying on WS signatureSubscribe).
export async function confirm(connection: Connection, sig: string, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const st = (await connection.getSignatureStatuses([sig])).value[0];
    if (st) {
      if (st.err) throw new Error("tx failed: " + JSON.stringify(st.err));
      if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized")
        return;
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

// The standalone BorshCoder decodes account fields with the IDL's raw snake_case keys
// (pair_id, oracle_source, …) — unlike Anchor's `program.account.<x>.fetch()`, which
// camelCases them. We camelize so all read code (and the colleague's Program-based
// expectations) keep using camelCase (a.pairId). Recurses plain objects + arrays only;
// BN / PublicKey / Buffer values pass through untouched.
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

// Fetch one account and Borsh-decode it (null if missing). `name` is the IDL account
// name (PascalCase, e.g. "PoolConfig"); returned fields are camelCase (a.pairId).
export async function fetchAcct<T = any>(
  connection: Connection,
  coder: BorshCoder,
  name: string,
  pk: PublicKey
): Promise<T | null> {
  const ai = await connection.getAccountInfo(pk);
  return ai ? (camelizeKeys(coder.accounts.decode(name, ai.data)) as T) : null;
}

// Equivalent of Anchor's `program.account.<x>.all()` without a Program: filter the
// program's accounts by the account discriminator, then decode (camelCase) each.
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
// 共享小工具
// ---------------------------------------------------------------------
// Anchor 1.0 strictly types `.accountsStrict/.accountsPartial` against a resolver
// type that rejects explicitly passing "auto-resolvable" accounts. We pass the full,
// devnet-verified account set and cast the literal to bypass that type friction.
// Method names + args still get full type-checking from Program<...>.
export const A = (o: Record<string, PublicKey | null>) => o as any;

// decimal string -> base units (no float)
export function toUnits(s: string, decimals: number): bigint {
  s = (s || "").trim();
  if (!s) return 0n;
  const [i, f = ""] = s.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(i || "0") * 10n ** BigInt(decimals) + BigInt(frac || "0");
}
export function fromUnits(v: bigint, decimals: number): string {
  const neg = v < 0n;
  if (neg) v = -v;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + whole.toString() + (frac ? "." + frac : "");
}

export const bn = (v: bigint) => new BN(v.toString());
export const big = (v: any): bigint => BigInt(v.toString());

export const readU128LE = (b: Buffer, o: number): bigint => {
  let v = 0n;
  for (let i = 0; i < 16; i++) v += BigInt(b[o + i]) << (8n * BigInt(i));
  return v;
};

// True if the account exists on chain. Accepts any ctx with a connection (Pull/Sign).
export async function exists(ctx: { connection: Connection }, k: PublicKey): Promise<boolean> {
  return (await ctx.connection.getAccountInfo(k)) !== null;
}

// SPL Mint decimals (byte @ offset 44), cached per mint. signCtx only carries the mint
// pubkey (per the agreed shape), so amount-scaling ops resolve decimals on demand here.
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

export const PROGRAMS = { PERP_CORE, LIQUIDITY_POOL };
