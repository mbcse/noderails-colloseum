# NodeRails payments

NodeRails is payment infrastructure for crypto commerce. Merchants get hosted checkout, payment links, invoices, subscriptions, payouts, and disputes. Shoppers pay from a wallet; funds move through **on-chain escrow** on the chains below (EVM) or the **Solana** program when enabled.

This repository is built around **Tempo**, **Base**, **Arbitrum**, **Robinhood Chain**, and **Solana**, plus the TypeScript **SDK** and ops services (**MTXM**, **Indexer**, **BPC**).

Live product: [noderails.com](https://www.noderails.com) · Merchant dashboard: [merchant.noderails.com](https://merchant.noderails.com)

---

## Chains at a glance

| Rail | Chain IDs | Escrow / programs |
|------|-----------|-------------------|
| **Tempo** | `4217`, `42431` (Moderato) | Logic `0x9080212268bd2a34991a36841a538223cf81ae38`, Escrow `0x86efe26b441075bf77d0dd938770a1d484692372`, MM `0x1998d37d674ac17b55fea185c0677250b31d1d3c` on Moderato (see `deployData/`) |
| **Base** | `8453`, `84532` Sepolia | Escrow `0x2fa8ec8170e74afa89991e44e7d8c984f7867e86`, MM `0xa1c9f1ca5e665958bce9d734ada691601b781972` on mainnet |
| **Arbitrum** | `42161`, `421614` Sepolia | Same Solidity stack; deploy or register per network |
| **Robinhood Chain** | `46630` testnet | Escrow `0x5a4bc03b982a909fc1e665cf63c5e662ee74cb2a`, MM `0x2fa8ec8170e74afa89991e44e7d8c984f7867e86` |
| **Solana** | devnet / mainnet | Anchor programs in `noderails/noderails-solana/` |

EVM rails share `noderails/noderails-contracts/` (Foundry + ops-ui). Solana uses MTXM for instruction broadcast and Indexer for program logs.

---

## The problem we solve

Retail crypto checkout needs **one merchant API** and **many settlement rails**. Teams should not rebuild escrow, signing, indexing, and pricing for every chain they turn on.

---

## What merchants get

- Hosted checkout on Tempo, Base, Arbitrum, Robinhood Chain, and Solana (when configured)
- Payment links, invoices, subscriptions, disputes
- Webhooks and `@noderails/sdk`
- Dashboard and admin for chains, tokens, and fees
- MTXM + Indexer + BPC as in production NodeRails

---

## How the stack fits together

```
Merchant / shopper
        |
        v
 NodeRails API + payment UI + dashboard
        |
        +---- BPC (EVM + Solana balances / prices)
        +---- MTXM (sign + broadcast)
        +---- Indexer (on-chain events)
        |
        v
 Tempo / Base / Arbitrum / Robinhood Chain escrow, or Solana program
```

---

## Repository map

```
├── README.md
├── COLOSSEUM.md
├── noderails/
├── noderails-sdk/
├── MultichainTxManager/
├── Indexer/
└── noderails-bpc-service/
```

---

## Quick start

```bash
cd noderails && pnpm install && pnpm db:migrate:deploy
cd ../noderails-bpc-service && pnpm install
cd ../noderails-sdk && pnpm install && pnpm run build
cd ../noderails && pnpm dev
```

Register chains and contracts with `noderails/services/setup-cli` after admin enables Tempo, Base, Arbitrum, Robinhood Chain, and/or Solana.

### Demo

1. Enable **Tempo Moderato** (`42431`), **Base Sepolia**, **Arbitrum Sepolia**, **Robinhood Chain testnet** (`46630`), or **Solana devnet** in admin.
2. Create a payment link; pay on that rail.
3. Confirm intent state in the dashboard and on [Tempo explore](https://explore.testnet.tempo.xyz), [Basescan](https://sepolia.basescan.org), [Arbiscan](https://sepolia.arbiscan.io), [Robinhood explorer](https://explorer.testnet.chain.robinhood.com), or Solscan.

See **COLOSSEUM.md** for RPC URLs, contract tables, and Tempo deploy notes.

---

## Contact

**Martand Rise / NodeRails** · **mohit@noderails.com**
