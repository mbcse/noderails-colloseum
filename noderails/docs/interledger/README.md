# NodeRails x Interledger

Architecture and integration reference for bringing **Open Payments** and the **Interledger Protocol (ILP)** to NodeRails as a parallel settlement rail alongside on-chain escrow (EVM, Solana, Sui).

> **Status:** Architecture and documentation only. No production Open Payments integration is shipped yet.

---

## Executive summary

NodeRails today excels at **crypto-native commerce**: hosted checkout, payment links, invoices, subscriptions, escrow capture, timelock settlement, disputes, and webhooks across multiple blockchains.

**Interledger** adds a standardized **account-to-account payment layer**. Payers with Open Payments-enabled wallets can pay a merchant **wallet address** (for example `$merchant.noderails.com`) without sharing card details or holding the merchant's preferred chain or token. Value routes over ILP connectors; quotes handle FX and fees.

Together, NodeRails becomes a **Universal Settlement** platform:

- **Crypto rail** (existing): wallet → on-chain escrow → merchant wallet
- **Open Payments rail** (planned): OP wallet → ILP network → merchant OP account, bank ASE, or treasury policy target

NodeRails remains **non-custodial** for on-chain flows. Open Payments flows are **ASE-mediated** where regulated partners hold fiat or wallet balances. The platform orchestrates both and emits unified webhooks.

---

## Reading order

| # | Document | Audience |
|---|----------|----------|
| 0 | [Portal inventory](./00-portal-inventory.md) | Anyone mapping Interledger ecosystem docs |
| 1 | [Why Interledger for NodeRails](./01-why-interledger.md) | Product, leadership, partners |
| 2 | [Architecture overview](./02-architecture-overview.md) | Engineers, architects |
| 3 | [Protocol stack primer](./03-protocol-stack-primer.md) | Engineers new to ILP |
| 4 | [Open Payments integration](./04-open-payments-integration.md) | Backend / integration engineers |
| 5 | [Merchant wallet addresses](./05-merchant-wallet-addresses.md) | Product, ops, merchants |
| 6 | [Settlement rails](./06-settlement-rails.md) | Treasury, payouts, bank partners |
| 7 | [Security and compliance](./07-security-and-compliance.md) | Compliance, security review |
| 8 | [Roadmap phases](./08-roadmap-phases.md) | Engineering planning |

---

## Official external references

- [Interledger Developers](https://interledger.org/developers/)
- [Interledger Get Involved](https://interledger.org/developers/get-involved/)
- [Interledger Architecture](https://interledger.org/developers/rfcs/interledger-architecture/)
- [Open Payments](https://openpayments.dev/)
- [Open Payments Getting Started](https://openpayments.dev/overview/getting-started/)
- [Rafiki](https://rafiki.dev/)
- [Interledger RFCs (GitHub)](https://github.com/interledger/rfcs)

---

## Accelerator proposal

Submission-ready package for the Interledger Open Payments accelerator:

- [NodeRails-Open-Payments-Accelerator-Proposal.md](./accelerator-proposal/NodeRails-Open-Payments-Accelerator-Proposal.md)
- [Print-ready HTML (Save as PDF)](./accelerator-proposal/NodeRails-Open-Payments-Accelerator-Proposal.html)
- `./accelerator-proposal/export-pdf.sh` to open HTML or run pandoc/md-to-pdf

---

## NodeRails code touchpoints (when implemented)

| Area | Path |
|------|------|
| Checkout authorize | `services/noderails-server/src/modules/payments/authorize.service.ts` |
| Settlement worker | `services/noderails-server/src/modules/payments/settlement.worker.ts` |
| Hosted checkout | `apps/payment-ui/` |
| Merchant dashboard | `apps/dashboard/` |
| Webhooks | `services/noderails-server/src/modules/webhooks/` |
