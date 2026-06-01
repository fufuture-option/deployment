import { AnchorProvider, Program, web3 } from "@anchor-lang/core";
import { RPC_URL, PERP_CORE, LIQUIDITY_POOL } from "./config";
import perpIdl from "./idl/perp_core.json";
import lpIdl from "./idl/liquidity_pool.json";

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
  perp: Program;
  lp: Program;
}

export function makeCtx(phantom: Phantom): Ctx {
  const connection = new Connection(RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, new PhantomWalletAdapter(phantom) as any, {
    commitment: "confirmed",
  });
  const perp = new Program(perpIdl as any, provider);
  const lp = new Program(lpIdl as any, provider);
  return { connection, phantom, wallet: phantom.publicKey!, perp, lp };
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
