# MTXM — Project API Integration Guide

## What is MTXM?

**Multichain Transaction Manager (MTXM)** is a transaction management backend for EVM-compatible blockchains. It handles the heavy lifting of blockchain transactions — nonce management, signing, broadcasting, confirmation tracking, stuck-transaction recovery, and gas optimization — so your application doesn't have to.

You submit a transaction via a single API call, and MTXM takes care of the rest through an asynchronous queue pipeline. You get notified of every state change via webhooks.

### Transaction Lifecycle

```
QUEUED → SIGNING → SIGNED → BROADCASTING → BROADCAST → CONFIRMED
                                                      → FAILED
                                                      → STUCK → SPEED_UP / CANCELLED
```

---

## Authentication

All project API calls require the **`X-API-Key`** header. You receive your API key when a project is created in the MTXM dashboard.

```
X-API-Key: mtxm_aBcDeFgH1234567890...
```

> If your API key is compromised, regenerate it from the dashboard. The old key is invalidated immediately.

---

## Base URL

```
https://your-mtxm-host/api/v1/projects/:projectId
```

All project-scoped endpoints live under `/api/v1/projects/:projectId`. Replace `:projectId` with your project's ID (available in the dashboard).

### Response Envelope

Every response follows this shape:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

---

## Rate Limits

| Scope         | Limit            |
|---------------|------------------|
| General       | 100 req / 15 min |
| Send / Sign   | 30 req / 1 min   |

When rate-limited, you receive a `429` response. Back off and retry.

---

## Transactions

The core of MTXM. Submit a transaction and let the pipeline handle signing, broadcasting, and confirmation.

### Send a Transaction

```
POST /api/v1/projects/:projectId/transactions/send
```

**Headers:**
```
X-API-Key: mtxm_...
Content-Type: application/json
```

**Request body:**
```json
{
  "chainId": "clx...",
  "to": "0xRecipientAddress0000000000000000000000",
  "value": "1000000000000000000",
  "data": "0x",
  "gasLimit": "21000",
  "metadata": { "orderId": "ord_abc123", "userId": "usr_456" }
}
```

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `chainId`  | string | ✅       | Database ID of the chain (from the Chains API) |
| `to`       | string | ✅       | Recipient Ethereum address (`0x` + 40 hex chars) |
| `value`    | string | ❌       | Amount in **wei** as a non-negative integer string. `"0"` or omit for contract calls. |
| `data`     | string | ❌       | Hex-encoded calldata starting with `0x`. Omit for plain ETH transfers. |
| `gasLimit` | string | ❌       | Gas limit as a positive integer string. Auto-estimated if omitted. |
| `metadata` | object | ❌       | Arbitrary JSON object — stored with the tx and included in webhook payloads. Use it to correlate with your own records. |

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "QUEUED",
    "chainId": "clx...",
    "to": "0x...",
    "value": "1000000000000000000",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

> The returned `id` is your reference for this transaction. Track it via webhooks or polling.

---

### Sign EIP-712 Typed Data

Sign structured data off-chain (e.g. `permit`, gasless approvals, meta-transactions) without broadcasting anything.

```
POST /api/v1/projects/:projectId/transactions/sign-typed
```

**Request body:**
```json
{
  "chainId": "clx...",
  "domain": {
    "name": "MyToken",
    "version": "1",
    "chainId": 1,
    "verifyingContract": "0xContractAddress..."
  },
  "types": {
    "Permit": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" },
      { "name": "value", "type": "uint256" },
      { "name": "nonce", "type": "uint256" },
      { "name": "deadline", "type": "uint256" }
    ]
  },
  "value": {
    "owner": "0x...",
    "spender": "0x...",
    "value": "1000000000000000000",
    "nonce": 0,
    "deadline": 1700000000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signature": "0xSignatureHex...",
    "signer": "0xSignerAddress..."
  }
}
```

---

### List Transactions

Paginated list with optional filters.

```
GET /api/v1/projects/:projectId/transactions
```

**Query parameters:**

| Param     | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `status`  | string | —       | `QUEUED`, `SIGNING`, `SIGNED`, `BROADCASTING`, `BROADCAST`, `CONFIRMED`, `FAILED`, `STUCK`, `SPEED_UP`, `CANCELLED` |
| `chainId` | string | —       | Filter by chain DB ID |
| `from`    | string | —       | Filter by sender address |
| `to`      | string | —       | Filter by recipient address |
| `page`    | number | `1`     | Page number |
| `limit`   | number | `20`    | Items per page (max `100`) |

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "clx...",
        "status": "CONFIRMED",
        "txHash": "0x...",
        "from": "0xSignerAddress...",
        "to": "0xRecipient...",
        "value": "1000000000000000000",
        "chainId": "clx...",
        "nonce": 42,
        "gasLimit": "21000",
        "gasPrice": "20000000000",
        "blockNumber": 19000000,
        "attempts": 1,
        "metadata": { "orderId": "ord_abc123" },
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:01:00.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

### Get Transaction by ID

```
GET /api/v1/projects/:projectId/transactions/:txId
```

Returns the full transaction object (same shape as a single item in the list above).

---

## Webhooks

Subscribe to real-time notifications about transaction state changes. MTXM sends a `POST` request to your URL whenever a subscribed event fires.

### Create a Webhook

```
POST /api/v1/projects/:projectId/webhooks
```

**Request body:**
```json
{
  "url": "https://yourapp.com/mtxm-webhook",
  "events": ["tx.confirmed", "tx.failed", "tx.stuck"]
}
```

**Available events:**

| Event              | Fires when |
|--------------------|------------|
| `tx.signing`       | Transaction picked up for signing |
| `tx.signed`        | Signed successfully |
| `tx.broadcasting`  | Submitted to the network |
| `tx.broadcast`     | Network accepted the transaction |
| `tx.confirmed`     | Confirmed on-chain ✅ |
| `tx.failed`        | Failed permanently ❌ |
| `tx.stuck`         | Detected as stuck (pending too long) |
| `tx.cancelled`     | Stuck transaction was cancelled |
| `tx.speed_up`      | Replacement tx sent with higher gas |

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "url": "https://yourapp.com/mtxm-webhook",
    "events": ["tx.confirmed", "tx.failed", "tx.stuck"],
    "secret": "whsec_aBcDeFgH...",
    "isActive": true
  }
}
```

> ⚠️ **Save the `secret` immediately.** It is shown only once and is needed to verify webhook signatures.

---

### Webhook Payload

When an event fires, MTXM sends:

```
POST https://yourapp.com/mtxm-webhook
Content-Type: application/json
X-Signature-256: sha256=<hmac-sha256-hex>
X-Webhook-Event: tx.confirmed
X-Delivery-Id: dlv_...
```

The **body** is JSON. MTXM signs the **exact UTF-8 body** (canonical JSON, keys sorted) with HMAC-SHA256 using your endpoint secret.

```json
{
  "event": "tx.confirmed",
  "timestamp": "2025-01-01T00:01:00.000Z",
  "data": {
    "transactionId": "clx...",
    "status": "CONFIRMED",
    "hash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "value": "1000000000000000000",
    "chainId": 1,
    "blockNumber": 19000000,
    "metadata": { "orderId": "ord_abc123" }
  }
}
```

### Verifying Signatures

Every delivery includes an **`X-Signature-256`** header with value **`sha256=<hex>`**, where `<hex>` is HMAC-SHA256(secret, rawBody) in hexadecimal.

**Critical:** You must verify using the **raw request body** (the exact bytes received), **before** any JSON parsing. Parsing and re-stringifying changes key order and breaks verification.

```javascript
import crypto from "crypto";

function verifyWebhook(secret, rawBody, signatureHeader) {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const receivedHex = signatureHeader.slice(7); // after "sha256="
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(receivedHex, "hex"),
  );
}

// Express: read raw body first (e.g. express.raw() for webhook route, or express.json() only after you've buffered raw body)
app.post("/mtxm-webhook", express.raw({ type: "application/json" }), (req, res) => {
  const rawBody = req.body.toString("utf8"); // Buffer
  const valid = verifyWebhook(WEBHOOK_SECRET, rawBody, req.headers["x-signature-256"]);
  if (!valid) return res.status(401).send("Invalid signature");
  const payload = JSON.parse(rawBody);
  // ...
});
```

> Use constant-time comparison (`timingSafeEqual`) to prevent timing attacks.

---

### List Webhooks

```
GET /api/v1/projects/:projectId/webhooks
```

Returns all webhooks for the project. **Secrets are never included in list responses.**

---

### Update a Webhook

```
PATCH /api/v1/projects/:projectId/webhooks/:webhookId
```

```json
{
  "url": "https://newurl.com/hook",
  "events": ["tx.confirmed", "tx.failed"],
  "isActive": false
}
```

All fields are optional.

---

### Delete a Webhook

```
DELETE /api/v1/projects/:projectId/webhooks/:webhookId
```

Returns `204 No Content`.

---

### Rotate Webhook Secret

```
POST /api/v1/projects/:projectId/webhooks/:webhookId/rotate-secret
```

Generates a new secret. The old secret stops working immediately. Returns the new secret (shown only once).

---

### Test a Webhook

```
POST /api/v1/projects/:projectId/webhooks/:webhookId/test
```

Sends a `ping` event to your endpoint to verify connectivity.

---

### View Delivery History

```
GET /api/v1/projects/:projectId/webhooks/:webhookId/deliveries
```

| Param        | Type   | Default | Description |
|--------------|--------|---------|-------------|
| `event`      | string | —       | Filter by event type |
| `statusCode` | number | —       | Filter by HTTP response status |
| `page`       | number | `1`     | |
| `limit`      | number | `20`    | Max `100` |

---

## Chains

Chains represent the EVM networks your project operates on.

### List Chains

```
GET /api/v1/projects/:projectId/chains
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "name": "Ethereum Mainnet",
      "chainId": 1,
      "rpcUrls": ["https://eth.llamarpc.com"],
      "explorerUrl": "https://etherscan.io",
      "nativeCurrency": "ETH",
      "isTestnet": false,
      "isActive": true
    }
  ]
}
```

> Use the `id` field (database ID) as `chainId` when sending transactions — not the numeric chain ID.

### Add a Chain

```
POST /api/v1/projects/:projectId/chains
```

```json
{
  "name": "Polygon",
  "chainId": 137,
  "rpcUrls": ["https://polygon-rpc.com"],
  "explorerUrl": "https://polygonscan.com",
  "nativeCurrency": "MATIC",
  "isTestnet": false
}
```

| Field            | Type     | Required | Notes |
|------------------|----------|----------|-------|
| `name`           | string   | ✅       | Max 100 chars |
| `chainId`        | number   | ✅       | Numeric EVM chain ID (e.g. `1`, `137`, `42161`) |
| `rpcUrls`        | string[] | ✅       | At least one valid URL. Multiple URLs enable failover. |
| `explorerUrl`    | string   | ❌       | Block explorer base URL |
| `nativeCurrency` | string   | ✅       | Symbol — `"ETH"`, `"MATIC"`, etc. (max 10 chars) |
| `isTestnet`      | boolean  | ✅       | |

### Update a Chain

```
PATCH /api/v1/projects/:projectId/chains/:chainDbId
```

All fields optional: `name`, `rpcUrls`, `explorerUrl`, `isActive`.

### Delete a Chain

```
DELETE /api/v1/projects/:projectId/chains/:chainDbId
```

Returns `204 No Content`.

---

## Signers

Signers are the Ethereum wallets that sign and send transactions on behalf of your project.

### List Signers

```
GET /api/v1/projects/:projectId/signers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "label": "Hot Wallet 1",
      "address": "0xAbC...123",
      "adapterType": "ENV",
      "isActive": true,
      "isMaster": false
    }
  ]
}
```

> Private key material is **never** returned by any endpoint.

### Create a Signer

```
POST /api/v1/projects/:projectId/signers
```

**ENV adapter** — MTXM generates and encrypts a new private key:
```json
{
  "label": "Hot Wallet 1",
  "adapterType": "ENV"
}
```

**KMS adapter** — uses an existing AWS KMS key for signing:
```json
{
  "label": "KMS Signer",
  "adapterType": "KMS",
  "kmsKeyId": "arn:aws:kms:us-east-1:123456:key/abcd-1234"
}
```

| Field         | Type   | Required | Notes |
|---------------|--------|----------|-------|
| `label`       | string | ✅       | Human-friendly name (max 100 chars) |
| `adapterType` | enum   | ✅       | `"ENV"` — server-managed key, `"KMS"` — AWS KMS |
| `kmsKeyId`    | string | ❌       | **Required** when `adapterType` is `"KMS"` |

### Get Signer Detail

```
GET /api/v1/projects/:projectId/signers/:signerId/detail
```

Returns on-chain balances and nonce data across all configured chains:

```json
{
  "success": true,
  "data": {
    "signer": { "id": "...", "label": "Hot Wallet 1", "address": "0x..." },
    "chains": [
      {
        "chainId": 1,
        "name": "Ethereum Mainnet",
        "balance": "1.234",
        "nonce": 42,
        "pendingTxCount": 2
      }
    ]
  }
}
```

### Set / Unset Master Wallet

The **master wallet** is a designated signer that auto-funds other signers when their native balance drops below the configured threshold.

```
POST /api/v1/projects/:projectId/signers/:signerId/set-master
POST /api/v1/projects/:projectId/signers/:signerId/unset-master
```

### Manually Fund a Signer

Trigger an immediate funding transfer from the master wallet to the target signer on a specific chain.

```
POST /api/v1/projects/:projectId/signers/:signerId/fund
```

```json
{
  "chainDbId": "clx..."
}
```

---

## Error Reference

| HTTP Status | Meaning |
|-------------|---------|
| `400`       | Validation error — check request body or parameters |
| `401`       | Unauthorized — missing or invalid API key |
| `403`       | Forbidden — insufficient permissions |
| `404`       | Resource not found |
| `422`       | Unprocessable — business logic error (e.g. no funded signer, inactive chain) |
| `429`       | Rate limited — back off and retry |
| `500`       | Internal server error |

---

## Quick-Start Checklist

1. **Get your API key** — copy it from the MTXM dashboard after creating a project.
2. **Add chains** — register the EVM networks you need (`POST .../chains`).
3. **Create signers** — provision wallets and fund them with native tokens (`POST .../signers`).
4. **Set up webhooks** — subscribe to `tx.confirmed` and `tx.failed` at minimum (`POST .../webhooks`).
5. **Send transactions** — submit via `POST .../transactions/send` and track via webhooks.

```bash
# Example: send a transaction
curl -X POST https://your-mtxm-host/api/v1/projects/YOUR_PROJECT_ID/transactions/send \
  -H "X-API-Key: mtxm_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": "CHAIN_DB_ID",
    "to": "0xRecipientAddress...",
    "value": "1000000000000000000"
  }'
```
