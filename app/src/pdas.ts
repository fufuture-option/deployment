import { web3 } from "@anchor-lang/core";
import {
  PERP_CORE,
  LIQUIDITY_POOL,
  TREASURY,
  USDC_MINT,
  TOKEN_PROGRAM,
  ASSOCIATED_TOKEN_PROGRAM,
} from "./config";

const { PublicKey } = web3;
type PublicKey = web3.PublicKey;

const enc = (s: string) => Buffer.from(s);
const u16le = (n: number) => Buffer.from([n & 0xff, (n >> 8) & 0xff]);
const u64le = (n: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
};

const find = (seeds: Buffer[], program: PublicKey) =>
  PublicKey.findProgramAddressSync(seeds, program)[0];

// --- perp_core PDAs ---
export const globalConfig = () => find([enc("global_config")], PERP_CORE);
export const keeperRegistry = () => find([enc("keeper_registry")], PERP_CORE);
export const settleConfig = (mint = USDC_MINT) =>
  find([enc("settle_config"), mint.toBuffer()], PERP_CORE);
export const seqCounter = (mint = USDC_MINT) =>
  find([enc("seq_counter"), mint.toBuffer()], PERP_CORE);
export const vaultToken = (mint = USDC_MINT) =>
  find([enc("vault_token"), mint.toBuffer()], PERP_CORE);
export const vaultAuthority = (mint = USDC_MINT) =>
  find([enc("vault_auth"), mint.toBuffer()], PERP_CORE);
export const riskVaultAuthority = (mint = USDC_MINT) =>
  find([enc("risk_vault_auth"), mint.toBuffer()], PERP_CORE);
export const riskVaultToken = (mint = USDC_MINT) =>
  find([enc("risk_vault_token"), mint.toBuffer()], PERP_CORE);
export const pairConfig = (pairId: number) =>
  find([enc("pair_config"), u16le(pairId)], PERP_CORE);
export const userAccount = (owner: PublicKey, mint = USDC_MINT) =>
  find([enc("user_account"), mint.toBuffer(), owner.toBuffer()], PERP_CORE);
export const userLeverage = (owner: PublicKey, pairId: number, mint = USDC_MINT) =>
  find([enc("user_leverage"), mint.toBuffer(), u16le(pairId), owner.toBuffer()], PERP_CORE);
// 审计 C-1：Position PDA seeds 必须含 owner（与链上一致），否则会读到/写到别人的共享仓位。
export const position = (owner: PublicKey, pairId: number, direction: number, mint = USDC_MINT) =>
  find([enc("position"), mint.toBuffer(), u16le(pairId), Buffer.from([direction]), owner.toBuffer()], PERP_CORE);
export const limitedOrder = (orderSeq: bigint, mint = USDC_MINT) =>
  find([enc("limited_order"), mint.toBuffer(), u64le(orderSeq)], PERP_CORE);
export const triggerCondition = (orderSeq: bigint, mint = USDC_MINT) =>
  find([enc("trigger_cond"), mint.toBuffer(), u64le(orderSeq)], PERP_CORE);

// --- liquidity_pool PDAs ---
export const poolConfig = (mint = USDC_MINT) =>
  find([enc("pool_config"), mint.toBuffer()], LIQUIDITY_POOL);
export const poolVault = (mint = USDC_MINT) =>
  find([enc("pool_vault_token"), mint.toBuffer()], LIQUIDITY_POOL);
export const poolVaultAuthority = (mint = USDC_MINT) =>
  find([enc("pool_vault_auth"), mint.toBuffer()], LIQUIDITY_POOL);
export const lpAccount = (holder: PublicKey, mint = USDC_MINT) =>
  find([enc("lp_account"), mint.toBuffer(), holder.toBuffer()], LIQUIDITY_POOL);
export const escrowAuthority = (mint = USDC_MINT) =>
  find([enc("escrow_authority"), mint.toBuffer()], LIQUIDITY_POOL);
export const publicShare = (owner: PublicKey, mint = USDC_MINT) =>
  find([enc("public_share"), mint.toBuffer(), owner.toBuffer()], LIQUIDITY_POOL);

// --- treasury PDAs (referral / commission) ---
export const inviteRelation = (invitee: PublicKey) =>
  find([enc("invite"), invitee.toBuffer()], TREASURY);
export const commissionAccount = (inviter: PublicKey, mint = USDC_MINT) =>
  find([enc("commission"), inviter.toBuffer(), mint.toBuffer()], TREASURY);
export const treasuryConfig = () => find([enc("treasury_config")], TREASURY);
export const treasuryVault = (mint = USDC_MINT) =>
  find([enc("treasury_vault_token"), mint.toBuffer()], TREASURY);
export const treasuryVaultAuthority = (mint = USDC_MINT) =>
  find([enc("treasury_vault_auth"), mint.toBuffer()], TREASURY);

// --- associated token account ---
export const ata = (owner: PublicKey, mint = USDC_MINT) =>
  find(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM
  );
