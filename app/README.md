# Future Solana — Limit Order Demo (frontend)

A minimal Vite + React app that talks to the devnet `perp_core` / `liquidity_pool`
programs with a Phantom wallet. It demonstrates the user side of the keeper flow:

1. **Connect** a Phantom wallet (devnet).
2. **Create a private pool** — become a private LP (`initialize_lp_account` + `provide(side=PRIVATE)`).
3. **Place a limit order** — `deposit` + `make_limit_order` (no oracle needed at placement time).

The off-chain **Go keeper** (`../keeper`) then fetches a Pyth VAA from Hermes, posts it
on-chain with `post_update_atomic`, and calls `trigger_limit_open` to fill the order at
market — that is the "市价成交" step.

## Prerequisites

- A Phantom wallet set to **Devnet** with some devnet SOL (for fees).
- Some **test USDC** (`CRbjxMG…`, 6 decimals). Mint it with the admin faucet:
  ```
  # inside the fsol container, admin key holds mint authority
  cd /fsol/future-solana
  node scripts/keeper-demo-setup/faucet.mjs <YOUR_WALLET> 1000
  ```
- The pool must be initialized once (already done on devnet):
  `node scripts/keeper-demo-setup/setup.mjs`

## Run

```
cd app
npm install
npm run dev        # http://localhost:5173
```

Optional: point at a different RPC with `VITE_RPC=https://… npm run dev`.

## Notes

- All addresses live in `src/config.ts` (devnet defaults).
- Confirmation uses HTTP polling (`getSignatureStatuses`) so it works with RPC
  endpoints that don't expose `signatureSubscribe` over WebSocket.
- To trigger quickly: a LONG order fills when price ≤ target, so set the target
  above the current BTC price (e.g. 200000) and the keeper will fill immediately.
