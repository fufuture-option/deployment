// =====================================================================
// pdas.ts — PDA 推导（程序 ID 动态注入）
//
// req3：不再 import config 的 PERP_CORE/LIQUIDITY_POOL/TREASURY/USDC_MINT 常量，
// 改由 createPdas(ids, defaultMint) 注入。SPL 的 TOKEN_PROGRAM / ASSOCIATED_TOKEN_PROGRAM
// 是固定系统程序（非按部署变化），直接在本文件定义（不再从 config 取）。
// ctx 在构建时调用 createPdas，得到一个绑定了程序 ID + 默认 mint 的 `pda` 对象（见 solana.ts）。
// =====================================================================
import { web3 } from "@anchor-lang/core";

const { PublicKey } = web3;
type PublicKey = web3.PublicKey;

// --- SPL / system（固定系统程序，非按部署变化）---
export const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// 注入的三套程序 ID（按部署/环境变化）。
export interface ProgramIds {
  perp: PublicKey;
  lp: PublicKey;
  treasury: PublicKey;
}

const enc = (s: string) => Buffer.from(s);
const u16le = (n: number) => Buffer.from([n & 0xff, (n >> 8) & 0xff]);
const u64le = (n: bigint) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
};
// orderSeq 可能是 BigNumber / bigint / number，统一转 bigint 写 8 字节。
const u64leOf = (v: { toString(): string }) => u64le(BigInt(v.toString()));

const find = (seeds: Buffer[], program: PublicKey) =>
  PublicKey.findProgramAddressSync(seeds, program)[0];

// Build a PDA helper bound to the given program IDs + default settle mint.
// mint args default to `defaultMint`; pass an explicit mint to override per-call.
export function createPdas(ids: ProgramIds, defaultMint: PublicKey) {
  const { perp, lp, treasury } = ids;
  const m = (mint?: PublicKey) => mint ?? defaultMint;
  return {
    // --- perp_core ---
    globalConfig: () => find([enc("global_config")], perp),
    keeperRegistry: () => find([enc("keeper_registry")], perp),
    settleConfig: (mint?: PublicKey) => find([enc("settle_config"), m(mint).toBuffer()], perp),
    seqCounter: (mint?: PublicKey) => find([enc("seq_counter"), m(mint).toBuffer()], perp),
    vaultToken: (mint?: PublicKey) => find([enc("vault_token"), m(mint).toBuffer()], perp),
    vaultAuthority: (mint?: PublicKey) => find([enc("vault_auth"), m(mint).toBuffer()], perp),
    riskVaultAuthority: (mint?: PublicKey) =>
      find([enc("risk_vault_auth"), m(mint).toBuffer()], perp),
    riskVaultToken: (mint?: PublicKey) => find([enc("risk_vault_token"), m(mint).toBuffer()], perp),
    pairConfig: (pairId: number) => find([enc("pair_config"), u16le(pairId)], perp),
    userAccount: (owner: PublicKey, mint?: PublicKey) =>
      find([enc("user_account"), m(mint).toBuffer(), owner.toBuffer()], perp),
    userLeverage: (owner: PublicKey, pairId: number, mint?: PublicKey) =>
      find([enc("user_leverage"), m(mint).toBuffer(), u16le(pairId), owner.toBuffer()], perp),
    // 审计 C-1：Position PDA seeds 必须含 owner（与链上一致）。
    position: (owner: PublicKey, pairId: number, direction: number, mint?: PublicKey) =>
      find(
        [enc("position"), m(mint).toBuffer(), u16le(pairId), Buffer.from([direction]), owner.toBuffer()],
        perp
      ),
    limitedOrder: (orderSeq: { toString(): string }, mint?: PublicKey) =>
      find([enc("limited_order"), m(mint).toBuffer(), u64leOf(orderSeq)], perp),
    triggerCondition: (orderSeq: { toString(): string }, mint?: PublicKey) =>
      find([enc("trigger_cond"), m(mint).toBuffer(), u64leOf(orderSeq)], perp),

    // --- liquidity_pool ---
    lpGlobalConfig: () => find([enc("lp_global_config")], lp),
    poolConfig: (mint?: PublicKey) => find([enc("pool_config"), m(mint).toBuffer()], lp),
    poolVault: (mint?: PublicKey) => find([enc("pool_vault_token"), m(mint).toBuffer()], lp),
    poolVaultAuthority: (mint?: PublicKey) => find([enc("pool_vault_auth"), m(mint).toBuffer()], lp),
    lpAccount: (holder: PublicKey, mint?: PublicKey) =>
      find([enc("lp_account"), m(mint).toBuffer(), holder.toBuffer()], lp),
    // 做市方接单记录（按 taker 的 deal_seq 派生）—— addMargin / getMakerDeals 用。
    makerDeal: (takerDealSeq: { toString(): string }, mint?: PublicKey) =>
      find([enc("maker_deal"), m(mint).toBuffer(), u64leOf(takerDealSeq)], lp),
    escrowAuthority: (mint?: PublicKey) => find([enc("escrow_authority"), m(mint).toBuffer()], lp),
    publicShare: (owner: PublicKey, mint?: PublicKey) =>
      find([enc("public_share"), m(mint).toBuffer(), owner.toBuffer()], lp),

    // --- treasury (referral / commission) ---
    inviteRelation: (invitee: PublicKey) => find([enc("invite"), invitee.toBuffer()], treasury),
    commissionAccount: (inviter: PublicKey, mint?: PublicKey) =>
      find([enc("commission"), inviter.toBuffer(), m(mint).toBuffer()], treasury),
    treasuryConfig: () => find([enc("treasury_config")], treasury),
    treasuryVault: (mint?: PublicKey) =>
      find([enc("treasury_vault_token"), m(mint).toBuffer()], treasury),
    treasuryVaultAuthority: (mint?: PublicKey) =>
      find([enc("treasury_vault_auth"), m(mint).toBuffer()], treasury),
    platformFeeVault: (mint?: PublicKey) =>
      find([enc("platform_vault"), m(mint).toBuffer()], treasury),
    tradeFeeVault: (mint?: PublicKey) =>
      find([enc("trade_fee_vault"), m(mint).toBuffer()], treasury),

    // --- associated token account (SPL programs are fixed, not injected) ---
    ata: (owner: PublicKey, mint?: PublicKey) =>
      find(
        [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), m(mint).toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM
      ),
  };
}

// The bound PDA helper type (what ctx.pda is).
export type Pdas = ReturnType<typeof createPdas>;
