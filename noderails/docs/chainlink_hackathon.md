# NodeRails — Chainlink Hackathon Submission

## Project Overview

**NodeRails** is a non-custodial crypto payments gateway and infrastructure platform — think "Stripe for crypto." It enables merchants to accept cryptocurrency payments, manage subscriptions, issue invoices, and handle payouts across multiple EVM chains, all backed by on-chain escrow smart contracts with built-in dispute resolution and timelocked settlements.

### What Problem Does NodeRails Solve?

1. **No unified crypto payment infrastructure** — Merchants wanting to accept crypto must build custom smart contracts, manage wallets, track on-chain events, handle multi-chain complexity, and build checkout UIs from scratch.
2. **No buyer protection in crypto** — Traditional crypto payments are irreversible. NodeRails introduces an escrow-based model with timelock windows for disputes, bringing credit-card-like buyer protection to crypto.
3. **No recurring billing in crypto** — Subscriptions in crypto are nearly non-existent. NodeRails implements ERC20 approval-based server-initiated recurring pulls with automated billing, retries, and grace periods.
4. **Multi-chain fragmentation** — Supporting multiple chains requires separate infrastructure per chain. NodeRails abstracts this with admin-managed chain/token configuration and per-app enablement.

---

## Architecture Summary

### System Components

| Component | Description |
|-----------|-------------|
| **Smart Contracts** | `NodeRailsEscrow.sol` (payment capture, settlement, disputes with timelocks, platform fees) + `NodeRailsMerchantManager.sol` (stateless payout proxy with session signatures) |
| **Backend Server** | Unified monolith (`noderails-server`) with 15+ modules: auth, apps, payments, subscriptions, invoices, payment-links, product-plans, checkout-sessions, customers, payouts, webhooks, disputes, email, stats, admin |
| **Merchant Dashboard** | Next.js app for merchants to manage apps, payments, subscriptions, invoices, product plans, customers, tax rates, and settings |
| **Admin Dashboard** | Standalone Next.js app for platform admin: chain/token management, merchant oversight, disputes resolution, fee configuration, system health |
| **Payment UI** | Hosted checkout pages: payment link checkout, invoice checkout, dispute portal — Stripe-like two-panel design with wallet connection (ConnectKit + wagmi) |
| **Landing + Docs** | Public website with comprehensive GitBook-style SDK & API documentation (17 doc pages) |
| **SDK** | `@noderails/sdk` — zero-dep, dual ESM/CJS npm package with 10 resources, webhook verification, Stripe-style dot notation |
| **Microservices** | Self-hosted MTXM (Multi-chain Transaction Manager) for tx lifecycle + Indexer for on-chain event detection |

### High-Level Flow

```
Merchant SDK/Dashboard
  → NodeRails Server (auth, payment intents, checkout sessions)
    → MTXM (signs & broadcasts transactions)
      → On-chain Escrow Contract (captures funds with timelocks)
    → Indexer (detects on-chain events)
      → Server (updates payment status, fires webhooks)
        → Merchant Backend (webhook delivery)
```

---

## Smart Contracts

### NodeRailsEscrow.sol

- **Payment capture** with EIP-712 signed authorization (native ETH + ERC20 with permit/approval)
- **Timelock-based fund protection** — configurable per-merchant dispute window + settlement delay
- **Dispute lifecycle** — payer can dispute during timelock → admin resolves (refund or settle)
- **Platform fees** — `feeBps` (max 1000 = 10%) signed into capture payload, deducted at settlement, sent to `feeRecipient`
- **Refunds** — merchants can refund CAPTURED payments before settlement timelock expires
- **Key hierarchy** — SuperAdmin, Admin, TransactionKey roles

### NodeRailsMerchantManager.sol

- **Stateless payout proxy** — no on-chain storage of limits (tracked in DB)
- **Dual signature verification** — merchant session signature (time-limited) + backend authorization
- **Nonce-based replay protection**

### Deployed Chains

- Ethereum Sepolia (testnet)
- Polygon Amoy (testnet)

---

## Key Features

### 1. Payment Links (Stripe-like)
Shareable URLs for accepting crypto payments without code. Supports one-time and subscription payment links with chain/token restrictions, tax rates, and billing details collection.

### 2. Subscriptions (ERC20 Auto-Pull)
Recurring billing using server-initiated ERC20 `transferFrom`. Customer signs a 1-year capped approval or EIP-2612 permit on first checkout. BullMQ delayed jobs fire at each `periodEnd` for automatic renewals. Pre-flight on-chain balance/allowance checks before each charge. Retry logic (3 attempts, exponential backoff) + 7-day grace period → auto-cancel.

### 3. Invoices
Sequential invoice numbering, line items, tax computation, draft/open/paid/void lifecycle. Auto-paid on capture confirmation. Email delivery with PDF attachment.

### 4. Dispute Resolution
Customer portal with OTP verification. Dispute window computed from on-chain timelocks. Admin resolution panel with on-chain `resolveDispute()` execution. Email notifications for both parties.

### 5. Product Plans & Pricing
Stripe-inspired Product → Price model. ONE_TIME and SUBSCRIPTION plan types. Multiple prices per plan with billing intervals. Tax rate attachment.

### 6. Tax Rates
Merchant-scoped tax rates with inclusive/exclusive modes. Per-invoice and per-payment-link tax attachment. Computed at checkout session creation.

### 7. Auto-Settlement
BullMQ delayed jobs scheduled after capture confirmation. Fires after on-chain timelock expires. Startup reconciliation catches missed jobs.

### 8. Email System
Amazon SES for receipt emails (HTML + PDF), invoice payment emails, OTP verification, dispute notifications. BullMQ worker with 10 retries (~24h). SES bounce/complaint tracking via SQS polling.

### 9. Webhook System
Merchant-configurable endpoints. 14+ event types. HMAC-SHA256 signed payloads. BullMQ delivery with retry. SDK provides `constructEvent()` for verification.

### 10. Platform Fees
Per-transaction fees (default 2%, max 10%). Signed into EIP-712 capture payload and enforced on-chain. Configurable per-merchant via admin panel. Deducted at settlement, not at refund.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity, Foundry, OpenZeppelin |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL + Prisma 7 |
| Queue | BullMQ + Redis |
| Frontend | Next.js 15, React 19, Tailwind CSS v4, shadcn/ui |
| Web3 (Frontend) | wagmi 2.19, viem 2.46, ConnectKit, RainbowKit |
| Web3 (Backend) | viem (ABI encoding, EIP-712) |
| Email | Amazon SES + PDFKit |
| Monorepo | pnpm workspaces + Turborepo |
| SDK | TypeScript, tsup (dual ESM/CJS), zero deps |

---

## Chainlink Integration Opportunities

NodeRails currently uses CryptoCompare for price feeds and custom microservices (MTXM/Indexer) for transaction management and event indexing. These are prime areas for Chainlink integration:

### 1. Chainlink Price Feeds → Replace CryptoCompare
- Current: CryptoCompare API with 1s cache TTL for USD→crypto conversion
- Opportunity: On-chain Chainlink Price Feeds for tamper-proof, decentralized pricing
- Impact: Eliminates single point of failure, provides manipulation-resistant prices, reduces API dependency

### 2. Chainlink CCIP → Cross-Chain Payments
- Current: Each chain is independent; no cross-chain payment routing
- Opportunity: CCIP for cross-chain token transfers — payer on Chain A, merchant settlement on Chain B
- Impact: Unlocks true multi-chain payment flexibility

### 3. Chainlink Automation → Settlement & Subscription Billing
- Current: BullMQ delayed jobs for auto-settlement after timelock + subscription renewal charges
- Opportunity: Chainlink Automation (Keepers) for trustless, on-chain-triggered settlement and billing
- Impact: Removes dependency on server uptime for critical payment lifecycle events

### 4. Chainlink Functions → Webhook Delivery Verification
- Current: Server-side webhook delivery with BullMQ retry
- Opportunity: Chainlink Functions for verifiable off-chain computation (e.g., verify payment status before settlement)
- Impact: Adds a trust-minimized verification layer

### 5. Chainlink VRF → Dispute Resolution Randomization
- Current: Admin manually resolves disputes
- Opportunity: VRF for partially randomized dispute resolution in edge cases or for selecting third-party arbitrators
- Impact: Adds fairness guarantees to dispute resolution

---

## Database Schema (Key Models)

| Model | Purpose |
|-------|---------|
| `Merchant` | Platform users (merchants), auth, org settings, fee/timelock overrides |
| `App` | Merchant apps (TEST/PRODUCTION), wallets, chain/token config |
| `SupportedChain` / `SupportedToken` | Admin-managed chain/token registry |
| `AppChain` / `AppToken` | Per-app chain/token enablement |
| `PaymentIntent` | Core payment record — amount, currency, status, auth method, timelocks, fees |
| `Transaction` | On-chain transaction records (CAPTURE, SETTLE, REFUND, PAYOUT) |
| `CheckoutSession` | Universal payment entry point — all flows create a session first |
| `PaymentLink` | Shareable payment URLs with slug routing |
| `Invoice` / `InvoiceItem` | Invoice management with sequential numbering |
| `Subscription` | Recurring billing with BullMQ job tracking |
| `ProductPlan` / `ProductPlanPrice` | Product catalog with pricing tiers |
| `CustomerAccount` / `CustomerWallet` | Customer records with billing address |
| `TaxRate` | Merchant-scoped tax configuration |
| `Dispute` | Dispute records with resolution tracking |
| `Webhook` / `WebhookDelivery` | Outbound webhook configuration and delivery tracking |
| `EmailDelivery` / `EmailSuppression` | Email tracking and bounce management |
| `PlatformConfig` | Singleton platform settings (fees, timelocks) |

---

## Payment Status Flow

```
CREATED → AUTHORIZED → CAPTURING → CAPTURED → SETTLED
                          ↓                      ↓
                    CAPTURE_FAILED          DISPUTED → DISPUTE_RESOLVED / DISPUTE_LOST → REFUNDED
                                                                                     → SETTLED
CREATED → EXPIRED
CREATED → CANCELLED
CAPTURED → REFUNDED (merchant-initiated)
```

---

## API Modules

| Module | Routes | Auth | Description |
|--------|--------|------|-------------|
| auth | `/auth` | Public | Register, login, JWT, OTP verification |
| apps | `/apps` | JWT | App CRUD, chain/token enablement |
| payments | `/payments` | API Key | Payment intents, capture, settle, cancel, refund |
| checkout | `/checkout` | Public | Authorize payment, report native capture |
| checkout-sessions | `/checkout-sessions` | JWT/API Key | Session CRUD, from-link, from-invoice |
| payment-links | `/payment-links` | JWT/API Key | Payment link CRUD |
| invoices | `/invoices` | JWT/API Key | Invoice CRUD, open, void, send |
| subscriptions | `/subscriptions` | JWT/API Key | Subscription CRUD, pause, resume, cancel |
| product-plans | `/product-plans` | JWT/API Key | Product plan + price CRUD |
| customers | `/customers` | JWT/API Key | Customer CRUD, wallet management |
| tax-rates | `/tax-rates` | JWT | Tax rate CRUD |
| payouts | `/payouts` | JWT/API Key | Merchant payout management |
| webhooks | `/apps/:id/webhooks` | JWT | Webhook CRUD |
| disputes | `/disputes` | Mixed | Customer portal + admin resolution |
| admin | `/admin` | JWT+Admin | Platform management |
| stats | `/stats` | JWT | Analytics and breakdowns |
| prices | `/prices` | Public | Token price conversion |

---

## SDK

```typescript
import { NodeRails } from '@noderails/sdk';

const noderails = new NodeRails({
  appId: 'app_xxx',
  apiKey: 'nr_live_sk_xxx',
  apiVersion: '2026-03-07',
});

// Create a checkout session
const session = await noderails.checkoutSessions.create({
  amount: 49.99,
  currency: 'USD',
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
});

// Verify webhook
const event = noderails.webhooks.constructEvent(
  rawBody, signature, secret
);
```

### SDK Resources
`checkoutSessions`, `paymentIntents`, `customers`, `invoices`, `paymentLinks`, `subscriptions`, `productPlans`, `taxRates`, `webhookEndpoints`, `prices`

---

## Security Features

- **EIP-712 typed data signatures** for all on-chain operations
- **Key hierarchy** (SuperAdmin/Admin/TransactionKey) with role-based access
- **Timelock-based fund protection** with configurable dispute/settlement windows
- **HMAC-SHA256 webhook signatures** with timestamp drift checking
- **API versioning** (date-based, Stripe-style)
- **Idempotency keys** (Redis-backed, 24h TTL, 409 on concurrent collision)
- **Rate limiting** on public endpoints
- **JWT + API Key dual auth** with secret key enforcement
- **Email OTP verification** on merchant signup
- **Wallet change audit trail** (`WalletChangeLog`)
- **Permit flow audit** — server-side price validation (2% slippage tolerance), balance re-checks

---

## Deployment Architecture

```
                    ┌────────────────────────┐
                    │   Load Balancer / CDN   │
                    └────────────┬───────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   Dashboard:3001         Payment-UI:3002           Landing:3003
   Admin:3004                                             │
        │                        │                     /docs
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌────────────┴───────────┐
                    │  noderails-server:3000  │
                    │  (auth, payments, subs, │
                    │   invoices, webhooks,   │
                    │   workers, etc.)        │
                    └────────────┬───────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
         PostgreSQL           Redis           Amazon SES
         (Prisma 7)          (BullMQ,         (emails)
                              cache,
                              OTPs)
              │
    ┌─────────┴─────────┐
    │                   │
   MTXM             Indexer
  (tx mgmt)        (events)
    │                   │
    └─────────┬─────────┘
              │
    ┌─────────┴─────────┐
    │   EVM Blockchains  │
    │  (Ethereum, Polygon,│
    │   Arbitrum, Base,   │
    │   Optimism, BSC,    │
    │   Avalanche)        │
    └────────────────────┘
```

---

## Links

- **Contracts:** [noderails-contracts/src/](noderails-contracts/src/)
- **Server:** [services/noderails-server/src/](services/noderails-server/src/)
- **Dashboard:** [apps/dashboard/src/](apps/dashboard/src/)
- **Payment UI:** [apps/payment-ui/src/](apps/payment-ui/src/)
- **Admin:** [apps/admin/src/](apps/admin/src/)
- **SDK:** Separate repo (`noderails-sdk/`)
- **Full Architecture:** [noderails_architecture_design_842d1696.plan.md](noderails_architecture_design_842d1696.plan.md)
