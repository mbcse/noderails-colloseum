# NodeRails integration with Fraud Engine

The Solana wallet screening service lives in the sibling directory `noderails-fraud-engine` next to this monorepo. Full HTTP reference: `../noderails-fraud-engine/docs/API.md` from the monorepo root.

## Environment variables on NodeRails

Add these to the NodeRails `.env` used by `@noderails/server`:

| Variable                     | Required | Purpose |
|-----------------------------|----------|---------|
| `FRAUD_ENGINE_URL`          | For screening calls | Base URL, for example `http://127.0.0.1:8788` or `https://fraud-engine.internal.yourdomain.com` |
| `FRAUD_ENGINE_CLIENT_TOKEN` | If the engine sets `FRAUD_ENGINE_API_TOKEN` | Same shared secret; sent as `Authorization: Bearer` |

Do not expose `FRAUD_ENGINE_CLIENT_TOKEN` to Next.js public env vars. Keep it server-side only.

## Suggested usage

Call the engine before high-risk actions (manual treasury payouts, elevated merchant limits, or disputed settlements). Parse `data.assessment.tier` and `data.assessment.score` from the JSON response described in the fraud engine API reference.

## Deployment topology

Typical layout:

1. Run `noderails-fraud-engine` as its own process (`npm run start` in that repo after build).
2. Store only `GOLDRUSH_API_KEY` on the fraud engine host.
3. NodeRails holds no GoldRush key; it calls the engine over HTTP with the optional bearer token.

Endpoint catalog and error codes are maintained in `noderails-fraud-engine/docs/API.md`.
