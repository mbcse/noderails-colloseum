# NodeRails Smart Contracts

Smart contracts for the NodeRails crypto payment platform.

## Contracts

### NodeRailsEscrow

Handles payment captures, settlements, and disputes with timelock-based fund protection.

- Native ETH and ERC20 payment capture
- EIP-2612 permit support for gasless approvals
- Timelock-based fund protection with on-chain validation
- Dispute initiation and resolution
- Multi-role access control (SuperAdmin, Admin, TransactionKey)
- Pause (stop new payments) and FullStop (emergency halt everything)
- Emergency withdrawal (only when full stopped)
- Merchants can settle their own payments after timelock

### NodeRailsMerchantManager

Stateless signature-verified transfer proxy for merchant payouts.

- ERC20 and native ETH payouts
- Session-based merchant signatures (reusable until expiry)
- Backend signature verification (single-use per nonce)
- Nonce-based replay protection
- Multi-role access control

## Setup

```bash
forge install
forge build
forge test
```

## Environment Variables

Create a `.env` file:

```env
DEPLOYER_PRIVATE_KEY=0x...          # Deploys contracts
SUPER_ADMIN_PRIVATE_KEY=0x...       # Reserved for privileged role operations (add-admins/remove-keys/setup)
ADMIN_PRIVATE_KEY=0x...             # Must match first ADMIN_ADDRESSES entry (used for add-tx-keys)
SUPER_ADMIN_ADDRESS=0x...           # Gets SuperAdmin role on deploy
ADMIN_ADDRESSES=0xAbc,0xDef         # One or more admin addresses, assigned in constructors on deploy
FEE_RECIPIENT_ADDRESS=0x...         # Receives platform fees
ETHERSCAN_API_KEY=...               # Auto-verification on deploy
LEANRPC_API_KEY=...                 # RPC provider

# Role setup (comma-separated for multiple)
TRANSACTION_KEY_ADDRESSES=0x123,0x456,0x789
```

## Deployment

One script handles all deployments. Verification is attempted automatically after deployment data is saved.

```bash
# Deploy everything (Escrow + MerchantManager) on Sepolia
./script/deploy.sh 11155111 all

# Deploy only Escrow (e.g. V2 upgrade)
./script/deploy.sh 11155111 escrow

# Deploy only MerchantManager
./script/deploy.sh 84532 merchant-manager

# Deploy but explicitly skip verification
./script/deploy.sh 11155111 all --no-verify

# Deploy and force verification (requires ETHERSCAN_API_KEY)
./script/deploy.sh 11155111 all --verify
```

**Targets:** `all`, `escrow`, `merchant-manager`
**Verify options:** `--verify`, `--no-verify` (optional)

Deployment data is saved to `deployData/`:
- `contractAddresses.json` - current addresses per chain
- `contractAbis.json` - current ABIs per chain
- `deploymentHistory.json` - append-only log of all deployments and replacements

Important behavior:
- Contract addresses/ABIs are saved immediately after a successful on-chain deployment broadcast.
- Verification runs after save and is best-effort when enabled.
- If verification fails, deployment data remains persisted in `deployData/`.
- Verification backend is chain-aware: Etherscan-compatible explorers use Etherscan mode, and Blockscout explorers (for example Flow/Filecoin) use Blockscout mode.
- `--no-verify` hard-disables verification during deploy broadcast even if `ETHERSCAN_API_KEY` exists in the environment, preventing unintended verifier resolution errors on unsupported explorer mappings.

## Role Management

After deploying, assign admin and transaction key roles:

```bash
# Full initial setup (admins + transaction keys)
./script/roles.sh 11155111 setup

# Add transaction keys later
./script/roles.sh 11155111 add-tx-keys

# Add admins later
./script/roles.sh 11155111 add-admins

# Remove keys (set role to None)
./script/roles.sh 11155111 remove-keys
```

- `setup`, `add-admins`, and `remove-keys` use `SUPER_ADMIN_PRIVATE_KEY`.
- `add-tx-keys` uses `ADMIN_PRIVATE_KEY`, and it must match the first address in `ADMIN_ADDRESSES`.
- Contract addresses are read from `deployData/contractAddresses.json`.
- If only one contract is deployed for a chain (Escrow or MerchantManager), role commands automatically run for the deployed contract and skip the missing one.
- On Filecoin (chain `314159`), role broadcasts automatically use `--skip-simulation` to avoid local gas-estimation mismatches.
- Role commands do not run source-code verification; do not pass `--verify` / `--no-verify` to `roles.sh`.

## Supported Chains

Configured in `script/chains.json`. All use LeanRPC.

| Network | Chain ID |
|---|---|
| Sepolia | 11155111 |
| Arbitrum Sepolia | 421614 |
| Optimism Sepolia | 11155420 |
| Base Sepolia | 84532 |
| Ethereum | 1 |
| Polygon | 137 |
| Arbitrum | 42161 |
| Optimism | 10 |
| Base | 8453 |

To add a new chain, add its config to `script/chains.json`.

## Role Hierarchy

```
SuperAdmin
├── All Admin + TransactionKey powers
├── Add/remove Admins and TransactionKeys
├── Pause / Unpause
├── FullStop / Lift FullStop
├── Emergency withdraw (only when full stopped)
└── Set fee recipient

Admin
├── All TransactionKey powers
├── Add/remove TransactionKeys
└── Set fee recipient

TransactionKey (hot wallets for backend)
├── Capture payments
├── Settle payments
├── Initiate/resolve disputes
├── Refund payments
└── Execute payouts
```

## Testing

```bash
forge test
forge test -vvv
forge test --match-test test_CaptureNativePayment
forge test --gas-report
```

## Project Structure

```
src/
├── NodeRailsEscrow.sol
├── NodeRailsMerchantManager.sol
├── interfaces/
│   ├── INodeRailsEscrow.sol
│   └── INodeRailsMerchantManager.sol
└── libraries/
    └── TimelocksLib.sol

script/
├── chains.json
├── deploy.sh
├── roles.sh
├── save-deploy-data.py
└── solidity/
    ├── DeployAll.s.sol
    ├── DeployEscrow.s.sol
    ├── DeployMerchantManager.s.sol
    └── SetupRoles.s.sol

deployData/
├── contractAddresses.json
├── contractAbis.json
└── deploymentHistory.json
```

## License

MIT
