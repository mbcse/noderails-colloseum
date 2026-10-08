# API Integration Guide

This guide explains how to integrate an external application with Noderails Indexer using the **Project API** and API key authentication. Use it to add contracts/packages, listen for indexed events, query native transfers (ETH on EVM, SUI on SUI), and understand webhook payloads.

---

## 1. About Noderails Indexer

Noderails Indexer is a multi-chain service that:

- **Indexes contract/program/package events** — Register an EVM contract (address + ABI), Solana program (IDL), or SUI package (manifest). Noderails Indexer scans the chain and stores matching events. You can filter by argument values.
- **Tracks native transfers** — Add watched addresses; the indexer records native ETH (EVM) or SUI/coin movements (SUI) and can deliver them via webhooks.
- **Delivers via webhooks** — When an indexed event or native transfer matches a webhook subscription, Noderails Indexer POSTs a JSON payload to your URL with an HMAC signature.

**Supported protocols:** `evm`, `solana`, `sui` (per-chain `protocol` field).

**Two API surfaces:**

| Surface | Base path | Auth | Purpose |
|--------|-----------|------|--------|
| **Admin API** | `/api/admin/*` | Bearer token (login) | Manage chains, projects, contracts, webhooks, settings. |
| **Project API** | `/api/project/*` | `x-api-key` header | Used by your app: add contracts, filters, watched addresses; read chains/contracts/events/transfers. |

Webhooks are configured in the **Admin UI** (per project). Once configured, they are triggered automatically when events or native transfers match.

---

## 2. Authentication (Project API)

All Project API requests must include your project’s API key.

**Header:**

```http
x-api-key: YOUR_PROJECT_API_KEY
```

- The API key is generated per project in the Admin dashboard.
- If the key is missing or invalid, the API returns `401` or `403`.

**Example (curl):**

```bash
curl -H "x-api-key: YOUR_PROJECT_API_KEY" \
  "https://your-indexer.example.com/api/project/contracts"
```

---

## 3. Base URL and Conventions

- **Base URL:** `https://<host>/api/project` for Project API; `https://<host>/api` for Events and Native Transfers (see below).
- **Content type:** `application/json` for request bodies; responses are JSON.
- **Success responses:** `{ "success": true, "data": ... }`
- **Error responses:** `{ "success": false, "error": "Message" }` (optional `details`)

---

## 4. Chains (Read-only)

Chains are managed by the administrator. Your app can only list and fetch them.

**Common chain IDs:**
- **Ethereum:** 1 (mainnet), 5 (goerli testnet), 11155111 (sepolia testnet)
- **Solana:** 101 (mainnet), 102 (testnet), 103 (devnet) — or custom IDs per your deployment
- **SUI:** 203 (mainnet), 202 (testnet), 201 (devnet) — or custom IDs per your deployment
- Other networks have unique chainIds defined in your indexer admin.

### List chains

```http
GET /api/project/chains
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "chainId": 1,
      "name": "Ethereum Mainnet",
      "rpcUrls": ["https://..."],
      "isActive": true,
      "blockTime": 12000,
      "finalityBlocks": 64,
      "protocol": "evm"
    },
    {
      "id": "uuid",
      "chainId": 103,
      "name": "Solana Devnet",
      "rpcUrls": ["https://api.devnet.solana.com"],
      "isActive": true,
      "blockTime": 400,
      "finalityBlocks": 32,
      "protocol": "solana"
    },
    {
      "id": "uuid",
      "chainId": 203,
      "name": "SUI Mainnet",
      "rpcUrls": ["https://fullnode.mainnet.sui.io:443"],
      "graphqlUrls": ["https://sui-mainnet.mystenlabs.com/graphql"],
      "isActive": true,
      "blockTime": 3000,
      "finalityBlocks": 10,
      "protocol": "sui"
    }
  ]
}
```

Note the `protocol` field indicates whether the chain is `evm`, `solana`, or `sui`.

### Get one chain

```http
GET /api/project/chains/:id
```

`:id` is the chain’s UUID (from the list).

---

## 5. Contracts — Add and Listen

### List contracts

```http
GET /api/project/contracts
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "contract-uuid",
      "projectId": "project-uuid",
      "chainId": 1,
      "address": "0x...",
      "name": "MyContract",
      "abi": [...],
      "isActive": true,
      "startBlock": "18000000",
      "chain": { "id": "...", "name": "Ethereum Mainnet", "chainId": 1 },
      "eventSubscriptions": [
        { "id": "...", "eventName": "Transfer", "isActive": true }
      ]
    }
  ]
}
```

### Add a contract (start listening)

Registers a contract and subscribes to **all events** found in its ABI. Noderails Indexer will start scanning from `startBlock` (or current block if omitted).

```http
POST /api/project/contracts
Content-Type: application/json

{
  "chainId": 1,
  "address": "0x...",
  "abi": [ { "type": "event", "name": "Transfer", "inputs": [...] }, ... ],
  "name": "MyContract",
  "startBlock": 18000000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chainId` | number | Yes | Chain ID (e.g. 1 for Ethereum, 103 for Solana Devnet). Chain must exist in admin. |
| `address` | string | Yes | Contract/program/package address. EVM: `0x` + 40 hex. Solana: base58 program ID. SUI: package ID (`0x` + up to 64 hex). |
| `abi` | array or string | Yes (EVM) / Optional (Solana/SUI) | EVM: ABI JSON array. Solana: IDL object. SUI: package manifest object. |
| `name` | string | No | Display name (default `"Contract"`). |
| `startBlock` | number | No | EVM: block number. Solana: slot. SUI: checkpoint. Defaults to current head if omitted. |
| `protocol` | string | No | `evm` (default), `solana`, or `sui` |

**Solana programs:**

- Register with `protocol: "solana"`.
- Chain must be a Solana network (`protocol: "solana"`).
- Use `POST /api/project/fetch-idl` to fetch an Anchor IDL before registration.

**SUI packages:**

- Register with `protocol: "sui"`.
- `address` is the published **package ID** (not module name, not object ID).
- Load the manifest via **`POST /api/project/fetch-manifest`** (recommended) or paste the JSON manifest object — **do not paste Move source code** (`.move` files are not parsed).
- Subscriptions can target Move **events** (`kind: event`) or **public entry functions** (`kind: function`).
- Indexer cursor uses **checkpoint sequence numbers** (stored in `lastIndexedBlock` / webhook `blockNumber`).
- SUI chains should configure both **JSON-RPC** (`rpcUrls`) and **GraphQL** (`graphqlUrls`) endpoints in admin for best performance.
- The package must exist on the **same network** as your chain’s RPC (testnet package IDs will fail on mainnet RPC and vice versa).

**Fetch manifest (Project API):**

```http
POST /api/project/fetch-manifest
Content-Type: application/json
x-api-key: YOUR_PROJECT_API_KEY

{
  "chainId": 202,
  "packageId": "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82"
}
```

**Success (200):** `{ "success": true, "data": { "manifest": { "packageId": "0x...", "modules": { ... } } } }`

**Common errors:**

| `errorCode` | Meaning |
|-------------|---------|
| `package_not_found` | Package ID does not exist on this chain — wrong network or typo |
| `no_indexable_items` | Package exists but has **no Move events and no entry functions** (see below) |
| `rpc_failed` | RPC URL down, misconfigured, or unreachable |

**Why some packages have no events (e.g. USDC, WAL coin wrappers):**

Many token packages are **publish-only**: they define a coin type and run `init` once at publish to wire up `0x2::coin` / treasury via framework packages. They do **not** define custom `event` structs or `public entry` functions. The RPC manifest shows `exposedFunctions: {}` and no events — **Fetch Manifest succeeds on-chain but registration is rejected** because there is nothing to index.

For **coin/token transfers** (WAL, USDC, native SUI) to or from a wallet, use **Watched Addresses** (Section 7), not package event indexing.

For **DeFi / app logic** (swaps, deposits, mints with custom events), register the **protocol package** that defines `event` structs and `public entry fun` (DEX, lending, etc.).

**Manifest JSON shape** (when not using fetch-manifest):

```json
{
  "packageId": "0x...",
  "source": "manual",
  "modules": {
    "market": {
      "events": [{ "name": "SwapEvent", "type": "0x...::market::SwapEvent", "fields": [] }],
      "functions": [{ "name": "swap", "module": "market", "parameters": [], "isEntry": true }]
    }
  }
}
```

See [Sui developer docs](https://docs.sui.io/develop) for package publishing and event types.

**EVM contracts:**
- Register by **contract address** (0x...).
- `abi` is required and must contain at least one event.
- Subscribes to all events in the ABI.

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "contract-uuid",
    "projectId": "project-uuid",
    "chainId": 1,
    "address": "0x...",
    "name": "MyContract",
    "abi": [...],
    "isActive": true,
    "startBlock": "18000000",
    "chain": { ... },
    "eventSubscriptions": [ { "id": "...", "eventName": "Transfer", "isActive": true }, ... ],
    "indexStates": [
      {
        "id": "...",
        "chainId": 1,
        "contractId": "...",
        "lastIndexedBlock": "18000100",
        "lastFinalizedBlock": null
      }
    ]
  }
}
```

**Errors:**

- `400` — Missing `chainId`, `address`, or `abi`; invalid ABI; no events in ABI; chain not found.

### Get one contract

```http
GET /api/project/contracts/:contractId
```

Returns the contract with `eventSubscriptions` and `indexStates` (indexing progress).

### Delete a contract

```http
DELETE /api/project/contracts/:contractId
```

Stops indexing and removes the contract and its event subscriptions. Returns `{ "success": true }`.

---

## 6. Event filters (optional)

By default, all emissions of an event are indexed. You can add **filter conditions** so only events whose decoded `args` match are stored and sent to webhooks.

Filter format: each condition is a path (e.g. `args.to` or `to`) and an operator with value. All conditions are ANDed.

**Operators:** `eq`, `neq`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`

### List filters

```http
GET /api/project/filters
GET /api/project/filters?contractId=contract-uuid
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "contractId": "...",
      "eventName": "Transfer",
      "subscriptionId": "...",
      "filterConditions": {
        "args.to": { "in": ["0xabc...", "0xdef..."] },
        "args.value": { "gte": "1000000000000000000" }
      },
      "contract": { "id": "...", "name": "...", "address": "0x..." }
    }
  ]
}
```

### Add/merge one condition

```http
POST /api/project/filters
Content-Type: application/json

{
  "contractId": "contract-uuid",
  "eventName": "Transfer",
  "field": "to",
  "op": "in",
  "value": "[\"0xabc...\", \"0xdef...\"]"
}
```

- `field`: argument name (with or without `args.` prefix).
- `op`: one of `eq`, `neq`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`.
- `value`: string; for `in`/`nin` use a JSON array string.

**Solana-specific notes:**
- Filters apply only to **Anchor events** with decoded `args`. Instruction-derived signals (no Borsh event struct) bypass filters if they have no eventName.
- For Solana, filter on decoded event fields (e.g. `args.user`, `args.amount`). Numeric values in filter conditions should be strings (matching webhook args serialization).

### Update filter (by subscription)

```http
PUT /api/project/filters?contractId=...&eventName=Transfer
Content-Type: application/json

{
  "field": "value",
  "op": "gte",
  "value": "1000000000000000000"
}
```

### Clear filter conditions

```http
DELETE /api/project/filters?contractId=...&eventName=Transfer
```

---

## 7. Watched addresses (native transfers)

Add addresses to track **native transfers** to or from them:

- **EVM:** native ETH (`0x` + 40 hex)
- **SUI:** native SUI and coin balance changes including framework coins like `0x2::sui::SUI` (`0x` + 64 hex)

Indexed transfers can be queried via the Native Transfers API and sent to webhooks if the webhook has “Subscribe to native transfers” enabled.

**Use watched addresses for token/coin flows** when the token’s package is a coin wrapper with no custom events (common for USDC, WAL, etc.). Use **package registration** only when the target package exposes Move events or entry functions.

### List watched addresses

```http
GET /api/project/watched-addresses
GET /api/project/watched-addresses?chainId=1
GET /api/project/watched-addresses?chainId=all
```

- No `chainId`: all watched addresses for the project.
- `chainId=1`: only that chain.
- `chainId=all`: only “all chains” entries (`chainId` null).

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "projectId": "...",
      "chainId": 1,
      "address": "0x...",
      "direction": "both",
      "label": "Treasury"
    }
  ]
}
```

`direction`: `"in"` (receive), `"out"` (send), `"both"`.

### Add one watched address

```http
POST /api/project/watched-addresses
Content-Type: application/json

{
  "address": "0x...",
  "chainId": 1,
  "direction": "both",
  "label": "Treasury"
}
```

- `address`: required. EVM: `0x` + 40 hex. SUI: `0x` + 64 hex. When `chainId` is null (“all chains”), either format is accepted per target chain.
- `chainId`: number or `null` / omit for “all chains”.
- `direction`: `"in"`, `"out"`, or `"both"` (default).
- `label`: optional.

### Add multiple (bulk)

```http
POST /api/project/watched-addresses/bulk
Content-Type: application/json

{
  "addresses": ["0x...", "0x..."],
  "chainId": 1,
  "direction": "both",
  "label": "Batch"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "created": [ { "id": "...", "address": "0x...", ... } ],
    "skipped": ["0x..."]
  }
}
```

`skipped`: addresses already watched for this project/chain.

### Delete watched address

```http
DELETE /api/project/watched-addresses/:id
```

---

## 8. Events API (query indexed events)

Use this to **read** indexed events (for your project’s contracts). Auth: same `x-api-key` header.

```http
GET /api/events?contractId=...&eventName=...&chainId=...&fromBlock=...&toBlock=...&limit=10&offset=0
```

| Query | Type | Description |
|-------|------|-------------|
| `contractId` | string | Filter by contract UUID. |
| `eventName` | string | Filter by event name. |
| `chainId` | number | Filter by chain ID. |
| `fromBlock` | number | Minimum block number. |
| `toBlock` | number | Maximum block number. |
| `limit` | number | Max results (default 10, max 100). |
| `offset` | number | Pagination offset. |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "event-uuid",
      "eventName": "Transfer",
      "eventSignature": "Transfer(address,address,uint256)",
      "contractName": "MyContract",
      "contractAddress": "0x...",
      "chainId": 1,
      "chainName": "Ethereum Mainnet",
      "blockNumber": 18000100,
      "blockHash": "0x...",
      "transactionHash": "0x...",
      "logIndex": 0,
      "args": { "from": "0x...", "to": "0x...", "value": "1000000000000000000" },
      "timestamp": "2024-01-15T12:00:00.000Z",
      "createdAt": "2024-01-15T12:00:01.000Z"
    }
  ],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

With `x-api-key`, only events from your project’s contracts are returned.

---

## 9. Native transfers API

Query indexed native (ETH) transfers for your project’s watched addresses. Auth: `x-api-key` (project) or admin Bearer.

```http
GET /api/native-transfers?chainId=...&address=...&fromBlock=...&toBlock=...&limit=10&offset=0
```

| Query | Type | Description |
|-------|------|-------------|
| `chainId` | number | Filter by chain. |
| `address` | string | Filter to transfers where this address is from or to. |
| `fromBlock` | number | Minimum block. |
| `toBlock` | number | Maximum block. |
| `limit` | number | Max results (default 10, max 100). |
| `offset` | number | Pagination offset. |

With **project API key**, only transfers that match your project’s watched addresses are returned. Optional `address` further narrows to that address.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "transfer-uuid",
      "chainId": 1,
      "blockNumber": "18000100",
      "blockHash": "0x...",
      "transactionHash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "value": "1000000000000000000",
      "timestamp": "2024-01-15T12:00:00.000Z",
      "createdAt": "2024-01-15T12:00:01.000Z"
    }
  ],
  "total": 5,
  "limit": 10,
  "offset": 0
}
```

`value` is in wei (string).

---

## 10. Webhooks

Webhooks are **configured in the Admin UI** (per project and URL). You cannot create or edit webhooks via the Project API. Once a webhook is set up:

- **Event webhooks** — Triggered when an indexed event (from your project’s contracts) matches the webhook’s event subscriptions.
- **Native transfer webhooks** — If “Subscribe to native transfers” is enabled, triggered when an indexed native transfer matches the webhook’s project and optional chain.

Noderails Indexer POSTs a JSON body to your URL and adds headers for signature verification.

### Request (from Noderails Indexer to your endpoint)

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Headers:**
  - `X-Indexer-Signature`: HMAC-SHA256 of `{timestamp}.{body}` (hex).
  - `X-Indexer-Timestamp`: Unix timestamp (ms) used in the signature.
  - `X-Indexer-Event-Id`: Event or native transfer ID.
  - `X-Indexer-Delivery-Id`: Delivery record ID (for idempotency/debugging).

### Event payload (contract events)

```json
{
  "id": "event-uuid",
  "event": "Transfer",
  "chainId": 1,
  "contractAddress": "0x...",
  "blockNumber": 18000100,
  "transactionHash": "0x...",
  "logIndex": 0,
  "args": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000000000000000"
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Native transfer payload

```json
{
  "type": "native_transfer",
  "id": "transfer-uuid",
  "chainId": 1,
  "blockNumber": 18000100,
  "blockHash": "0x...",
  "transactionHash": "0x...",
  "from": "0x...",
  "to": "0x...",
  "value": "1000000000000000000",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

Presence of `"type": "native_transfer"` indicates a native transfer; otherwise treat as an event.

### Verifying the signature

To ensure the request came from Noderails Indexer and was not tampered with:

1. Read `X-Indexer-Timestamp` and reject if too old (e.g. > 5 minutes).
2. Build the signed string: `{timestamp}.{rawRequestBody}` (raw UTF-8 body).
3. Compute `HMAC-SHA256(signedString, webhookSecret)` and compare with `X-Indexer-Signature` (hex).

**Example (Node.js):**

```js
const crypto = require('crypto');

function verifyWebhook(payloadRaw, timestamp, signature, secret, maxAgeMs = 300000) {
  if (Math.abs(Date.now() - parseInt(timestamp, 10)) > maxAgeMs) return false;
  const signed = `${timestamp}.${payloadRaw}`;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}
```

### Response from your endpoint

- Return **2xx** (e.g. 200) to acknowledge success. Noderails Indexer marks the delivery as successful.
- Non-2xx or timeouts cause retries with exponential backoff (configurable in admin/settings).

### Solana webhooks (normalization and parity with EVM)

Noderails Indexer normalizes Solana program events and instruction-derived notifications so they follow the same top-level shape as EVM event deliveries. Receivers should rely on the top-level fields for common logic and consult the nested `solana` object for raw chain-specific details.

- Top-level mapping (what to expect):
  - `event`: Best available name in this order: existing `event`, `solana.eventName` (Anchor Event), `solana.instructionName`, `args.ix_name`.
  - `contractAddress`: mapped from `programId` (program address).
  - `chainId`: numeric chain id (as defined in the Chains table for your deployment: devnet/testnet/mainnet ids).
  - `blockNumber`: mapped from Solana `slot`.
  - `transactionHash`: mapped from Solana `signature`.
  - `logIndex`: `eventIndex` (or `instructionIndex` as fallback for instruction-derived notifications).

- `args` and serialization:
  - Decoded Anchor event fields appear in `args`. For instruction-derived notifications `args` may be empty or contain instruction-level metadata.
  - Numeric values and large integers are serialized for JSON compatibility: `bigint`, Anchor `BN` instances, and `{ _bn: '...' }` wrappers are converted to plain strings. Receivers should parse numeric strings as needed.
  - Complex structures (arrays, nested objects) are preserved with numeric leaves serialized to strings.

- `solana` metadata (kept as a nested object):
  - Includes `signature`, `slot`, `blockTime`, `instructionIndex`, `eventIndex`, `instructionName`, `eventName`, `programId`, and, when available, `logMessages`, `accounts`, and the raw `transaction`.
  - Top-level fields are populated for convenience; raw internals remain under `solana` to avoid noisy top-level payloads.

- Example normalized Solana event payload:

```json
{
  "id": "4ab2164c-e553-4742-a472-a5912edcebb2",
  "event": "TradeEvent",
  "chainId": 103,
  "contractAddress": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  "blockNumber": 418641152,
  "transactionHash": "5H9ZhUEewGEZrzhCpRtqy...",
  "logIndex": 136,
  "args": {
    "mint": "3548623005680321877...",
    "sol_amount": "62763270",
    "token_amount": "1314857802055",
    "is_buy": false,
    "user": "5245115845798781931..."
  },
  "timestamp": "2026-05-09T15:44:52.000Z",
  "protocol": "solana",
  "solana": {
    "signature": "5H9ZhUEewGEZrzhCpRtqy...",
    "slot": 418641152,
    "blockTime": 1778341492,
    "instructionIndex": 136,
    "eventIndex": 136,
    "instructionName": "TradeEvent",
    "eventName": "TradeEvent",
    "programId": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
  }
}
```

- Example instruction-only notification (no Anchor event, just instruction log):

```json
{
  "id": "event-uuid",
  "event": "Sell",
  "chainId": 103,
  "contractAddress": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  "blockNumber": 418641152,
  "transactionHash": "5H9ZhUEewGEZrzhCpRtqy...",
  "logIndex": 5,
  "args": {},
  "timestamp": "2026-05-09T15:44:52.000Z",
  "protocol": "solana",
  "solana": {
    "signature": "5H9ZhUEewGEZrzhCpRtqy...",
    "slot": 418641152,
    "blockTime": 1778341492,
    "instructionIndex": 5,
    "eventIndex": 5,
    "instructionName": "Sell",
    "eventName": null,
    "programId": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
  }
}
```

Note: `args` is empty, `eventName` is `null` (no Anchor event), but `instructionName` and `event` (top-level) are set from the instruction name.

**Consistency notes:**
- `contractAddress` in the webhook payload = the `programId` you registered (for Solana) or contract address (for EVM).
- `blockNumber` for Solana webhooks always represents the `slot` number, not Ethereum block numbers.
- `transactionHash` for Solana webhooks contains the base58 signature, not a 0x hex hash.

Best practices for receivers:
- Prefer top-level fields (`event`, `contractAddress`, `chainId`, `blockNumber`, `transactionHash`, `args`) for generic processing across EVM and Solana.
- If you need raw Solana internals (logs, accounts, full transaction, instructionName details), read the nested `solana` object.
- Treat numeric values in `args` as strings and parse them where required (e.g. BigInt or number libraries).
- Check `protocol` field if you need to branch logic for EVM vs. Solana vs. SUI.
- Handle empty `args` gracefully; instruction-only Solana signals often have no decoded fields.

### SUI webhooks (normalization and parity with EVM/Solana)

Noderails Indexer normalizes SUI Move events and function-call notifications with the same top-level fields as EVM deliveries.

- Top-level parity:
  - `protocol`: `"sui"`
  - `blockNumber`: checkpoint sequence number
  - `transactionHash`: transaction digest (`0x...`)
  - `logIndex`: event sequence (`eventSeq`)
  - `contractAddress`: registered package ID
- Nested `sui` object:
  - `checkpoint`, `packageId`, `module`, `eventType`, `sender`, `timestampMs`, `digest`, `eventSeq`, `kind` (`event` | `function`)
- `args` contains decoded `parsedJson` fields from the node (amounts, addresses, etc.).

Example:

```json
{
  "id": "uuid",
  "event": "SwapEvent",
  "protocol": "sui",
  "chainId": 203,
  "contractAddress": "0xabc...",
  "blockNumber": 12345678,
  "transactionHash": "0xdigest...",
  "logIndex": 0,
  "args": {
    "pool": "0x...",
    "amount_in": "1000000"
  },
  "timestamp": "2026-06-17T12:00:00.000Z",
  "sui": {
    "checkpoint": 12345678,
    "packageId": "0xabc...",
    "module": "market",
    "eventType": "0xabc...::market::SwapEvent",
    "sender": "0x...",
    "timestampMs": 1710000000000,
    "digest": "0xdigest...",
    "eventSeq": 0,
    "kind": "event"
  }
}
```

**Native SUI transfers:** Configure watched addresses on SUI chains (`0x` + 64 hex). Webhook `native_transfer` payloads include `protocol: "sui"` and nested `sui: { checkpoint, digest, coinType }`. Values are in **MIST**.

---

## 11. Quick reference

| Action | Method | Path |
|--------|--------|------|
| List chains | GET | `/api/project/chains` |
| Get chain | GET | `/api/project/chains/:id` |
| List contracts | GET | `/api/project/contracts` |
| Add contract | POST | `/api/project/contracts` |
| Get contract | GET | `/api/project/contracts/:contractId` |
| Delete contract | DELETE | `/api/project/contracts/:contractId` |
| List filters | GET | `/api/project/filters` |
| Add filter condition | POST | `/api/project/filters` |
| Update filter | PUT | `/api/project/filters?contractId=...&eventName=...` |
| Clear filter | DELETE | `/api/project/filters?contractId=...&eventName=...` |
| List watched addresses | GET | `/api/project/watched-addresses` |
| Add watched address | POST | `/api/project/watched-addresses` |
| Bulk add watched | POST | `/api/project/watched-addresses/bulk` |
| Get watched address | GET | `/api/project/watched-addresses/:id` |
| Fetch Solana IDL | POST | `/api/project/fetch-idl` |
| Fetch SUI manifest | POST | `/api/project/fetch-manifest` |
| Query events | GET | `/api/events?contractId=...&eventName=...&...` |
| Query native transfers | GET | `/api/native-transfers?chainId=...&address=...&...` |

All Project API and Events/Native Transfers requests that use project auth must include:

```http
x-api-key: YOUR_PROJECT_API_KEY
```

Webhooks are configured in the Admin UI; Noderails Indexer sends event and native transfer payloads to your URL and expects a 2xx response.
