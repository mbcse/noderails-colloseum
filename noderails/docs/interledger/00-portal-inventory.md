# Interledger portal inventory

Catalog of official Interledger developer documentation and related ecosystem sites. Use this as a map when researching integration options for NodeRails.

Last reviewed against [interledger.org/developers](https://interledger.org/developers/) and linked properties.

---

## A. Interledger.org Developers (primary portal)

### Portal pages

| Page | URL | Summary |
|------|-----|---------|
| **Developers home** | https://interledger.org/developers/ | Hub linking Open Payments repo, Rafiki repo, specifications (RFCs), Test Network, engineering blog, and contribution paths. |
| **Get involved** | https://interledger.org/developers/get-involved/ | Onboarding for contributors: TypeScript (Rafiki, Testnet, OP SDK), React, Angular, Web Extensions, Python/Ruby/.NET SDK ports, Helm/Terraform, Chromium Web Monetization. |
| **Get started / Overview** | https://interledger.org/developers/get-started/ | High-level ILP story: connectors route packets of value; ILPv4 uses Prepare / Fulfill / Reject; payments split into many small packets for speed and cost. Links to RFCs and reference implementation docs. |
| **Hackathon 2023** | https://interledger.org/developers/hackathon-2023/ | Builder reference tying together Open Payments API, GNAP grants, Rafiki testnet, SPSP, STREAM, ILPv4, and Rafiki local playground. Still useful as a stack overview. |
| **Engineering blog** | https://interledger.org/developers/blog/ | Deep dives (Rafiki internals, Open Payments guides, Web Monetization). |

---

## B. Core specifications (`/developers/rfcs/`)

These specs form the Interledger protocol suite. Full index: https://github.com/interledger/rfcs

| Spec | URL | Layer | Summary |
|------|-----|-------|---------|
| **Interledger Architecture** | https://interledger.org/developers/rfcs/interledger-architecture/ | Meta | Defines layers: ledger protocols, link protocols, ILPv4, transport (STREAM), application (SPSP). Explains senders, receivers, connectors, packetized money, addresses, security model. |
| **ILPv4** | https://interledger.org/developers/rfcs/interledger-protocol/ | Core | Request/response protocol with Prepare, Fulfill, Reject packets. Conditional transfers secured by SHA-256 fulfillment. Optimized for high-volume, low-value "penny switching." |
| **ILP Addresses** | https://interledger.org/developers/rfcs/ilp-addresses/ | Routing | Hierarchical dot-separated addresses (e.g. `g.us.acmebank.merchant.invoice123`). Connectors use longest-prefix routing. |
| **STREAM** | https://interledger.org/developers/rfcs/stream-protocol/ | Transport | Multiplexed money + data transport over ILP. Shared secret auth, chunking, flow control, bidirectional streams. Used by SPSP and Open Payments under the hood. |
| **SPSP** | https://interledger.org/developers/rfcs/simple-payment-setup-protocol/ | Application | HTTPS exchange of ILP address + shared secret before payment. Payment pointers resolve to SPSP endpoints. Client and server use STREAM for actual transfer. |
| **Payment Pointers** | https://paymentpointers.org/syntax/ | UX / discovery | Human-friendly identifiers: `$host/path` resolves to `https://host/path` (default `/.well-known/pay`). Canonical RFC: [IL-RFC-26 on GitHub](https://github.com/interledger/rfcs/blob/main/0026-payment-pointers/0026-payment-pointers.md). |
| **Peering, Clearing and Settling** | https://interledger.org/developers/rfcs/peering-clearing-settling/ | Operations | How connectors peer, track bilateral Interledger accounts, clear net positions, and settle on underlying ledgers. Clearing is bilateral, not globally standardized. |
| **Settlement Engines** | https://interledger.org/developers/rfcs/settlement-engines/ | Operations | HTTP API between connectors and settlement engines to automate moving funds on underlying ledgers when Interledger balances exceed limits. |
| **ILP Over HTTP** | https://interledger.org/developers/rfcs/ilp-over-http/ | Link | Peers exchange ILP Prepare/Fulfill/Reject over HTTPS POST with `application/octet-stream` bodies and callback URLs for async replies. |
| **Bilateral Transfer Protocol (BTP)** | https://interledger.org/developers/rfcs/bilateral-transfer-protocol/ | Link | WebSocket-based request/response layer for connector peering when HTTP bidirectional peering is impractical (firewalls). |
| **Dynamic Configuration Protocol (ILDCP)** | https://interledger.org/developers/rfcs/dynamic-configuration-protocol/ | Config | Child nodes request ILP address, asset code, and asset scale from a parent via `peer.config` ILP packets. |
| **Hashed-Timelock Agreements (HTLAs)** | https://interledger.org/developers/rfcs/hashed-timelock-agreements/ | Ledger bridge | Generalizes HTLCs to any ledger type: native HTLC, payment channels, trustlines. How Interledger attaches to diverse settlement systems. |

---

## C. Open Payments ecosystem

Open Payments is the **REST API standard** NodeRails would integrate at the application layer. Docs: https://openpayments.dev/

| Resource | URL | Summary |
|----------|-----|---------|
| **Open Payments home** | https://openpayments.dev/ | Standard REST API for ASEs to expose wallet addresses, quotes, incoming/outgoing payments. |
| **Getting started** | https://openpayments.dev/overview/getting-started/ | Wallet addresses as HTTPS URLs; GNAP grants for client authorization; merchant checkout and subscription use cases. |
| **Resource server API** | https://openpayments.dev/apis/resource-server/ | Four resource types: **wallet address**, **quote**, **incoming payment**, **outgoing payment**. All sub-resources of wallet address URL. |
| **Create quote** | https://openpayments.dev/apis/resource-server/operations/create-quote/ | Commitment from ASE on debit/receive amounts for a receiver (often an incoming payment URL). |
| **Create incoming payment** | https://openpayments.dev/apis/resource-server/operations/create-incoming-payment/ | Merchant-side: define amount cap, expiry, metadata; returns ILP payment details for payers. |
| **Create outgoing payment** | https://openpayments.dev/apis/resource-server/operations/create-outgoing-payment/ | Payer-side: send from wallet address using quote or direct incoming payment reference. |
| **SDK docs** | https://openpayments.dev/sdk/before-you-begin/ | TypeScript, JavaScript, Go, Java, PHP, Rust clients. |
| **Open Payments guide** | https://openpayments.guide | Additional educational material referenced in hackathon docs. |

### Authorization (GNAP)

Open Payments uses the **Grant Negotiation and Authorization Protocol (GNAP)** for client access tokens. Clients obtain grants before creating incoming/outgoing payments or reading account data. See Open Payments auth server specs on openpayments.dev.

---

## D. Rafiki (reference ASE implementation)

| Resource | URL | Summary |
|----------|-----|---------|
| **Rafiki docs** | https://rafiki.dev/ | Open-source stack for Account Servicing Entities: Open Payments API, ILP connector, admin UI, auth (GNAP). |
| **Rafiki GitHub** | https://github.com/interledger/rafiki | Source: backend, auth, frontend, token introspection, mock account service. |
| **Local playground** | https://rafiki.dev/integration/playground/overview/ | Mock ASE + SPSP + OP + STREAM + GNAP + admin UI for local development. |
| **Rafiki blog intro** | https://interledger.org/developers/blog/rafiki-low-level-intro/ | Package breakdown: backend (OP resources + ILP connector), auth (GNAP), frontend (admin), documentation. |

---

## E. Test network and sample apps

| Resource | URL | Summary |
|----------|-----|---------|
| **Interledger Testnet** | https://github.com/interledger/testnet | Open test network with test money for ASE integration testing. |
| **Rafiki.money test wallets** | https://rafiki.money/ | Public test wallet UI for trying Open Payments flows. |
| **Interledger Pay** | Referenced in OP blog | Sample app: send/request money via wallet addresses. |

---

## F. Related repos (from Developers home)

| Repo | Purpose |
|------|---------|
| [interledger/open-payments](https://github.com/interledger/open-payments) | Open Payments specification and tooling |
| [interledger/rafiki](https://interledger/rafiki) | Reference ASE + connector |
| [interledger/rfcs](https://github.com/interledger/rfcs) | All Interledger RFCs |
| [interledger/testnet](https://github.com/interledger/testnet) | Test network |
| [interledger/open-payments-go](https://github.com/interledger/open-payments-go) | Go SDK (example of multi-language ports) |

---

## G. How NodeRails engineers should use this inventory

1. **Product / strategy:** Read sections A (portal) + C (Open Payments getting started).
2. **Architecture:** Read B (Architecture, ILPv4, STREAM, SPSP) + [02-architecture-overview.md](./02-architecture-overview.md).
3. **Integration design:** Read C (OP API operations) + D (Rafiki) + [04-open-payments-integration.md](./04-open-payments-integration.md).
4. **POC / future build:** Use Rafiki local playground (D) before any production ASE partnership.

Do not copy RFC text into NodeRails docs. Link to official URLs above.
