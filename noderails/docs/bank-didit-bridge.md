# Bank providers: Didit and Bridge

Ops notes for own-account identity (Didit) and global bank accounts (Bridge). All secrets go in Doppler **backend** configs only.

- Doppler project: `noderails`
- Local: `dev_backend`
- Production: `prd_backend`
- Do **not** put these in `dev_frontend` / `prd_frontend`

Opening-fee NodeRails project id + secret key are **not** Doppler. Paste them on **Admin → Bank**.

---

## Why sandbox and production have separate webhook URLs

We did not use one shared `/webhooks/didit` or `/webhooks/bridge`.

Each environment has its **own API key and its own webhook secret / PEM**. Didit sandbox is a second Didit application (same host, different key). Bridge sandbox is `api.sandbox.bridge.xyz` with `sk-test…` and a different webhook public key.

If one URL handled both:

1. You would have to pick a secret before you know which world the event came from.
2. A sandbox Didit event (`environment: "sandbox"`) could be checked with the live HMAC, fail, and then be retried against the wrong secret — or worse, verified with the sandbox secret and applied to a live merchant profile.
3. Bridge is RSA per webhook endpoint. The PEM Bridge gives you is **for that URL**. Live and sandbox are two webhook objects, two PEMs. One route cannot verify both signatures correctly without guessing.
4. TEST and PRODUCTION Bank profiles must never share a Didit session or Bridge customer. Separate URLs make that isolation explicit: `/webhooks/didit-sandbox` only updates TEST rows; `/webhooks/didit` only updates PRODUCTION rows.

A single route that inspects a body field (`environment`, `livemode`) and then selects a secret is weaker: you must parse JSON before verify, and you trust a client-supplied field to choose the key. We verify with the secret that belongs to that URL, then ignore a payload whose `environment` does not match.

| Provider | TEST / sandbox URL | PRODUCTION / live URL |
|---|---|---|
| Didit | `{API_PUBLIC_URL}/webhooks/didit-sandbox` | `{API_PUBLIC_URL}/webhooks/didit` |
| Bridge | `{API_PUBLIC_URL}/webhooks/bridge-sandbox` | `{API_PUBLIC_URL}/webhooks/bridge` |
| Opening fee checkout | `{API_PUBLIC_URL}/webhooks/bank-fee-test` | `{API_PUBLIC_URL}/webhooks/bank-fee` |

`API_PUBLIC_URL` must be reachable from the internet (HTTPS in production). Localhost only works if you tunnel it (ngrok, etc.).

---

## Shared backend URLs (confirm these exist)

| Key | Local `dev_backend` | Prod `prd_backend` |
|---|---|---|
| `API_PUBLIC_URL` | `http://localhost:8080` or your ngrok HTTPS URL | Public API origin, no trailing slash |
| `DASHBOARD_URL` | `http://localhost:3001` | Live dashboard origin |
| `PAYMENT_UI_URL` | `http://localhost:3002` | Live checkout origin |
| `BLOXFI_API_KEY` | Existing BloxFi key | Live BloxFi key |

`DASHBOARD_URL` is used for Didit HTTPS callback to `/identity-callback` and for Bank page links. HTTP localhost dashboards omit the Didit callback so the iframe is not mixed-content blocked; we poll session status instead.  
`PAYMENT_UI_URL` is used to build the yearly opening-fee checkout link.  
`BLOXFI_API_KEY` is required to create the offramp beneficiary after admin approves an own account.

---

## Didit (own-account KYC / KYB)

Same API host for live and sandbox: `https://verification.didit.me`. Sandbox is a **second Didit application** (separate API key, workflows, webhook secret).

| Key | Required | What it is |
|---|---|---|
| `DIDIT_API_KEY` | For Production Bank | Live app API key |
| `DIDIT_WORKFLOW_KYC` | For Production individual | Live KYC workflow id |
| `DIDIT_WORKFLOW_KYB` | For Production business | Live KYB workflow id |
| `DIDIT_WEBHOOK_SECRET` | For Production webhooks | Live HMAC secret (Signature V2) |
| `DIDIT_SANDBOX_API_KEY` | For Test Bank | Sandbox app API key |
| `DIDIT_SANDBOX_WORKFLOW_KYC` | For Test individual | Sandbox KYC workflow id |
| `DIDIT_SANDBOX_WORKFLOW_KYB` | For Test business | Sandbox KYB workflow id |
| `DIDIT_SANDBOX_WEBHOOK_SECRET` | For Test webhooks | Sandbox HMAC secret |
| `DIDIT_API_URL` | Optional | Default `https://verification.didit.me` |

In the Didit dashboard, create two webhook endpoints (V2 signature):

- Live app → `{API_PUBLIC_URL}/webhooks/didit`
- Sandbox app → `{API_PUBLIC_URL}/webhooks/didit-sandbox`

Copy each webhook secret into the matching `DIDIT_*_WEBHOOK_SECRET`. We verify `X-Signature-V2` + `X-Timestamp` (reject if timestamp is older than 300 seconds). We do not use Simple signature as the only check.

---

## Bridge (global bank accounts)

| Key | Required | What it is |
|---|---|---|
| `BRIDGE_API_KEY` | For Production Bank | Live API key |
| `BRIDGE_API_URL` | Optional | Default `https://api.bridge.xyz` |
| `BRIDGE_WEBHOOK_PUBLIC_KEY` | For Production webhooks | PEM from the **live** webhook create response |
| `BRIDGE_SANDBOX_API_KEY` | For Test Bank | Sandbox key (`sk-test…`) |
| `BRIDGE_SANDBOX_API_URL` | Optional | Default `https://api.sandbox.bridge.xyz` |
| `BRIDGE_SANDBOX_WEBHOOK_PUBLIC_KEY` | For Test webhooks | PEM from the **sandbox** webhook create response |
| `BRIDGE_TIMEOUT_MS` | Optional | Default `20000` |

Bridge webhooks are **RSA-SHA256**, not HMAC. Header: `X-Webhook-Signature: t=<ms>,v0=<base64>`. Each webhook URL has its own PEM. If you store the PEM as one line, keep `\n` for newlines; the server expands those.

Create two webhooks (they start **disabled**; enable after a test event verifies):

- Live → `{API_PUBLIC_URL}/webhooks/bridge`  
  Subscribe at least `customer` and `virtual_account.activity`
- Sandbox → `{API_PUBLIC_URL}/webhooks/bridge-sandbox`  
  Same event types. Sandbox does **not** fire real payment activity; use Admin / merchant Test **Simulate inbound** for activity UI.

Paste the returned public key into `BRIDGE_WEBHOOK_PUBLIC_KEY` or `BRIDGE_SANDBOX_WEBHOOK_PUBLIC_KEY`.

---

## Not Doppler: opening fee checkout

On **Admin → Bank**, after you create two NodeRails apps (one TEST, one PRODUCTION):

- Individual USD / year (default `30`)
- Business USD / year (default `40`)
- TEST project id + secret key
- PRODUCTION project id + secret key

Save. The server registers `payment.captured` on that app:

- TEST → `{API_PUBLIC_URL}/webhooks/bank-fee-test`
- PRODUCTION → `{API_PUBLIC_URL}/webhooks/bank-fee`

Do not put fee API keys in `dev_frontend`. Admin GET masks secrets (last 4 only).

---

## Minimum to try Test Bank locally

Set in `dev_backend`:

```
DIDIT_SANDBOX_API_KEY=
DIDIT_SANDBOX_WORKFLOW_KYC=
DIDIT_SANDBOX_WORKFLOW_KYB=
DIDIT_SANDBOX_WEBHOOK_SECRET=
BRIDGE_SANDBOX_API_KEY=
BRIDGE_SANDBOX_WEBHOOK_PUBLIC_KEY=
API_PUBLIC_URL=          # ngrok HTTPS if Didit/Bridge must reach your laptop
DASHBOARD_URL=http://localhost:3001
PAYMENT_UI_URL=http://localhost:3002
```

Then paste a TEST fee-collector app id + secret on Admin → Bank.

Live Didit / Bridge keys can wait until someone uses **Production** on the merchant Bank page.

---

## Quick checklist

1. Add the keys above to `dev_backend` (and later `prd_backend`).
2. Point Didit + Bridge webhooks at the matching URLs.
3. `API_PUBLIC_URL` is HTTPS and reachable (or tunneled).
4. Create TEST (and later PRODUCTION) NodeRails apps; paste id + secret on Admin → Bank.
5. Enable Bridge webhooks only after a signed ping succeeds.
6. Restart the API process so Doppler picks up new secrets (`pnpm` server uses `dev_backend`).
