# NodeRails architecture notes

## Solana payments (escrow program)

Supported chains use `SupportedChain.chainType = SOLANA`. The `escrowAddress` column stores the **Anchor program id** (base58 public key) for `noderails_escrow`, not an EVM contract.

### Native SOL vs SPL

| Flow | Capture | User wallet | Backend / MTXM |
|------|---------|-------------|----------------|
| **Native SOL** | `capture_native` | User signs and sends the capture transaction (instruction returned as `captureData`). | MTXM signs the **authorization message** only (`NodeRailsEscrow::CaptureNative:v1`). |
| **SPL** | `capture_spl` | User first **delegates** their associated token account to the escrow **`escrow_auth` PDA** (`approve` on the SPL token program, delegate = PDA). | MTXM key (`MTXM_SOLANA_SIGNER_PUBKEY`) is both `authority` and `funder` on `capture_spl`; MTXM signs the struct hash for `NodeRailsEscrow::CaptureSpl:v1` and broadcasts the transaction. |

### Delegation PDA

The delegate address clients must approve is the program PDA with seeds `[b"escrow_auth"]` — mirrored in TypeScript as `escrowAuthorityPda(programId)` in `@noderails/solana` (and the same derivation is inlined in checkout for browser builds).

### Timelocks

`solana` timelocks match EVM: packed with `packTimelocks` / `timelocksToHex` from `@noderails/web3` and passed as 32 bytes in instruction data.

### Settlement, refund, dispute

After capture, workers branch on `cryptoTokenKey` → `SupportedToken.contractAddress` and `isNativeToken`:

- Native-like mint (sentinel `11111111111111111111111111111111` in app config): `settle_native`, `refund` (native), `resolve_dispute` (native).
- SPL mint: `settle_spl`, `refund_spl`, `resolve_dispute_spl`.

### Subscriptions

- **Native SOL**: automated renewal charges are **not** supported (capture requires the user wallet each time). The subscription worker fails fast with an explanatory error.
- **SPL**: same delegation model as checkout; the worker checks delegated amount and balance before calling `submitSolanaSplCaptureMtxm`.

### Indexer

On-chain events follow the escrow IDL names (e.g. payment captured / settled). See `indexer.md` for the project’s event ingestion naming.

### Configuration

- `MTXM_SOLANA_SIGNER_PUBKEY`: public key of the MTXM-managed signer used for all server-broadcast Solana escrow instructions.
- Per-chain `rpcUrl` on `SupportedChain` is preferred; otherwise `getSolanaPublicRpcUrl(chainId)` from `@noderails/common`.

## Merchant dashboard (`apps/dashboard`)

- **Wallets**: Default receiving and payout addresses accept **EVM (`0x…`) or Solana base58**. EVM “Connect wallet” still uses Wagmi; Solana merchants can **paste** addresses or configure per-chain settlement.
- **Chains**: For each **enabled** network, merchants may set optional **`AppChain.settlementAddress`** via `PATCH /apps/:id/chains/:chainId/settlement` (validated as EVM or Solana to match `SupportedChain.chainType`). If unset, payouts/settlement use the app-level `receivingWallet`.
- **Explorer links**: Payments, invoices, and customer payment lists use `blockExplorerTxUrl` / `blockExplorerAddressUrl` / `chainDisplayName` from `@noderails/common` (includes Solana 101 / 102 / 103).

### Wallet change log (database)

`WalletChangeLog.newAddress` / `previousAddress` are `VarChar(64)` so historic Solana addresses fit. Apply the corresponding Prisma migration in your environment when ready.

