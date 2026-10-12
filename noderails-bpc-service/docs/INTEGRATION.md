# NodeRails ↔ BPC Integration Guide

How **NodeRails / WallCard** (`noderailsCardNetwork`) integrates with the **Balance & Price Check (BPC)** microservice for multichain prices and wallet balances.

WallCard env templates (including BPC integration vars) live in this repo: **`env-examples/wallcard/`** — see [ENV.md](./ENV.md#wallcard-noderailscardnetwork-env-templates).

---

## Service URLs

| Environment | Base URL | OpenAPI |
|-------------|----------|---------|
| **Production** | `https://api.bpc.noderails.com` | `https://api.bpc.noderails.com/v1/openapi.json` |
| **Local dev** | `http://localhost:8090` | `http://localhost:8090/v1/openapi.json` |

**Admin dashboard** (token/RPC management): deployed on Vercel. Uses the production API for auth and data.

**Auth:** Public price and balance endpoints need no API key (IP rate limit: 100 req/min). Admin endpoints use JWT via `POST /admin/auth/login`.

---

## Quick start (WallCard / noderailsCardNetwork)

Copy templates from this repo, then enable BPC for balance reads:

```bash
cp env-examples/wallcard/.env.local.example ../noderailsCardNetwork/.env
cat env-examples/wallcard/.env.integration.example >> ../noderailsCardNetwork/.env
```

Or append manually to `noderailsCardNetwork/.env`:

```bash
# WallCard packages/chain — routes balance reads to BPC
BALANCE_PROVIDER=http
BALANCE_SERVICE_URL=http://localhost:8090

# Production
# BALANCE_SERVICE_URL=https://api.bpc.noderails.com
```

Legacy **noderails-server** (separate repo) may use `BPC_SERVICE_URL` instead — same base URL.

Smoke test from your machine:

```bash
curl -s "https://api.bpc.noderails.com/health"
curl -s "https://api.bpc.noderails.com/v1/prices?asset=ETH&currency=USD"
```

Expected health response:

```json
{ "status": "ok" }
```

Expected price envelope:

```json
{
  "success": true,
  "data": {
    "asset": "ETH",
    "symbol": "ETH",
    "currency": "USD",
    "price": 3500.25,
    "sourcesUsed": ["coingecko", "binance"],
    "cachedAt": "2026-07-18T12:00:00.000Z",
    "stale": false
  }
}
```

---

## What BPC provides

| Capability | Description |
|------------|-------------|
| **Unified prices** | One `asset` param for symbols, token keys, contracts, or DB token IDs |
| **Fiat conversion** | USD/EUR on the same price endpoint (`amountFiat`, `tokenAmount`) |
| **Multichain balances** | EVM, Solana, Sui with RPC failover |
| **Price enrichment** | Optional USD/EUR value on balance responses |
| **Caching** | Redis-backed prices with stale fallback (up to 5 min) |
| **Multi-source aggregation** | CoinGecko, CryptoCompare, Kraken, Binance, DefiLlama, DEX APIs, etc. |

All responses use the NodeRails envelope:

```json
{ "success": true, "data": { ... } }
```

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

---

## Mapping NodeRails → BPC

| NodeRails field | BPC usage | Example |
|-----------------|-----------|---------|
| `SupportedToken.tokenKey` | **`asset` query param (preferred)** | `USDC-137` |
| `SupportedToken.symbol` | `asset` (majors only) | `ETH` |
| `SupportedToken.contractAddress` + `chainId` | `asset=0x...-{chainId}` | `0xa0b8...-1` |
| `SupportedToken.id` (UUID) | `asset={uuid}` | registered BPC token row |
| `SupportedChain.chainId` | `chainId` on balance API | `1`, `137`, `103`, `203` |
| Checkout fiat currency | `currency=USD` or `EUR` | price + balance enrichment |

### Golden rule

> Always call BPC with **`asset={token.tokenKey}`** (e.g. `USDC-137`, `SOL-103`, `SUI-203`).

This matches NodeRails checkout, payment UI, and the BPC token registry.

### NodeRails chain IDs (reference)

| Chain | chainId | Example tokenKey |
|-------|---------|------------------|
| Ethereum | `1` | `ETH-1`, `USDC-1` |
| Polygon | `137` | `USDC-137`, `MATIC-137` |
| Base | `8453` | `USDC-8453` |
| Solana mainnet | `103` | `SOL-103`, `USDC-103` |
| Sui mainnet | `203` | `SUI-203` |

---

## Token registry (required for reliable pricing)

Before production checkout for a token, register it in **BPC Admin**:

1. **Chains** — confirm chain exists (seed includes 2600+ EVM + Solana/Sui)
2. **RPC Endpoints** — add production RPC URLs per chain (LeanRPC seeded as priority 1 for EVM)
3. **Tokens** — mirror each NodeRails `SupportedToken`:
   - `symbol`, `chainId`, `contractAddress` (or `native`)
   - `coingeckoId` / `defillamaId` optional but recommended
   - Auto `tokenKey`: **`{SYMBOL}-{chainId}`** (must match NodeRails)

When NodeRails admin adds a new supported token, add the same row in BPC Admin.

---

## API reference

Base: `https://api.bpc.noderails.com` (or `http://localhost:8090` locally)

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness |
| GET | `/v1/health/details` | DB, Redis, RPC, price source summary |

```bash
curl "https://api.bpc.noderails.com/v1/health/details"
```

---

### Prices (primary integration)

#### Unified lookup — use everywhere

```http
GET /v1/prices?asset={asset}&currency={USD|EUR}
```

**Examples (production):**

```bash
# By tokenKey (recommended for NodeRails)
curl "https://api.bpc.noderails.com/v1/prices?asset=USDC-137&currency=USD"

# By symbol (L1 majors)
curl "https://api.bpc.noderails.com/v1/prices?asset=ETH&currency=USD"

# By contract + chain
curl "https://api.bpc.noderails.com/v1/prices?asset=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-1&currency=USD"

# Native on specific chain
curl "https://api.bpc.noderails.com/v1/prices?asset=ETH-1&currency=EUR"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "asset": "USDC-137",
    "resolvedVia": "token_key",
    "tokenId": "550e8400-e29b-41d4-a716-446655440000",
    "tokenKey": "USDC-137",
    "symbol": "USDC",
    "currency": "USD",
    "price": 1.0001,
    "sourcesUsed": ["coingecko", "cryptocompare", "defillama"],
    "cachedAt": "2026-07-18T12:00:00.000Z",
    "stale": false
  }
}
```

#### Fiat ↔ token conversion (checkout validation)

Same endpoint, add conversion params:

```bash
# How many USDC for $100?
curl "https://api.bpc.noderails.com/v1/prices?asset=USDC-137&currency=USD&amountFiat=100"

# What is 1.5 ETH worth in USD?
curl "https://api.bpc.noderails.com/v1/prices?asset=ETH&currency=USD&tokenAmount=1.5"
```

**Response (with conversion):**

```json
{
  "success": true,
  "data": {
    "asset": "USDC-137",
    "symbol": "USDC",
    "currency": "USD",
    "price": 1.0001,
    "amountFiat": 100,
    "tokenAmount": "99.99000100",
    "cachedAt": "2026-07-18T12:00:00.000Z",
    "stale": false
  }
}
```

#### Batch prices

```http
POST /v1/prices/batch
Content-Type: application/json
```

```json
[
  { "asset": "ETH", "currency": "USD" },
  { "asset": "USDC-137", "currency": "USD" },
  { "asset": "SOL-103", "currency": "EUR" }
]
```

```bash
curl -X POST "https://api.bpc.noderails.com/v1/prices/batch" \
  -H "Content-Type: application/json" \
  -d '[{"asset":"ETH","currency":"USD"},{"asset":"USDC-137","currency":"USD"}]'
```

#### Legacy endpoints (still supported)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/prices/{symbol}` | Symbol only |
| GET | `/v1/prices/by-contract?chainId=&address=` | Contract lookup |
| GET | `/v1/prices/convert?asset=&amountFiat=` | Conversion helper |

Prefer **`GET /v1/prices?asset=`** for all new code.

---

### Balances

#### Single balance

```http
GET /v1/balance?chainId={id}&address={addr}&token={native|contract}&includePrice=true&currency=USD
```

```bash
# EVM native + USD value
curl "https://api.bpc.noderails.com/v1/balance?chainId=1&address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&token=native&includePrice=true&currency=USD"

# ERC-20 on Polygon
curl "https://api.bpc.noderails.com/v1/balance?chainId=137&address=0x...&token=0x3c499c542cef5e3811e1192ce70d8cc03d5c3359"

# Solana SPL token
curl "https://api.bpc.noderails.com/v1/balance?chainId=103&address=...&token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
```

| Param | Required | Description |
|-------|----------|-------------|
| `chainId` | Yes | NodeRails `SupportedChain.chainId` |
| `address` | Yes | Wallet address (EVM hex, Solana base58, Sui address) |
| `token` | No | `native`, contract/mint address, or coin type |
| `includePrice` | No | `true` to attach fiat value |
| `currency` | No | `USD` (default) or `EUR` |

#### Batch balances

```http
POST /v1/balance/batch
Content-Type: application/json
```

```json
{
  "includePrice": true,
  "currency": "USD",
  "items": [
    { "chainId": 1, "address": "0x...", "token": "native" },
    { "chainId": 103, "address": "...", "token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
  ]
}
```

Max **50 items** per batch.

---

## `asset` parameter formats

| Format | Example | When to use |
|--------|---------|-------------|
| **tokenKey** | `USDC-137` | **Default for NodeRails** |
| Symbol | `ETH` | Major L1 tokens |
| Symbol-chain | `ETH-1` | Native on a specific chain |
| Contract-chain | `0xa0b8...-1` | Unregistered token |
| Native-chain | `native-1` | Explicit native lookup |
| DB UUID | `550e8400-...` | Direct BPC token row |

**Priority:** `tokenKey` → `symbol` (legacy fallback only).

---

## TypeScript client (noderails-server)

Create `services/noderails-server/src/clients/bpc.client.ts`:

```typescript
const BPC_BASE = process.env.BPC_SERVICE_URL ?? 'https://api.bpc.noderails.com';
const TIMEOUT = Number(process.env.BPC_SERVICE_TIMEOUT_MS ?? 10_000);

interface BpcResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function bpcFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${BPC_BASE}${path}`, { ...init, signal: controller.signal });
    const json = (await res.json()) as BpcResponse<T>;
    if (!res.ok || !json.success || json.data === undefined) {
      throw new Error(json.error?.message ?? `BPC error ${res.status}`);
    }
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

export interface BpcPriceResult {
  symbol: string;
  currency: string;
  priceFiat: number;
  priceUsd: number;
  cachedAt: string;
  stale?: boolean;
}

export async function getPriceByTokenKey(
  tokenKey: string,
  currency = 'USD',
): Promise<BpcPriceResult> {
  const data = await bpcFetch<{
    symbol?: string;
    currency: string;
    price: number;
    cachedAt: string;
    stale?: boolean;
  }>(
    `/v1/prices?asset=${encodeURIComponent(tokenKey)}&currency=${encodeURIComponent(currency)}`,
  );

  const symbol = data.symbol ?? tokenKey.split('-')[0] ?? tokenKey;
  const price = data.price;
  return {
    symbol,
    currency: data.currency,
    priceFiat: price,
    priceUsd: currency.toUpperCase() === 'USD' ? price : price,
    cachedAt: data.cachedAt,
    stale: data.stale,
  };
}

export async function convertFiatToToken(
  tokenKey: string,
  fiatAmount: number,
  currency = 'USD',
): Promise<{ tokenAmount: string; priceFiat: number }> {
  const data = await bpcFetch<{ tokenAmount: string; price: number }>(
    `/v1/prices?asset=${encodeURIComponent(tokenKey)}&currency=${encodeURIComponent(currency)}&amountFiat=${fiatAmount}`,
  );
  return { tokenAmount: data.tokenAmount, priceFiat: data.price };
}

export async function getBalance(
  chainId: number,
  address: string,
  token = 'native',
  includePrice = false,
  currency = 'USD',
) {
  const params = new URLSearchParams({
    chainId: String(chainId),
    address,
    token,
    ...(includePrice ? { includePrice: 'true', currency } : {}),
  });
  return bpcFetch(`/v1/balance?${params}`);
}
```

---

## Migrating from inline CryptoCompare

### Before

```typescript
const currentPrice = await priceService.getPrice(token.symbol, logger, fiatCurrency);
const expectedTokenAmount = priceService.convertFiatToToken(fiatAmount, currentPrice.priceFiat);
```

### After

```typescript
import * as bpcClient from '../../clients/bpc.client.js';

const currentPrice = await bpcClient.getPriceByTokenKey(token.tokenKey, fiatCurrency);
const expectedTokenAmount = (fiatAmount / currentPrice.priceFiat).toFixed(token.decimals ?? 18);
```

Or one call:

```typescript
const { tokenAmount, priceFiat } = await bpcClient.convertFiatToToken(
  token.tokenKey,
  fiatAmount,
  fiatCurrency,
);
```

### Suggested noderails-server file changes

| File | Change |
|------|--------|
| `modules/payments/authorize.service.ts` | `getPriceByTokenKey(token.tokenKey)` |
| `modules/subscriptions/subscription.worker.ts` | Same |
| `modules/prices/price.routes.ts` | Proxy to BPC or deprecate |
| `modules/prices/price.service.ts` | Thin wrapper over BPC client during migration |

---

## Error handling

| HTTP | Code | Meaning | Action |
|------|------|---------|--------|
| 400 | `VALIDATION_ERROR` | Bad query/body | Fix request params |
| 404 | `NOT_FOUND` | Token/chain not registered | Add token in BPC Admin |
| 429 | `RATE_LIMITED` | >100 req/min per IP | Backoff and retry |
| 502 | `BLOCKCHAIN_ERROR` | All RPCs failed for chain | Check RPC Endpoints in admin |
| 500 | `INTERNAL_ERROR` | Server error | Check BPC logs / health |

Price responses may include `"stale": true` when live sources fail but a cached price is still served (up to 5 minutes).

---

## Local development

Run both services side by side:

| Service | Port | URL |
|---------|------|-----|
| WallCard API | 9080 | `http://localhost:9080` |
| WallCard signer | 9081 | `http://localhost:9081` |
| WallCard mobile web | 8090 or 8091 | `http://localhost:8090` (conflicts with BPC — use 8091) |
| BPC API | 8090 | `http://localhost:8090` |
| BPC Admin | 3010 | `http://localhost:3010` |

```bash
# Terminal 1 — BPC
cd noderails-bpc-service && pnpm start:local

# Terminal 2 — WallCard
cd noderailsCardNetwork && pnpm dev:server
```

WallCard `.env` for local (from `env-examples/wallcard/.env.integration.example`):

```bash
BALANCE_PROVIDER=http
BALANCE_SERVICE_URL=http://localhost:8090
```

If WallCard mobile web runs on `:8091`, add to WallCard `.env`:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:8091
```

---

## Production checklist

- [ ] `BALANCE_SERVICE_URL=https://api.bpc.noderails.com` + `BALANCE_PROVIDER=http` in WallCard API `.env` (or `BPC_SERVICE_URL` in legacy noderails-server)
- [ ] DNS `api.bpc.noderails.com` → server (Caddy TLS)
- [ ] All checkout tokens registered in BPC Admin with matching `tokenKey`
- [ ] Production RPC URLs per chain (not public dev RPCs from seed)
- [ ] Optional: CoinGecko / CryptoCompare / CoinCap API keys on BPC server
- [ ] `LEANRPC_API_KEY` set on BPC for EVM RPC failover
- [ ] Monitor `GET https://api.bpc.noderails.com/v1/health/details`

---

## Quick reference

```bash
# Production base
export BPC=https://api.bpc.noderails.com

# Health
curl "$BPC/health"
curl "$BPC/v1/health/details"

# Price by tokenKey (NodeRails standard)
curl "$BPC/v1/prices?asset=USDC-137&currency=USD"

# Checkout: fiat → tokens
curl "$BPC/v1/prices?asset=USDC-137&currency=USD&amountFiat=49.99"

# Balance + USD value
curl "$BPC/v1/balance?chainId=1&address=0x...&token=native&includePrice=true"

# Batch prices
curl -X POST "$BPC/v1/prices/batch" \
  -H "Content-Type: application/json" \
  -d '[{"asset":"ETH"},{"asset":"USDC-137"}]'
```

---

## Related docs

- [ENV.md](./ENV.md) — BPC server environment, Docker, Vercel admin, WallCard env templates
- [env-examples/wallcard/README](../env-examples/wallcard/README) — WallCard `.env` template index
- [README](../README.md) — repo overview and architecture
