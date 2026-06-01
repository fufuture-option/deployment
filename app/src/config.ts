import { web3 } from "@anchor-lang/core";
const { PublicKey } = web3;

// --- Cluster ---
export const RPC_URL =
  (import.meta.env.VITE_RPC as string) || "https://api.devnet.solana.com";

// --- Program IDs (devnet) ---
export const PERP_CORE = new PublicKey("9HGtSs3a9EhLK18PbCHXf5g3uvC4ZtJPk6jPXd6iEap9");
export const LIQUIDITY_POOL = new PublicKey("7ekS1N6HZRwgkPsrpGbLUsbSqTnGZm3hbc2tjuEPbLuD");

// --- Settle token (test USDC on devnet, 6 decimals) ---
export const USDC_MINT = new PublicKey("CRbjxMGWuogWLNTNuPqhrqmgKewWG99KW2DPg4zKZUQF");
export const USDC_DECIMALS = 6;

// --- Trading pair (registered on devnet with the current program layout) ---
export const PAIR_ID = 1;
export const PAIR_NAME = "BTC/USD";
export const PYTH_FEED_ID =
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
// Hermes price endpoint (used only to show the live price for context)
export const HERMES_URL = "https://hermes.pyth.network";

// --- SPL / system ---
export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

export const E18 = 10n ** 18n;
