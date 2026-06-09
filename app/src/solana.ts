import { AnchorProvider, Program, web3 } from "@anchor-lang/core";
import { RPC_URL, RPC_FALLBACK, PERP_CORE, LIQUIDITY_POOL, USDC_MINT, USDC_DECIMALS, settleLabel, PAIRS, PairOption } from "./config";
import perpIdl from "./idl/perp_core.json";
import lpIdl from "./idl/liquidity_pool.json";
import treasuryIdl from "./idl/treasury.json";
import type { PerpCore } from "./types/perp_core";
import type { LiquidityPool } from "./types/liquidity_pool";
import type { Treasury } from "./types/treasury";

// Re-export the Anchor-generated program types for use across the app.
export type { PerpCore, LiquidityPool };
export type PerpProgram = Program<PerpCore>;
export type LpProgram = Program<LiquidityPool>;

const { Connection, Transaction, PublicKey } = web3;
type PublicKey = web3.PublicKey;
type TransactionInstruction = web3.TransactionInstruction;

// ---- Phantom wallet ----
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

export interface Ctx {
  connection: web3.Connection;
  phantom: Phantom;
  wallet: PublicKey;
  perp: Program<PerpCore>;
  lp: Program<LiquidityPool>;
  treasury: Program<Treasury>;
  // active settle currency (collateral). User-page selector switches these;
  // admin actions pin USDC explicitly. Defaults to USDC.
  mint: PublicKey;
  mintDecimals: number;
  settleName: string;
  // active trading pair (user-page selector switches these). Defaults to PAIRS[0].
  pairId: number;
  pairName: string;
  pythFeedHex: string;
}

// Build the primary (Alchemy) connection but route getProgramAccounts to the
// public fallback — Alchemy's free tier blocks getProgramAccounts. Everything
// else (getAccountInfo, getMultipleAccounts, getTransaction, sendRawTransaction,
// blockhash, signature statuses) stays on the fast/high-limit primary.
function makeConnection(): web3.Connection {
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

export function makeCtx(
  phantom: Phantom,
  mint: PublicKey = USDC_MINT,
  mintDecimals: number = USDC_DECIMALS,
  pair: PairOption = PAIRS[0]
): Ctx {
  const connection = makeConnection();
  const provider = new AnchorProvider(connection, new PhantomWalletAdapter(phantom) as any, {
    commitment: "confirmed",
  });
  // Type from target/types/*.ts; runtime IDL data from target/idl/*.json.
  const perp = new Program<PerpCore>(perpIdl as PerpCore, provider);
  const lp = new Program<LiquidityPool>(lpIdl as LiquidityPool, provider);
  const treasury = new Program<Treasury>(treasuryIdl as Treasury, provider);
  return {
    connection,
    phantom,
    wallet: phantom.publicKey!,
    perp,
    lp,
    treasury,
    mint,
    mintDecimals,
    settleName: settleLabel(mint.toBase58()),
    pairId: pair.id,
    pairName: pair.name,
    pythFeedHex: pair.pythFeedHex,
  };
}

// Return a shallow copy of ctx switched to another settle currency (reuses the
// same connection + Program objects — only the active mint/decimals change).
export function withMint(ctx: Ctx, mint: PublicKey, mintDecimals: number): Ctx {
  return { ...ctx, mint, mintDecimals, settleName: settleLabel(mint.toBase58()) };
}

// Switch the active trading pair on an existing ctx (keeps connection/programs).
export function withPair(ctx: Ctx, pair: PairOption): Ctx {
  return { ...ctx, pairId: pair.id, pairName: pair.name, pythFeedHex: pair.pythFeedHex };
}

// HTTP-poll confirmation (avoids relying on WS signatureSubscribe).
export async function confirm(connection: web3.Connection, sig: string, timeoutMs = 60000) {
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
export async function sendIxs(ctx: Ctx, ixs: TransactionInstruction[]): Promise<string> {
  const tx = new Transaction();
  ixs.forEach((ix) => tx.add(ix));
  tx.feePayer = ctx.wallet;
  tx.recentBlockhash = (await ctx.connection.getLatestBlockhash("confirmed")).blockhash;
  const { signature } = await ctx.phantom.signAndSendTransaction(tx);
  await confirm(ctx.connection, signature);
  return signature;
}

export const PROGRAMS = { PERP_CORE, LIQUIDITY_POOL };
