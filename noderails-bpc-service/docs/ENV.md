# NodeRails BPC Service — Environment Variables

Secrets live in a local `.env` (gitignored). This file is the key catalog. Copy `.env.example` → `.env`, then `pnpm run dev` (scripts load it via `dotenv-cli`).

```bash
cp .env.example .env   # first time; fill in real values
pnpm run dev
```

Production Docker: copy `.env.example` → `.env` on the host, then `docker compose up -d`. Compose injects the file via `env_file`. Do not commit `.env`.

---

## Required (service will not start without these)

| Variable | Example | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://bpc:bpc@localhost:5433/bpc` | PostgreSQL for chains, tokens, RPC config (pooled URL on Neon) |
| `DIRECT_DATABASE_URL` | same as above locally; Neon **non-pooler** host for migrate | Prisma migrations — use direct host (no `-pooler`). Migrate scripts also set `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` for Neon. |
| `REDIS_URL` | `redis://127.0.0.1:6380` | Price cache + rate limiting (bundled Redis in `docker-compose.yml`, or external) |
| `JWT_SECRET` | `long-random-string-min-32-chars` | Admin access token signing |
| `JWT_REFRESH_SECRET` | `another-long-random-string` | Admin refresh cookie signing |

---

## Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8090` | BPC API port |
| `NODE_ENV` | `development` | `development` \| `production` |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |
| `CORS_ORIGIN` | `http://localhost:3010` | Admin dashboard origin (comma-separated allowed) |

---

## Admin dashboard

| Variable | Example | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | `admin@bpc.local` | Admin login email |
| `ADMIN_PASSWORD` | `changeme` | Admin login password (change in production) |
| `NEXT_PUBLIC_BPC_API_URL` | `https://bpc-api.example.com` | BPC API URL (Vercel build env + local dev) |

Local dev: copy `admin/.env.local.example` to `admin/.env.local`:

```bash
NEXT_PUBLIC_BPC_API_URL=http://localhost:8090
```

### Admin dashboard (Vercel)

Deploy the `admin/` app as its own Vercel project:

1. **Root Directory:** `admin` (repo includes `admin/vercel.json` for pnpm workspace install)
2. **Environment variable:** `NEXT_PUBLIC_BPC_API_URL` = your production BPC API URL (e.g. `https://bpc-api.noderails.io`)
3. **API CORS:** add the Vercel URL to `CORS_ORIGIN` on the BPC server:

```bash
CORS_ORIGIN=http://localhost:3010,https://bpc.noderails.com
```

Admin auth uses JWT from the BPC API (`POST /admin/auth/login`). No separate admin backend.

---

## Price sources (optional but recommended for production)

Free tier works without keys; keys improve rate limits and reliability.

| Variable | Required | Description |
|----------|----------|-------------|
| `COINGECKO_API_KEY` | No | [CoinGecko Demo API key](https://www.coingecko.com/en/api) |
| `CRYPTOCOMPARE_API_KEY` | No | [CryptoCompare API key](https://min-api.cryptocompare.com/) |
| `COINCAP_API_KEY` | No | [CoinCap API key](https://docs.coincap.io/) |

---

## 1inch (swap quotes)

Required for exact-out conversion quotes (`GET /v1/prices?quote=swap`). The API starts without a key; swap quotes fail with `ONEINCH_API_KEY is not configured` until it is set. Same key as NodeRails is fine.

| Variable | Default | Description |
|----------|---------|-------------|
| `ONEINCH_API_KEY` | (empty) | [1inch Developer Portal](https://portal.1inch.dev/) API key. **Required for swap quotes.** |
| `ONEINCH_BASE_URL` | `https://api.1inch.dev` | 1inch API host (no trailing slash) |
| `ONEINCH_TIMEOUT_MS` | `15000` | Quote request timeout |

---

## Tuning

| Variable | Default | Description |
|----------|---------|-------------|
| `PRICE_CACHE_TTL_SEC` | `30` | Fresh cache TTL before re-fetching sources |
| `PRICE_MAX_STALENESS_SEC` | `300` | Serve stale cache if all sources fail (5 min) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (1 min) |
| `RATE_LIMIT_MAX` | `100` | Max public API requests per IP per window |

---

## Local infrastructure (Docker)

BPC uses **different ports** than NodeRails to avoid conflicts:

| Service | Host port | Default URL |
|---------|-----------|-------------|
| PostgreSQL | `5433` | `postgresql://bpc:bpc@localhost:5433/bpc` |
| Redis | `6380` | `redis://localhost:6380` |

Start local Postgres + Redis:

```bash
pnpm docker:infra
# or: docker compose -f docker-compose.infra.yml up -d
```

NodeRails main stack typically uses `5432` / `6379` — they can run side-by-side.

---

## Production (Docker)

API + **Redis in compose**; Postgres external (Neon, or `docker-compose.infra.yml` locally). Admin runs on Vercel. Secrets come from the host `.env`.

```bash
cp .env.example .env    # on the host; fill production values
pnpm docker:build
pnpm docker:up          # Redis + migrate (once) + API on :8090
```

| Compose file | Purpose |
|--------------|---------|
| `docker-compose.yml` | API + Redis (`network_mode: host` for API, Redis on `127.0.0.1:6380`). Loads `.env` via `env_file`. |
| `docker-compose.infra.yml` | Local Postgres + Redis only (dev / optional) |

**Neon:** put `DATABASE_URL` (pooler) and `DIRECT_DATABASE_URL` (non-pooler) in `.env`. Run Caddy (or another reverse proxy) separately if you need TLS.

---

## First-time setup checklist

```bash
pnpm install
cp .env.example .env                           # if missing
cp admin/.env.local.example admin/.env.local   # if missing
pnpm start:local:seed                          # migrate + seed + API + Admin
```

## Run locally (no Docker)

Uses `DATABASE_URL` and `REDIS_URL` from `.env`.

```bash
pnpm start:local        # prestart: db:generate + migrate, then API + Admin
pnpm start:local:seed   # seed first (first time only), then start:local
```

| URL | Service |
|-----|---------|
| http://localhost:8090 | API |
| http://localhost:3010 | Admin |

Individual scripts: `pnpm dev:server`, `pnpm dev:admin`, `pnpm db:seed`

---

## Production notes

- Use strong `JWT_SECRET` / `JWT_REFRESH_SECRET` (32+ random chars)
- Set `NODE_ENV=production`
- Point `DATABASE_URL` / `REDIS_URL` to managed Postgres + Redis
- Add RPC URLs per chain in Admin → RPC Endpoints (public RPCs in seed are dev-only)
- Register every checkout token in Admin → Tokens with `tokenKey` matching NodeRails (`USDC-137`)
- Optional: put BPC behind internal network; public API has no API key today (rate-limited by IP)

---

## Health checks

```bash
curl http://localhost:8090/health
curl http://localhost:8090/v1/health/details
```

Expected: `{ "status": "ok", "db": true, "redis": true, ... }`

---

## WallCard (noderailsCardNetwork) env templates

Reference copies of WallCard `.env` templates live under **`env-examples/wallcard/`** so BPC and WallCard can be configured from one place.

| File | Use |
|------|-----|
| `env-examples/wallcard/.env.local.example` | WallCard repo-root `.env` for local dev |
| `env-examples/wallcard/.env.production.api.example` | WallCard API EC2 |
| `env-examples/wallcard/.env.production.signer.example` | WallCard signer EC2 |
| `env-examples/wallcard/.env.production.frontend.example` | Vercel + EAS production |
| `env-examples/wallcard/.env.preview.frontend.example` | EAS preview builds |
| `env-examples/wallcard/.env.integration.example` | BPC vars to append to WallCard `.env` |

```bash
# Copy WallCard local env from this repo
cp env-examples/wallcard/.env.local.example ../noderailsCardNetwork/.env
cat env-examples/wallcard/.env.integration.example >> ../noderailsCardNetwork/.env
```

**Port note:** BPC defaults to `:8090`, same as WallCard Expo web. Run WallCard mobile on `EXPO_WEB_PORT=8091` when both services run locally, and add `CORS_ALLOWED_ORIGINS=http://localhost:8091` on the WallCard API.

Integration details: [INTEGRATION.md](./INTEGRATION.md).
