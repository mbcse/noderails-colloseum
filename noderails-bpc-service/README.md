# NodeRails BPC Service

Multichain **Balance & Price Check** microservice for EVM, Solana, and Sui.

## Features

- **Balance API** — native and token balances (ERC-20, SPL, Sui coins) with RPC failover
- **Price API** — aggregated prices in USD/EUR from multiple CEX and DEX sources
- **RPC Failover** — multiple RPC endpoints per chain with circuit breaker and health checks
- **Admin Dashboard** — manage chains, RPCs, tokens, and price sources
- **Redis caching** — short TTL price cache with stale fallback

## Quick Start (no Docker)

Uses Postgres + Redis from `.env` (Neon, Redis Cloud, etc.).

```bash
pnpm install
pnpm start:local:seed   # first time
pnpm start:local          # every time after
```

| URL | Service |
|-----|---------|
| https://api.bpc.noderails.com | API (production) |
| http://localhost:8090 | API (local) |
| http://localhost:3010 | Admin dashboard (local) |

Admin login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

## Docker (production API)

API only. Admin dashboard deploys separately on **Vercel** (see [docs/ENV.md](docs/ENV.md#admin-dashboard-vercel)).

Same layout as NodeRails: external Postgres (Neon), Redis in compose, `network_mode: host` for API:

```bash
pnpm docker:infra          # optional local Postgres:5433 (skip if using Neon)
cp .env.example .env       # REDIS_URL=redis://127.0.0.1:6380
pnpm docker:build && pnpm docker:up
```

See [docs/ENV.md](docs/ENV.md#production-docker) for Neon `DIRECT_DATABASE_URL`.

### npm scripts

| Script | What it does |
|--------|----------------|
| `pnpm start:local` | generate + migrate + API + Admin |
| `pnpm start:local:seed` | seed + start:local (first time) |
| `pnpm dev` | API + Admin only (no migrate) |
| `pnpm dev:server` | API only |
| `pnpm dev:admin` | Admin only |

- API (prod): https://api.bpc.noderails.com
- API (local): http://localhost:8090
- Admin (local): http://localhost:3010
- OpenAPI: https://api.bpc.noderails.com/v1/openapi.json

## Documentation

| Doc | Audience |
|-----|----------|
| [docs/ENV.md](docs/ENV.md) | Env vars, Docker, first-time setup |
| [docs/INTEGRATION.md](docs/INTEGRATION.md) | **NodeRails server** — how to call BPC APIs |

## API Endpoints

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | **`/v1/prices?asset=&currency=USD`** | **Unified price lookup (primary)** |
| GET | `/v1/prices?asset=ETH&amountFiat=100` | Convert fiat → tokens |
| GET | `/v1/prices?asset=USDC-137&currency=EUR` | Price by tokenKey |
| GET | `/v1/prices?asset=0x...-1` | Price by contract-chainId |
| GET | `/v1/prices?asset=<token-uuid>` | Price by registered DB token id |
| GET | `/v1/balance?chainId=&address=&token=&includePrice=true&currency=USD` | Single balance with optional USD/EUR value |
| POST | `/v1/balance/batch` | Batch balances (`{ items, includePrice, currency }`) |
| GET | `/v1/health/details` | Detailed system health |
| GET | `/v1/prices/:symbol?currency=USD` | Price by symbol (legacy) |
| GET | `/v1/prices/by-contract?chainId=&address=` | Price by contract (legacy) |
| GET | `/v1/prices/convert?asset=&amountFiat=` | Fiat/token conversion |
| POST | `/v1/prices/batch` | Batch prices (`[{ asset: "USDC-137" }]`) |

### Admin

All under `/admin/*` with JWT auth. Login via `POST /admin/auth/login`.

## Unified `asset` parameter

One query param for all price lookups:

| Format | Example | Resolves via |
|--------|---------|--------------|
| Symbol | `ETH`, `SOL` | CEX adapters |
| Token key | `USDC-137` | DB registry (`SYMBOL-CHAINID`) |
| Contract + chain | `0xa0b8...-1` | On-chain / DEX adapters |
| Native + chain | `native-1` | Chain native currency |
| DB token id | `550e8400-e29b-...` | Registered token row |

```http
GET /v1/prices?asset=ETH&currency=USD
GET /v1/prices?asset=USDC-137&currency=EUR
GET /v1/prices?asset=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48-1
GET /v1/prices?asset=<token-uuid>&amountFiat=100
```

## Price Sources

Modular adapters: CoinGecko, CryptoCompare, CoinCap, Kraken, Binance, DefiLlama, GeckoTerminal, DexScreener, Jupiter, Frankfurter FX.

Add a new source by implementing `PriceSourceAdapter` in `server/src/modules/prices/sources/` and registering in `sources/index.ts`.

## Architecture

Follows NodeRails conventions: module-based Express (`*.routes.ts` + `*.service.ts`), Zod validation, structured JSON logging, Prisma + PostgreSQL, Redis caching.
