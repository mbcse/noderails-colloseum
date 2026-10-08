# MTXM — Project API Integration Guide

## What is MTXM?

**Multichain Transaction Manager (MTXM)** is a transaction management backend for EVM and Solana blockchains. It handles the heavy lifting of blockchain transactions — nonce management (EVM), signing, broadcasting, confirmation tracking, stuck-transaction recovery (EVM), and gas optimization (EVM) — so your application doesn't have to.

You submit a transaction via a single API call, and MTXM takes care of the rest through an asynchronous queue pipeline. You get notified of every state change via webhooks.

### Supported Chains

- **EVM**: Ethereum, Polygon, Arbitrum, Optimism, and other EVM-compatible networks
- **Solana**: Mainnet, Devnet, and Testnet

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

#### EVM Transaction

**Request body:**
```json
{
  "chainId": 1,
  "to": "0xRecipientAddress0000000000000000000000",
  "value": "1000000000000000000",
  "data": "0x",
  "gasLimit": "21000",
  "metadata": { "orderId": "ord_abc123", "userId": "usr_456" }
}
```

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `chainId`  | string | ✅       | Public chain/network ID for the chain you selected. For EVM this is the numeric chain ID like `1`, `137`, `42161`; for Solana use `101` (testnet), `102` (devnet), or `103` (mainnet). DB ids are still accepted for backward compatibility. |
| `to`       | string | ✅       | Recipient Ethereum address (`0x` + 40 hex chars) |
| `value`    | string | ❌       | Amount in **wei** as a non-negative integer string. `"0"` or omit for contract calls. |
| `data`     | string | ❌       | Hex-encoded calldata starting with `0x`. Omit for plain ETH transfers. |
| `gasLimit` | string | ❌       | Gas limit as a positive integer string. Auto-estimated if omitted. |
| `metadata` | object | ❌       | Arbitrary JSON object — stored with the tx and included in webhook payloads. Use it to correlate with your own records. |

#### Solana Native SOL Transfer

**Request body:**
```json
{
  "chainId": 101,
  "to": "<recipient-public-key>",
  "value": "1.5",
  "metadata": { "orderId": "ord_abc123" }
}
```

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `chainId` | string | ✅       | Public Solana network ID. Use `101` for Testnet, `102` for Devnet, or `103` for Mainnet. |
| `to`      | string | ✅       | Recipient Solana public key (base58) |
| `value`   | string | ❌       | Amount in **SOL** (not lamports). Decimal supported. Omit for `0`. |
| `metadata`| object | ❌       | Arbitrary JSON metadata. |

#### Solana Generic Program Transaction (Instructions)

**Request body:**
```json
{
  "chainId": 101,
  "to": "<primary-program-id>",
  "solana": {
    "instructions": [
      {
        "programId": "TokenkegQfeZyiNwAJsyFbPVwwQQfuM32jjMknqcjiL",
        "keys": [
          { "pubkey": "<account-key>", "isSigner": false, "isWritable": true },
          { "pubkey": "<signer-key>", "isSigner": true, "isWritable": false }
        ],
        "dataBase64": "AQAAAAAAAAAAAAwA"
      }
    ],
    "cuLimit": 200000,
    "cuPriceMicroLamports": 1000
  },
  "metadata": {}
}
```

| Field                  | Type   | Required | Description |
|------------------------|--------|----------|-------------|
| `chainId`              | string | ✅       | Public Solana network ID. Use `101` for Testnet, `102` for Devnet, or `103` for Mainnet. |
| `to`                   | string | ✅       | Primary program ID (for indexing; first instruction typically uses this) |
| `solana.instructions`  | array  | ✅       | Array of Solana instructions (min 1) |
| `solana.cuLimit`       | number | ❌       | Compute units limit for the transaction |
| `solana.cuPriceMicroLamports` | number | ❌       | Compute unit price in micro-lamports |

**Instruction object:**

| Field        | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `programId`  | string | ✅       | Program ID (base58 public key) |
| `keys`       | array  | ✅       | Array of account metas (min 1) |
| `dataBase64` | string | ❌       | Base64-encoded instruction data. Omit for empty data. |

**Account meta:**

| Field        | Type    | Required | Description |
|--------------|---------|----------|-------------|
| `pubkey`     | string  | ✅       | Account public key (base58) |
| `isSigner`   | boolean | ✅       | Whether this account must sign. Only the assigned signer (from dashboard) is allowed to be `true`. |
| `isWritable` | boolean | ✅       | Whether the account is writable. |

#### Solana Advanced: Raw Transaction (v0 / Address Lookup Tables)

**Request body:**
```json
{
  "chainId": 101,
  "signerId": "<dashboard-signer-key-id>",
  "to": "<indexing-field>",
  "solana": {
    "transactionBase64": "<unsigned-solana-tx-serialized-and-base64-encoded>"
  },
  "metadata": {}
}
```

| Field                      | Type   | Required | Description |
|----------------------------|--------|----------|-------------|
| `chainId`                  | string | ✅       | Public Solana network ID. Use `101` for Testnet, `102` for Devnet, or `103` for Mainnet. |
| `signerId`                 | string | ✅       | **Required for raw txs.** Database ID of the signer (from Signers API) to use. |
| `to`                       | string | ✅       | Indexing field (stored with tx but not used) |
| `solana.transactionBase64` | string | ✅       | Unsigned Solana transaction serialized to bytes and base64-encoded. Supports legacy and v0 formats. |

> **Security:** The embedded transaction must have the assigned signer as sole required signer and fee payer. MTXM validates this before signing.

#### SUI Native Transfer

**Request body:**
```json
{
  "chainId": 201,
  "to": "0x<64-hex-sui-address>",
  "value": "0.01",
  "metadata": { "orderId": "ord_abc123" }
}
```

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `chainId` | string | ✅       | Public Sui network ID. Use `201` (devnet), `202` (testnet), or `203` (mainnet). |
| `to`      | string | ✅       | Recipient Sui address (`0x` + 64 hex chars) |
| `value`   | string | ❌       | Amount in **SUI** (not MIST). Decimal supported. Omit for `0`. |
| `metadata`| object | ❌       | Arbitrary JSON metadata. |

#### SUI Move Call PTB

**Request body:**
```json
{
  "chainId": 201,
  "to": "0x<package-id>",
  "sui": {
    "moveCalls": [
      {
        "target": "0x2::coin::value",
        "arguments": [{ "kind": "object", "objectId": "0x..." }],
        "typeArguments": ["0x2::sui::SUI"]
      }
    ],
    "gasBudget": "10000000",
    "gasPrice": "1000"
  }
}
```

| Field               | Type   | Required | Description |
|---------------------|--------|----------|-------------|
| `sui.moveCalls`     | array  | ✅       | Server-built programmable transaction move calls |
| `sui.gasBudget`     | string | ❌       | Gas budget in MIST |
| `sui.gasPrice`      | string | ❌       | Optional gas price in MIST |

**Move call argument (`SuiMoveCallArg`):**

| Kind      | Fields |
|-----------|--------|
| `object`  | `{ "kind": "object", "objectId": "0x..." }` |
| `pure`    | `{ "kind": "pure", "valueBase64": "...", "bcsType": "u64" }` |
| `address` | `{ "kind": "address", "address": "0x..." }` |

#### SUI Advanced: Raw PTB

**Request body:**
```json
{
  "chainId": 201,
  "signerId": "<dashboard-signer-key-id>",
  "to": "0x<indexing-field>",
  "sui": {
    "transactionBase64": "<unsigned-ptb-bytes-base64>"
  }
}
```

| Field                      | Type   | Required | Description |
|----------------------------|--------|----------|-------------|
| `signerId`                 | string | ✅       | **Required for raw PTBs.** Database ID of the SUI signer. |
| `sui.transactionBase64`    | string | ✅       | Unsigned programmable transaction block, base64-encoded. |

> **Security:** The PTB sender must match the assigned signer. MTXM validates single-signer semantics before signing. Sponsored PTBs (`sender != gasOwner`) must use `sponsor-sign` / `execute-sponsored` instead.

#### SUI Sponsored Transactions (dual-sign)

When a user PTB has `sender != gasOwner`, use the sponsor endpoints instead of `POST .../send`.

**1. Sponsor co-sign (add gas payment + sponsor signature)**

```
POST /api/v1/projects/:projectId/transactions/sponsor-sign
```

```json
{
  "chainId": 201,
  "transactionKindBase64": "<from tx.build({ onlyTransactionKind: true })>",
  "senderAddress": "0x<user-sui-address>",
  "gasBudget": "5000000"
}
```

Omit `sponsorSignerId` to auto-select a **non-master** SUI signer via round-robin (master is funding-only). The sponsor may be the same address as the PTB sender — if so, `dualSignRequired` is `false` and only one signature is needed on execute.

Alternatively pass a partial/full unsigned PTB via `transactionBase64` (mutually exclusive with kind bytes).

**Response:**
```json
{
  "success": true,
  "data": {
    "sponsor": "0x<sponsor-address>",
    "sender": "0x<user-address>",
    "gasOwner": "0x<sponsor-address>",
    "dualSignRequired": true,
    "transactionBlockBase64": "<full-ptb-bytes-base64>",
    "sponsorSignature": "<base64-signature>",
    "gasPayment": [
      { "objectId": "0x...", "version": "123", "digest": "..." }
    ],
    "gasBudget": "5000000",
    "gasPrice": "1000"
  }
}
```

The client signs the returned `transactionBlockBase64` with the **user** key when `dualSignRequired` is true, then submits both signatures. When `dualSignRequired` is false (sender pays own gas), one signature is enough — or use `POST .../send` for the simpler single-signer queue flow.

**2. Execute dual-signed sponsored PTB**

```
POST /api/v1/projects/:projectId/transactions/execute-sponsored
```

```json
{
  "chainId": 201,
  "transactionBlockBase64": "<from sponsor-sign response>",
  "userSignature": "<user-sig-over-full-bytes>",
  "sponsorSignature": "<from sponsor-sign response>",
  "track": true,
  "to": "0x<indexing-field>",
  "metadata": { "orderId": "abc" }
}
```

Or pass `"signatures": ["<userSig>", "<sponsorSig>"]` (user first, sponsor second).

**Execute response** `201`:
```json
{
  "success": true,
  "data": {
    "digest": "abc123...",
    "transactionId": "clx...",
    "status": "BROADCAST"
  }
}
```

**Send response** `201`:
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "status": "QUEUED",
    "chainId": "clx...",
    "to": "0x... or <pubkey>",
    "value": "1000000000000000000",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

> The returned `id` is your reference for this transaction. Track it via webhooks or polling.

---

### Sign Authorization Payload

Sign either EVM typed data or a Solana canonical authorization payload without broadcasting anything.

```
POST /api/v1/projects/:projectId/transactions/sign-typed
```

**Request body rules:**

- `chainType` is optional and defaults to `EVM`
- For `EVM`, send `domain`, `types`, and `value`
- For `SOLANA`, send `solana.domain`, `solana.structHash`, and optional `solana.payload`
- For `SUI`, send `sui.domain`, `sui.structHash`, and optional `sui.payload`, or raw preimage fields
- `chainId` accepts the public numeric chain/network id or the internal DB id for backward compatibility
- `signerId` can be used to force the exact signer on both EVM and Solana authorization requests

#### EVM request body
```json
{
  "chainType": "EVM",
  "chainId": 1,
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

#### Solana request body
```json
{
  "chainType": "SOLANA",
  "chainId": 101,
  "signerId": "<optional-signer-db-id>",
  "solana": {
    "domain": {
      "name": "NodeRails Capture",
      "version": "1",
      "chainId": 101,
      "verifyingProgramId": "<optional-program-id>",
      "authority": "<optional-authority-pubkey>"
    },
    "structHash": "0x8d3c2d4f7d0f3f2c1d6b4a8d5c3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e",
    "payload": {
      "amount": "1000000",
      "recipient": "<solana-pubkey>"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
    "message": "MTXM-SOLANA-AUTH-V1\n...",
    "chainType": "EVM",
    "signature": "0xSignatureHex...",
    "signer": "0xSignerAddress..."
  }
}

Note: To support on-chain Ed25519 verification that expects an exact byte preimage, you can instead provide `solana.rawPreimageBase64` (base64-encoded raw bytes) or `solana.rawPreimageHex` (0x-prefixed hex). MTXM will sign the exact bytes you supply and return `messageBase64` or `messageHex` respectively alongside `signatureBase58`.

### Solana Raw Preimage Signing (recommended for on-chain Ed25519 verify)

When an on-chain program (such as an Anchor `verify_ed25519` helper or a custom Ed25519 verification routine) expects a raw byte sequence to be signed, you should supply the exact canonical bytes to MTXM so the returned signature verifies on-chain with:

```
Ed25519_verify(public_key, signature, raw_message_bytes)
```

Fields supported by MTXM:
- `solana.rawPreimageBase64` — base64-encoded raw bytes to be signed (preferred for binary data).
- `solana.rawPreimageHex` — 0x-prefixed hex string of raw bytes to be signed.

If neither raw field is provided, MTXM will fall back to signing the canonical human-readable authorization message prefixed by `MTXM-SOLANA-AUTH-V1` (the legacy behavior). For deterministic on-chain verification, prefer sending the raw preimage.

#### SUI authorization request body

```json
{
  "chainType": "SUI",
  "chainId": 201,
  "signerId": "<optional-signer-db-id>",
  "sui": {
    "domain": {
      "name": "MyApp",
      "version": "1",
      "chainId": 201
    },
    "structHash": "0x8d3c2d4f7d0f3f2c1d6b4a8d5c3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e",
    "payload": { "action": "approve" }
  }
}
```

SUI supports the same raw-preimage pattern as Solana:

- `sui.rawPreimageBase64` — base64-encoded bytes to sign
- `sui.rawPreimageHex` — 0x-prefixed hex bytes to sign

If no raw preimage is provided, MTXM signs a canonical message prefixed with `MTXM-SUI-AUTH-V1`. The response includes `signatureBase64` and the signer Sui address.

Example: sign a canonical capture preimage (hex)

Request body (abbreviated):

```json
{
  "chainType": "SOLANA",
  "chainId": 103,
  "solana": {
    "rawPreimageHex": "0x4d54584d2d534f4c414e412d415554482d56310a646f6d61696e3d7b...",
    "domain": { "name": "NodeRails Capture", "version": "1", "chainId": 103 }
  }
}
```

Example: sign the same bytes using base64

```json
{
  "chainType": "SOLANA",
  "chainId": 103,
  "solana": {
    "rawPreimageBase64": "TVRYTS1TT0xBTkEtQVVUSC1WMQpkb21haW49e3...",
    "domain": { "name": "NodeRails Capture", "version": "1", "chainId": 103 }
  }
}
```

Response (successful):

```json
{
  "success": true,
  "data": {
    "chainType": "SOLANA",
    "messageHex": "0x4d54...",          // present when rawPreimageHex used
    "messageBase64": "TVRY...",         // present when rawPreimageBase64 used
    "signatureBase58": "5U3...",        // base58-encoded 64-byte Ed25519 signature
    "signer": "<solana-pubkey>"
  }
}
```

Verification (JavaScript example using `tweetnacl`):

```javascript
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// rawBytes: Uint8Array containing the exact bytes you sent to MTXM
// signatureBase58: signature returned by MTXM
// publicKeyBase58: signer's public key

const signature = bs58.decode(signatureBase58);
const publicKey = bs58.decode(publicKeyBase58);

const ok = nacl.sign.detached.verify(rawBytes, signature, publicKey);
console.log('signature valid?', ok);
```

Notes and recommendations:
- Always provide the exact byte layout your on-chain program expects. For the `capture_spl` pattern, that usually means the canonical preimage bytes (prefix + fields in the exact byte order and encoding required by the on-chain verifier).
- `signatureBase58` is the base58 encoding of the 64-byte Ed25519 signature. On-chain `Ed25519` verification expects the raw 64-byte signature.
- If your integration uses a canonical human-readable message instead of raw bytes, MTXM preserves the legacy `MTXM-SOLANA-AUTH-V1` format — but this may not match on-chain verifier expectations unless your program also reconstructs and hashes the same string.
- For safety, test signature verification locally (using `tweetnacl` or `ed25519_dalek`) before broadcasting on-chain.

If you'd like, MTXM can also expose a dedicated `POST /sign-raw` endpoint to sign arbitrary bytes without the rest of the typed-data envelope — open an issue or request and we'll add it.
```

```json
{
  "success": true,
  "data": {
    "chainType": "SOLANA",
    "message": "MTXM-SOLANA-AUTH-V1\n...",
    "signatureBase58": "5U3...",
    "signer": "<solana-pubkey>"
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

Chains represent the EVM and Solana networks your project operates on.

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
      "chainType": "EVM",
      "chainId": 1,
      "rpcUrls": ["https://eth.llamarpc.com"],
      "explorerUrl": "https://etherscan.io",
      "nativeCurrency": "ETH",
      "isTestnet": false,
      "isActive": true
    },
    {
      "id": "clx...",
      "name": "Solana Mainnet",
      "chainType": "SOLANA",
      "chainId": 101,
      "rpcUrls": ["https://api.mainnet.solana.com"],
      "explorerUrl": "https://explorer.solana.com",
      "nativeCurrency": "SOL",
      "isTestnet": false,
      "isActive": true
    }
  ]
}
```

### Add a Chain

```
POST /api/v1/projects/:projectId/chains
```

**EVM Chain:**
```json
{
  "name": "Polygon",
  "chainType": "EVM",
  "chainId": 137,
  "rpcUrls": ["https://polygon-rpc.com"],
  "explorerUrl": "https://polygonscan.com",
  "nativeCurrency": "MATIC",
  "isTestnet": false
}
```

**Solana Mainnet (default):**
```json
{
  "name": "Solana Mainnet",
  "chainType": "SOLANA",
  "chainId": 101,
  "rpcUrls": ["https://api.mainnet.solana.com"],
  "explorerUrl": "https://explorer.solana.com",
  "nativeCurrency": "SOL",
  "isTestnet": false
}
```

**Solana Devnet (default):**
```json
{
  "name": "Solana Devnet",
  "chainType": "SOLANA",
  "chainId": 103,
  "rpcUrls": ["https://api.devnet.solana.com"],
  "explorerUrl": "https://explorer.solana.com/?cluster=devnet",
  "nativeCurrency": "SOL",
  "isTestnet": true
}
```

**Solana Testnet (default):**
```json
{
  "name": "Solana Testnet",
  "chainType": "SOLANA",
  "chainId": 102,
  "rpcUrls": ["https://api.testnet.solana.com"],
  "explorerUrl": "https://explorer.solana.com/?cluster=testnet",
  "nativeCurrency": "SOL",
  "isTestnet": true
}
```

| Field            | Type     | Required | Notes |
|------------------|----------|----------|-------|
| `name`           | string   | ✅       | Max 100 chars |
| `chainType`      | enum     | ❌       | `"EVM"` (default), `"SOLANA"`, or `"SUI"` |
| `chainId`        | number   | ✅       | Numeric network identifier used by MTXM for routing and uniqueness. Solana defaults: Testnet `101`, Devnet `102`, Mainnet `103`. Sui defaults: Devnet `201`, Testnet `202`, Mainnet `203`. |
| `rpcUrls`        | string[] | ✅       | At least one valid URL. Multiple URLs enable failover. |
| `explorerUrl`    | string   | ❌       | Block explorer base URL |
| `nativeCurrency` | string   | ✅       | Symbol — `"ETH"`, `"MATIC"`, `"SOL"`, etc. (max 10 chars) |
| `isTestnet`      | boolean  | ✅       | |

**Sui Devnet (default):**
```json
{
  "name": "Sui Devnet",
  "chainType": "SUI",
  "chainId": 201,
  "rpcUrls": ["https://fullnode.devnet.sui.io:443"],
  "explorerUrl": "https://suiscan.xyz/devnet/tx",
  "nativeCurrency": "SUI",
  "isTestnet": true
}
```

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

Signers are the EVM, Solana, and Sui wallets that sign and send transactions on behalf of your project.

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
      "chainType": "EVM",
      "address": "0xAbC...123",
      "adapterType": "ENV",
      "isActive": true,
      "isMaster": false
    },
    {
      "id": "clx...",
      "label": "Solana Wallet 1",
      "chainType": "SOLANA",
      "address": "7xMmnMy...Abc123",
      "adapterType": "ENV",
      "isActive": true,
      "isMaster": false
    }
  ]
}
```

> Private key material is **never** returned by any endpoint.

### Allocate a SUI Signer (integrators)

Use this instead of hard-coding `MTXM_SUI_SIGNER_ID`, `MTXM_SUI_SIGNER_PUBKEY`, and `MTXM_SUI_ED25519_PUBKEY_BASE64` in your environment. MTXM picks the next active **non-master** SUI signer via the same round-robin pool used for transaction send and gas sponsorship.

```
POST /api/v1/projects/:projectId/signers/allocate
```

**Request body** (optional):
```json
{
  "chainType": "SUI"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "signerId": "clx...",
    "label": "Sui Hot Wallet 1",
    "chainType": "SUI",
    "address": "0xabc123...",
    "publicBase64Key": "base64-encoded-32-byte-ed25519-pubkey"
  }
}
```

**Field mapping for Noderales / off-chain auth:**

| Response field | Env-style name |
|---|---|
| `signerId` | `MTXM_SUI_SIGNER_ID` |
| `address` | `MTXM_SUI_SIGNER_PUBKEY` |
| `publicBase64Key` | `MTXM_SUI_ED25519_PUBKEY_BASE64` |

Use the returned `signerId` when calling `POST .../transactions/send`, `POST .../sign-typed-data`, or `POST .../transactions/sponsor-sign` with an explicit signer. The `address` must match the on-chain transaction authority; `publicBase64Key` is used for `MTXM-SUI-AUTH-V1` verification.

> Master wallets are excluded — they are reserved for auto-funding only.

### Create a Signer

```
POST /api/v1/projects/:projectId/signers
```

**EVM ENV adapter** — MTXM generates and encrypts a new Ethereum private key:
```json
{
  "label": "EVM Hot Wallet 1",
  "chainType": "EVM",
  "adapterType": "ENV"
}
```

**EVM KMS adapter** — uses an existing AWS KMS key for signing:
```json
{
  "label": "EVM KMS Signer",
  "chainType": "EVM",
  "adapterType": "KMS",
  "kmsKeyId": "arn:aws:kms:us-east-1:123456:key/abcd-1234"
}
```

**Solana ENV adapter** — MTXM generates and encrypts a new Solana keypair:
```json
{
  "label": "Solana Hot Wallet 1",
  "chainType": "SOLANA",
  "adapterType": "ENV"
}
```

> Solana signers currently support `ENV` adapter only.

| Field         | Type   | Required | Notes |
|---------------|--------|----------|-------|
| `label`       | string | ✅       | Human-friendly name (max 100 chars) |
| `chainType`   | enum   | ❌       | `"EVM"` (default), `"SOLANA"`, or `"SUI"` |
| `adapterType` | enum   | ✅       | `"ENV"` — server-managed key, `"KMS"` — AWS KMS (EVM only) |
| `kmsKeyId`    | string | ❌       | **Required** when `adapterType` is `"KMS"` and `chainType` is `"EVM"` |

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
