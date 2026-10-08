# Why Interledger for NodeRails

## The problem today

NodeRails is production-grade for **on-chain escrow commerce**. Merchants get hosted checkout, payment links, invoices, subscriptions, disputes, and webhooks across EVM, Solana, and Sui. Customers connect a chain-native wallet and pay in tokens the merchant accepts.

That model breaks down when:

1. **The payer does not hold the right chain or token.** A customer with an Open Payments wallet in EUR should not be forced to acquire SOL or USDC on Sui first.
2. **Settlement targets multiply.** Merchants want crypto treasury, stablecoin balances, bank accounts, and virtual accounts for reconciliation. Each target today requires custom partner integration.
3. **Payouts are chain-specific.** Paying suppliers, affiliates, or bank beneficiaries needs a unified instruction model, not a separate integration per rail.
4. **Private and B2B flows need account-native identifiers.** Invite-only payment links and virtual accounts map naturally to **wallet addresses**, not raw `0x` or base58 strings.

Crypto escrow solves **trust at capture**. It does not, by itself, solve **interoperability between payment networks**.

---

## What Interledger adds

[Interledger](https://interledger.org/developers/get-started/) is an open protocol suite for routing **packets of value** across independent ledgers and accounting systems. Connectors forward payments; no single company owns the network.

For NodeRails, the actionable surface is **Open Payments**: a REST API standard that Account Servicing Entities (ASEs) implement so clients can:

- Address payees with **wallet address URLs** (and payment pointers like `$merchant.example.com`)
- Create **incoming payments** (receive) and **outgoing payments** (send)
- Obtain **quotes** for FX and fees before committing
- Authorize access via **GNAP** grants

Under the hood, value moves over **ILPv4** and **STREAM**. Merchants and integrators typically interact at the Open Payments layer only.

---

## NodeRails Universal Settlement (proposed)

NodeRails becomes a **dual-rail** platform:

| Rail | Payer experience | Settlement | NodeRails role |
|------|------------------|------------|----------------|
| **Crypto (existing)** | Connect EVM / Solana / Sui wallet | On-chain escrow → timelock → merchant wallet | Orchestrate capture, MTXM, indexer, webhooks |
| **Open Payments (planned)** | Pay from OP-enabled wallet or app | ILP routing → ASE account / bank / treasury | Create incoming payments, reconcile, webhooks |

Both rails emit the same merchant lifecycle: **created → authorized → captured → settled**, with disputes and refunds where applicable.

---

## Mapping to NodeRails roadmap

| Initiative | How Open Payments / ILP helps |
|------------|------------------------------|
| **Private payments** | Incoming payments scoped by metadata + short expiry; GNAP grants limit who can pay; checkout session tied to `externalRef` |
| **Crypto → stablecoin settlement** | Capture on-chain in merchant's chosen token; treasury policy triggers OP outgoing payment to stablecoin-denominated wallet address |
| **Bank settlement** | Outgoing OP payment to banking partner ASE wallet address; ILP connectors bridge to fiat ledger |
| **Virtual accounts** | Sub-path wallet address per VA (`$platform.noderails.com/{merchantId}/{vaId}`) + dedicated incoming payment for attribution |
| **Payouts** | Merchant-initiated outgoing payments with quote-first FX to beneficiary wallet addresses |
| **Hosted checkout** | Hybrid UI: existing crypto path + "Pay with wallet" path using OP quote + outgoing payment |

---

## Non-custodial positioning

NodeRails **does not take custody** of customer fiat or digital assets on the crypto rail. Users authorize from their own wallets; escrow rules are on-chain.

On the Open Payments rail, **custody sits with ASEs** (banks, wallet providers, Rafiki-operated test accounts). NodeRails acts as:

- **Orchestrator:** creates payment intents, incoming payments, checkout UX
- **Technology provider:** APIs, webhooks, reconciliation metadata
- **Policy engine:** routes settlement per merchant configuration

This aligns with NodeRails AML/CFT policy: self-custodial crypto infrastructure plus regulated partners for account-based rails.

---

## Why this is world-class

1. **One integration, many payers.** Open Payments is standardized. One NodeRails OP adapter can reach any ASE that implements the spec.
2. **Internet-scale routing.** ILP connectors compete on path, cost, and speed. Merchants are not locked to a single PSP pipe.
3. **Human-readable payme IDs.** Payment pointers (`$…`) are easier for invoices, support, and B2B than hex addresses.
4. **Complements crypto, does not replace it.** Power users keep chain-native checkout; mainstream users get wallet-address pay.
5. **Future-proof for Web Monetization and streaming.** STREAM supports streaming payments; optional later use cases (subscriptions, usage billing).

---

## What we are not claiming

- NodeRails is **not** becoming an ASE or bank. Production requires partner ASEs or licensed entities.
- Open Payments **does not guarantee** every cross-currency path succeeds. Quotes can fail; routing depends on connector liquidity.
- This document is **architecture only**. No OP endpoints are live in `noderails-server` yet.

---

## Next steps in this doc set

- [Architecture overview](./02-architecture-overview.md) for diagrams and component boundaries
- [Open Payments integration](./04-open-payments-integration.md) for API-level design
- [Roadmap phases](./08-roadmap-phases.md) for implementation timeline
