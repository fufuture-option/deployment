import { web3 } from "@anchor-lang/core";
const { PublicKey } = web3;

// --- Cluster ---
// Primary RPC: Alchemy (fast, high limits) for everything EXCEPT getProgramAccounts.
// Fallback RPC: public devnet — used for getProgramAccounts (Alchemy free blocks it)
// and as a backup. Override either via VITE_RPC / VITE_RPC_FALLBACK.
export const RPC_URL =
  (import.meta.env.VITE_RPC as string) ||
  "https://solana-devnet.g.alchemy.com/v2/nOASmU1uqpL4UUTuxtbX3r9rrdJKYeKv";
export const RPC_FALLBACK =
  (import.meta.env.VITE_RPC_FALLBACK as string) || "https://api.devnet.solana.com";

// --- Program IDs (devnet) ---
export const PERP_CORE = new PublicKey("9xFsNHYCBk1Zhar6ukRDrUyDipQS2zE9wDcFHj29q4t3");
export const LIQUIDITY_POOL = new PublicKey("2zRgfaNK4DCbbjHkd5pfaE9vwv9gnAP5DdeNDU8VWoTE");
export const TREASURY = new PublicKey("JAX56qnm1CXf1zsMCfPAEscDLxgEZnYkNW7hsSdNX9xY");

// --- Settle token (test USDC on devnet, 6 decimals) ---
export const USDC_MINT = new PublicKey("CRbjxMGWuogWLNTNuPqhrqmgKewWG99KW2DPg4zKZUQF");
export const USDC_DECIMALS = 6;

// --- Trading pairs (registered on devnet) ---
export interface PairOption {
  id: number;
  name: string;
  pythFeedHex: string; // Pyth feed for the live price display + limit target
}
// User-page selectable pairs (hardcoded for now): BTC=pair1(Pyth), ETH=pair2(Chainlink).
// The keeper settles each pair via its configured oracle; the frontend only needs the
// Pyth feed for the display price + the make_limit_order target.
export const PAIRS: PairOption[] = [
  { id: 1, name: "BTC/USD", pythFeedHex: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" },
  { id: 2, name: "ETH/USD", pythFeedHex: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" },
];
// Backward-compat defaults (= PAIRS[0]); active pair now flows through Ctx.
export const PAIR_ID = PAIRS[0].id;
export const PAIR_NAME = PAIRS[0].name;
export const PYTH_FEED_ID = PAIRS[0].pythFeedHex;
// Hermes price endpoint (used only to show the live price for context)
export const HERMES_URL = "https://hermes.pyth.network";

// --- SPL / system ---
export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export const E18 = 10n ** 18n;

// --- Known settle-currency (collateral) labels for display ---
export const SETTLE_LABELS: Record<string, string> = {
  [USDC_MINT.toBase58()]: "USDC",
  "3hUnovN6untakLtsget2f7h1AbrDGbeARCmJ9uPcNg8L": "USDT(test)",
};
export const settleLabel = (mintBase58: string): string =>
  SETTLE_LABELS[mintBase58] || `${mintBase58.slice(0, 4)}…${mintBase58.slice(-4)}`;
