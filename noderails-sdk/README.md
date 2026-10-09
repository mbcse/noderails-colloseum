# @noderails/sdk

The official Node.js SDK for the [NodeRails](https://noderails.com) crypto payments gateway.

## Features

- **Zero runtime dependencies** — uses native `fetch`
- **Dual ESM / CJS** — works with `import` and `require()`
- **Full TypeScript support** — complete type definitions
- **Cross-runtime** — Node.js 18+, Deno, Bun
- **Webhook verification** — HMAC-SHA256 signature checking
- **Stripe-style API** — familiar resource-based interface
- **Multi-chain** — EVM and Solana for one-time checkout and payment intents (see below)

## Installation

```bash
npm install @noderails/sdk
# or
pnpm add @noderails/sdk
# or
yarn add @noderails/sdk
```

## Quick Start

```typescript
import { NodeRails } from '@noderails/sdk';

const noderails = new NodeRails({
  appId: 'your-app-id',
  apiKey: 'nr_live_sk_...',  // secret key required
});

// Create a checkout session
const session = await noderails.checkoutSessions.create({
  appId: noderails.appId,
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  items: [
    { name: 'Pro Plan', amount: '29.99', quantity: 1 },
  ],
});

console.log(session.id); // redirect user to your payment UI
```

## Configuration

```typescript
const noderails = new NodeRails({
  appId: 'your-app-id',      // Required — your app UUID
  apiKey: 'nr_live_sk_...',   // Required — secret API key
  baseUrl: 'https://...',     // Optional — override API base URL
  timeout: 30000,             // Optional — request timeout in ms (default: 30s)
});
```

### API Key Format

Keys follow the format `nr_<env>_<type>_<random>`:

| Key | Description |
|-----|-------------|
| `nr_live_sk_...` | Live secret key |
| `nr_test_sk_...` | Test secret key |
| `nr_live_pk_...` | Live public key (cannot be used with SDK) |
| `nr_test_pk_...` | Test public key (cannot be used with SDK) |

> **Note:** The SDK requires a secret key (`sk`). Public keys are for client-side use only.

## Chains & tokens (EVM & Solana)

- **EVM:** `chainId` is the usual numeric chain id (for example `1` Ethereum mainnet, `11155111` Sepolia).
- **Solana:** NodeRails uses cluster ids **`101`** (testnet), **`102`** (devnet), and **`103`** (mainnet). Pass these as `chainId` anywhere the API accepts a chain (checkout sessions, payment intents, customer wallets, and so on).
- **Token lists:** When you pass explicit tokens, use keys in the form **`SYMBOL-chainId`** (for example `ETH-1`, `USDC-1`, `SOL-103`, `USDC-103`). `"ALL"` means any token the gateway allows for those chains.

**Subscriptions:** Recurring billing and renewals use **EVM ERC-20** flows today. **Solana** is supported for **one-time** payments (checkout sessions, payment intents, payment links), not subscription renewals.

## Resources

### Checkout Sessions

```typescript
// Create
const session = await noderails.checkoutSessions.create({
  appId: noderails.appId,
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  items: [{ name: 'Widget', amount: '9.99', quantity: 2 }],
});

// Retrieve
const session = await noderails.checkoutSessions.retrieve('session-id');

// List (paginated)
const { data, pagination } = await noderails.checkoutSessions.list({
  page: 1,
  pageSize: 20,
  status: 'OPEN',
});

// Expire
const expired = await noderails.checkoutSessions.expire('session-id');
```

### Payment Intents

```typescript
// Create (EVM-only example)
const intent = await noderails.paymentIntents.create({
  amount: '100.00',
  currency: 'USD',
  captureMode: 'AUTOMATIC',
});

// Restrict chains / tokens (EVM + Solana example)
const multiChainIntent = await noderails.paymentIntents.create({
  amount: '50.00',
  currency: 'USD',
  captureMode: 'AUTOMATIC',
  allowedChains: [1, 103], // Ethereum mainnet + Solana mainnet
  allowedTokens: ['USDC-1', 'SOL-103', 'USDC-103'],
});

// Retrieve
const retrievedIntent = await noderails.paymentIntents.retrieve('intent-id');

// List
const { data } = await noderails.paymentIntents.list({ status: 'CAPTURED' });

// Cancel
await noderails.paymentIntents.cancel('intent-id');

// Refund (full leftover, or EVM partial via percent / amount)
await noderails.paymentIntents.refund('intent-id', { reason: 'Customer request' });
await noderails.paymentIntents.refund('intent-id', { reason: 'Partial', percent: 50 });
await noderails.paymentIntents.refund('intent-id', { reason: 'Partial', amount: '5000000' });
```

### Payouts

Standing wallet authorization and ERC-20 approve / `depositETH` happen in the merchant dashboard. The SDK creates, schedules, lists, executes, and cancels.

Create amounts are **human decimals**. Stored `tokenAmount` and `lines[].amount` are **atomic** integer strings. Bulk (more than one recipient) is EVM only. Solana is native SOL, one recipient. Sui create is allowed; schedule and execute are not enabled.

```typescript
const payout = await noderails.payouts.create({
  chain: '11155111',
  tokenAddress: '0x...',
  lines: [
    { recipient: '0xAlice', amount: '100.50' },
    { recipient: '0xBob', amount: '80' },
  ],
  executeNow: true,
});

await noderails.payouts.execute(payout.id);
await noderails.payouts.cancel(payout.id);

const schedule = await noderails.payoutSchedules.create({
  chain: '11155111',
  tokenAddress: '0x...',
  intervalDays: 30,
  lines: [{ recipient: '0xAlice', amount: '100.50' }],
});

await noderails.payoutContacts.create({
  label: 'Alice',
  wallet: '0xAlice',
  family: 'EVM',
});
await noderails.payoutContacts.update('contact-id', { label: 'Alice payroll' });
```

### Customers

```typescript
// Create
const customer = await noderails.customers.create({
  appId: noderails.appId,
  email: 'john@example.com',
  name: 'John Doe',
});

// Retrieve (includes wallets)
const customer = await noderails.customers.retrieve('customer-id');

// Update
await noderails.customers.update('customer-id', { name: 'Jane Doe' });

// List
const { data } = await noderails.customers.list({ search: 'john' });

// Add wallet (EVM — checksummed 0x address)
const evmWallet = await noderails.customers.addWallet('customer-id', {
  chainId: 1,
  walletAddress: '0x...',
});

// Add wallet (Solana — base58 public key, cluster id 103 = mainnet)
const solWallet = await noderails.customers.addWallet('customer-id', {
  chainId: 103,
  walletAddress: 'YourBase58SolanaAddress...',
});

// Remove wallet
await noderails.customers.removeWallet('customer-id', 'wallet-id');
```

### Invoices

```typescript
// Create (created as DRAFT)
const invoice = await noderails.invoices.create({
  appId: noderails.appId,
  customerAccountId: 'customer-id',
  items: [{ description: 'Consulting', amount: '500.00' }],
});

// Open (DRAFT → OPEN)
await noderails.invoices.open('invoice-id');

// Send via email
await noderails.invoices.send('invoice-id');

// Void
await noderails.invoices.void('invoice-id');

// List
const { data } = await noderails.invoices.list({ status: 'OPEN' });
```

### Payment Links

```typescript
// Create
const link = await noderails.paymentLinks.create({
  appId: noderails.appId,
  name: 'Pro Plan',
  slug: 'pro-plan',
  amount: '29.99',
});

// Update
await noderails.paymentLinks.update('link-id', { isActive: false });

// List
const { data } = await noderails.paymentLinks.list({ isActive: true });

// Delete
await noderails.paymentLinks.delete('link-id');
```

### Subscriptions

Recurring plans charge via **EVM ERC-20** renewals. Use Solana for **one-time** flows only.

```typescript
// Create
const sub = await noderails.subscriptions.create({
  appId: noderails.appId,
  customerAccountId: 'customer-id',
  productPlanId: 'plan-id',
  productPlanPriceId: 'price-id',
});

// Retrieve (includes invoices)
const sub = await noderails.subscriptions.retrieve('sub-id');

// Pause / Resume
await noderails.subscriptions.pause('sub-id');
await noderails.subscriptions.resume('sub-id');

// Cancel
await noderails.subscriptions.cancel('sub-id', { cancelAtPeriodEnd: true });

// Create checkout for initial payment
const checkout = await noderails.subscriptions.createCheckout('sub-id');
```

### Product Plans & Prices

```typescript
// Create plan with prices
const plan = await noderails.productPlans.create({
  appId: noderails.appId,
  name: 'Pro',
  planType: 'SUBSCRIPTION',
  prices: [
    { amount: '29.99', billingInterval: 'MONTH' },
    { amount: '299.00', billingInterval: 'YEAR' },
  ],
});

// Add price to existing plan
const price = await noderails.productPlans.createPrice('plan-id', {
  amount: '49.99',
  billingInterval: 'MONTH',
  nickname: 'Premium Monthly',
});

// Update price
await noderails.productPlans.updatePrice('plan-id', 'price-id', {
  isDefault: true,
});

// Deactivate price
await noderails.productPlans.deletePrice('plan-id', 'price-id');
```

### Tax Rates

```typescript
// Create
const tax = await noderails.taxRates.create({
  displayName: 'VAT',
  percentage: 20,
  jurisdiction: 'EU',
});

// List (returns all, not paginated)
const rates = await noderails.taxRates.list();

// Include archived
const allRates = await noderails.taxRates.list({ includeInactive: true });

// Archive
await noderails.taxRates.delete('tax-rate-id');
```

### Webhook Endpoints

```typescript
// Create (returns secret — save it!)
const webhook = await noderails.webhookEndpoints.create({
  url: 'https://example.com/webhooks',
  events: ['payment.captured', 'payment.settled'],
});
console.log(webhook.secret); // only returned on create

// List
const webhooks = await noderails.webhookEndpoints.list();

// Update
await noderails.webhookEndpoints.update('webhook-id', {
  events: ['payment.captured', 'payment.settled', 'payment.refunded'],
});

// Rotate secret
const rotated = await noderails.webhookEndpoints.rotateSecret('webhook-id');

// Test ping
await noderails.webhookEndpoints.testPing('webhook-id');

// List deliveries (cursor-based pagination)
const { items, nextCursor } = await noderails.webhookEndpoints.listDeliveries(
  'webhook-id',
  { limit: 25 },
);

// Delete
await noderails.webhookEndpoints.delete('webhook-id');
```

### Prices (Crypto)

```typescript
// Get current token price
const eth = await noderails.prices.getPrice('ETH');
console.log(eth.priceUsd);

// Convert USD → token amount
const result = await noderails.prices.convert({
  symbol: 'ETH',
  amountUsd: 100,
});
console.log(result.tokenAmount);

// Convert token → USD
const result2 = await noderails.prices.convert({
  symbol: 'ETH',
  tokenAmount: 1.5,
});
console.log(result2.amountUsd);
```

## Webhook Verification

Verify incoming webhook payloads using HMAC-SHA256:

```typescript
import { NodeRails } from '@noderails/sdk';
import express from 'express';

const app = express();

app.post(
  '/webhooks',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      const event = NodeRails.webhooks.constructEvent(
        req.body,                                    // raw body
        req.headers['x-noderails-signature'] as string,
        req.headers['x-noderails-timestamp'] as string,
        'your-webhook-secret',
      );

      switch (event.event) {
        case 'payment.captured':
          // Handle captured payment
          break;
        case 'payment.settled':
          // Handle settled payment
          break;
      }

      res.sendStatus(200);
    } catch (err) {
      console.error('Webhook verification failed:', err);
      res.sendStatus(400);
    }
  },
);
```

## Error Handling

All SDK errors extend `NodeRailsError`:

```typescript
import {
  NodeRails,
  ApiError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
} from '@noderails/sdk';

try {
  await noderails.paymentIntents.retrieve('non-existent');
} catch (err) {
  if (err instanceof NotFoundError) {
    console.log('Not found');
  } else if (err instanceof ValidationError) {
    console.log('Validation error:', err.details);
  } else if (err instanceof AuthenticationError) {
    console.log('Bad API key');
  } else if (err instanceof RateLimitError) {
    console.log('Rate limited, retry after:', err.retryAfter);
  } else if (err instanceof ApiError) {
    console.log(`API error ${err.status}: ${err.message}`);
  }
}
```

| Error Class | Status | Description |
|-------------|--------|-------------|
| `AuthenticationError` | 401 | Invalid or missing API key |
| `PermissionError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource not found |
| `ValidationError` | 400/422 | Invalid request parameters |
| `RateLimitError` | 429 | Too many requests |
| `ConnectionError` | — | Network/connection failure |
| `TimeoutError` | — | Request timed out |
| `SignatureVerificationError` | — | Webhook signature mismatch |

## Pagination

Paginated endpoints return a `PaginatedResult`:

```typescript
const result = await noderails.paymentIntents.list({
  page: 1,
  pageSize: 50,
});

console.log(result.data);            // PaymentIntent[]
console.log(result.pagination.total); // total count
console.log(result.pagination.hasMore); // boolean
```

## License

MIT
