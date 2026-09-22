#!/bin/bash
set -euo pipefail

# ============================================================================
# NodeRails Contract Deployment Script
# ============================================================================
#
# Usage:
#   ./script/deploy.sh <chainId> <target>
#
# Targets:
#   all               Deploy both Escrow + MerchantManager
#   escrow            Deploy only NodeRailsEscrow
#   merchant-manager  Deploy only NodeRailsMerchantManager
#
# Examples:
#   ./script/deploy.sh 11155111 all
#   ./script/deploy.sh 11155111 escrow
#   ./script/deploy.sh 84532 merchant-manager
#
# Required .env variables:
#   DEPLOYER_PRIVATE_KEY     Private key for deploying contracts
#   SUPER_ADMIN_ADDRESSES    Comma-separated 5 SuperAdmin signer EOAs (not KeyRole.SuperAdmin)
#   WAR_ROOM_URL             Optional. Register this deploy with NodeRails War Room
#   WAR_ROOM_DEPLOY_API_KEY  Bearer token for War Room PUT /api/deployments
#   ADMIN_ADDRESSES          Comma-separated admin addresses assigned in constructors
#   TRANSACTION_KEY_ADDRESSES  Optional. TX keys assigned in constructors
#   DEPLOY_SWAP_ROUTERS / DEPLOY_BRIDGE_ROUTERS / DEPLOY_SETTLEMENT_TOKENS
#                          Optional per-deploy Escrow constructor allowlists (ops UI).
#                          Override leftover .env lists for this run only.
#   FEE_RECIPIENT_ADDRESS    Address that receives platform fees (for escrow)
#   ETHERSCAN_API_KEY        Optional. Auto-verify after deploy if set
#   LEANRPC_API_KEY          RPC provider API key
#   DEPLOY_DRY_RUN=1         Simulate only (no broadcast, no save)
#   DEPLOY_WITH_GAS_PRICE    Locked maxFeePerGas (wei or 280gwei)
#   DEPLOY_PRIORITY_GAS_PRICE  Locked maxPriorityFeePerGas
#   DEPLOY_GAS_ESTIMATE_MULTIPLIER  Default 110 (200 on Tempo via ops UI)
#   DEPLOY_TEMPO_FEE_TOKEN         TIP-20 address for forge --tempo.fee-token (4217/42431)
#
# Tempo (chain 4217 / 42431): requires Foundry with --tempo.fee-token (run: foundryup).
#   https://tempo.xyz/developers/docs/sdk/foundry
#
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=lib/foundry-path.sh
source "$SCRIPT_DIR/lib/foundry-path.sh"
foundry_prepend_path
FORGE="$(foundry_forge_bin)"

# --- Args ---
CHAIN_ID="${1:-}"
TARGET="${2:-}"

if [[ -z "$CHAIN_ID" || -z "$TARGET" ]]; then
    echo "Usage: ./script/deploy.sh <chainId> <target>"
    echo ""
    echo "Targets:"
    echo "  all               Deploy Escrow + MerchantManager"
    echo "  escrow            Deploy NodeRailsEscrow only"
    echo "  merchant-manager  Deploy NodeRailsMerchantManager only"
    echo ""
    echo "Examples:"
    echo "  ./script/deploy.sh 11155111 all"
    echo "  ./script/deploy.sh 84532 escrow"
    exit 1
fi

# --- Load .env ---
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

# Ops UI per-deploy fields win over leftover .env lists (even when empty).
if [[ -n "${DEPLOY_SWAP_ROUTERS+x}" ]]; then
    export SWAP_ROUTERS="$DEPLOY_SWAP_ROUTERS"
fi
if [[ -n "${DEPLOY_BRIDGE_ROUTERS+x}" ]]; then
    export BRIDGE_ROUTERS="$DEPLOY_BRIDGE_ROUTERS"
fi
if [[ -n "${DEPLOY_SETTLEMENT_TOKENS+x}" ]]; then
    export SETTLEMENT_TOKENS="$DEPLOY_SETTLEMENT_TOKENS"
fi

# --- Resolve chain config ---
CHAINS_FILE="$SCRIPT_DIR/chains.json"

get_chain_field() {
    local field="$1"
    python3 -c "
import json, sys
with open('$CHAINS_FILE') as f:
    data = json.load(f)
for network_type in ['testnets', 'mainnets']:
    for name, chain in data.get(network_type, {}).items():
        if str(chain['chainId']) == '$CHAIN_ID':
            print(chain.get('$field', ''))
            sys.exit(0)
print('')
"
}

OPS_RPC_URL="${RPC_URL:-}"
RPC_URL=$(get_chain_field "rpcUrl")
if [[ -n "$OPS_RPC_URL" ]]; then
    RPC_URL="$OPS_RPC_URL"
    echo "Using RPC override from environment"
fi
GAS_LIMIT=$(get_chain_field "gasLimit")
TEMPO_FEE_TOKEN=$(get_chain_field "tempoFeeToken")
if [[ -n "${DEPLOY_TEMPO_FEE_TOKEN:-}" ]]; then
    TEMPO_FEE_TOKEN="$DEPLOY_TEMPO_FEE_TOKEN"
fi
VERIFIER_URL=$(get_chain_field "verifierUrl")
EXPLORER_URL=$(get_chain_field "explorerUrl")
if [[ -z "$EXPLORER_URL" && -n "${OPS_EXPLORER_URL:-}" ]]; then
    EXPLORER_URL="$OPS_EXPLORER_URL"
fi
EVM_VERSION=$(get_chain_field "evmVersion")
EVM_VERSION_FLAG=""
if [[ -n "$EVM_VERSION" ]]; then
    EVM_VERSION_FLAG="--evm-version $EVM_VERSION"
fi
CHAIN_NAME=$(python3 -c "
import json
with open('$CHAINS_FILE') as f:
    data = json.load(f)
for network_type in ['testnets', 'mainnets']:
    for name, chain in data.get(network_type, {}).items():
        if str(chain['chainId']) == '$CHAIN_ID':
            print(name)
            exit(0)
print('')
")
if [[ -z "$CHAIN_NAME" ]]; then
    CHAIN_NAME="${OPS_CHAIN_NAME:-unknown}"
fi

if [[ -z "$RPC_URL" ]]; then
    echo "Error: Chain ID $CHAIN_ID not found in chains.json and RPC_URL is unset"
    exit 1
fi

# --- Map target to Solidity script ---
case "$TARGET" in
    all)
        SCRIPT_NAME="DeployAll"
        ;;
    escrow)
        SCRIPT_NAME="DeployEscrow"
        ;;
    merchant-manager)
        SCRIPT_NAME="DeployMerchantManager"
        ;;
    *)
        echo "Error: Unknown target '$TARGET'. Use: all, escrow, merchant-manager"
        exit 1
        ;;
esac

SCRIPT_PATH="script/solidity/${SCRIPT_NAME}.s.sol"

# --- Validate required env vars ---
: "${DEPLOYER_PRIVATE_KEY:?DEPLOYER_PRIVATE_KEY is required}"
: "${SUPER_ADMIN_ADDRESSES:?SUPER_ADMIN_ADDRESSES is required (exactly 5 addresses)}"
: "${ADMIN_ADDRESSES:?ADMIN_ADDRESSES is required}"

if [[ "$TARGET" == "all" || "$TARGET" == "escrow" ]]; then
    : "${FEE_RECIPIENT_ADDRESS:?FEE_RECIPIENT_ADDRESS is required for escrow deployment}"
fi

# --- Build ---
echo "============================================"
echo "  NodeRails Contract Deployment"
echo "============================================"
echo "  Chain:    $CHAIN_NAME ($CHAIN_ID)"
echo "  Target:   $TARGET ($SCRIPT_NAME)"
echo "  SuperAdmin signers: $SUPER_ADMIN_ADDRESSES"
echo "  Admins:     $ADMIN_ADDRESSES"
if [[ "$TARGET" == "all" || "$TARGET" == "escrow" ]]; then
    echo "  Swap routers: ${SWAP_ROUTERS:-<none>}"
    echo "  Bridge routers: ${BRIDGE_ROUTERS:-<none>}"
    echo "  Settlement tokens: ${SETTLEMENT_TOKENS:-<none>}"
fi
echo "============================================"
echo ""

echo "Building contracts..."
"$FORGE" build
echo ""

# --- Deploy ---
if [[ "$CHAIN_ID" == "4217" || "$CHAIN_ID" == "42431" ]] && [[ "$TARGET" == "all" ]]; then
    echo "Deploying on $CHAIN_NAME (chain $CHAIN_ID) as Logic, then Escrow, then MerchantManager..."
else
    echo "Deploying $SCRIPT_NAME on $CHAIN_NAME (chain $CHAIN_ID)..."
fi
echo ""

# For Filecoin, we need to skip simulation and rely on RPC gas estimation
SKIP_SIM_FLAG=""
if [[ "$CHAIN_ID" == "314159" ]]; then
    SKIP_SIM_FLAG="--skip-simulation"
fi

DRY_RUN="${DEPLOY_DRY_RUN:-}"
BROADCAST_FLAG=""
if [[ "$DRY_RUN" != "1" ]]; then
    BROADCAST_FLAG="--broadcast"
else
    echo "Dry run: simulate only, no broadcast"
fi

FEE_FLAGS=""
if [[ -n "${DEPLOY_WITH_GAS_PRICE:-}" ]]; then
    FEE_FLAGS+=" --with-gas-price ${DEPLOY_WITH_GAS_PRICE}"
    echo "Locked max fee: $DEPLOY_WITH_GAS_PRICE"
fi
if [[ -n "${DEPLOY_PRIORITY_GAS_PRICE:-}" ]]; then
    FEE_FLAGS+=" --priority-gas-price ${DEPLOY_PRIORITY_GAS_PRICE}"
    echo "Locked priority fee: $DEPLOY_PRIORITY_GAS_PRICE"
fi
# Tempo tx gas cap is 30_000_000 (TIP-1010). Broadcast multiplier is computed per script
# so the limit stays under this (340% of a ~9.6M sim is ~32.5M and the node rejects it).
TEMPO_TX_GAS_CAP=29900000
if [[ -n "${DEPLOY_GAS_ESTIMATE_MULTIPLIER:-}" ]]; then
    GAS_MULT="${DEPLOY_GAS_ESTIMATE_MULTIPLIER}"
elif [[ "$CHAIN_ID" == "4217" || "$CHAIN_ID" == "42431" ]]; then
    GAS_MULT="300"
else
    GAS_MULT="110"
fi
FEE_FLAGS+=" --gas-estimate-multiplier ${GAS_MULT}"

forge_supports_tempo_fee_token() {
    "$FORGE" script --help 2>&1 | grep -q -- '--tempo.fee-token'
}

require_forge_tempo_support() {
    if forge_supports_tempo_fee_token; then
        return 0
    fi
    echo ""
    echo "Error: Tempo deploy requires Foundry with --tempo.fee-token support."
    echo "  Forge:   $FORGE"
    echo "  Current: $("$FORGE" --version 2>/dev/null | head -1 || echo 'forge not found')"
    echo "  Fix:     curl -L https://foundry.paradigm.xyz | bash && foundryup"
    echo "  Verify:  forge script --help | grep tempo.fee-token"
    echo "  Docs:    https://tempo.xyz/developers/docs/sdk/foundry"
    echo ""
    exit 1
}

TEMPO_FLAGS=""
TEMPO_FORK_FLAGS=""
if [[ "$CHAIN_ID" == "4217" || "$CHAIN_ID" == "42431" ]]; then
    require_forge_tempo_support
    if [[ -z "$TEMPO_FEE_TOKEN" ]]; then
        echo "Error: Tempo deploy requires tempoFeeToken in chains.json or DEPLOY_TEMPO_FEE_TOKEN"
        exit 1
    fi
    TEMPO_FLAGS="--tempo.fee-token $TEMPO_FEE_TOKEN"
    # Forge's first fork connect on macOS can fail getaddrinfo once ("nodename nor servname")
    # even when the host resolves. Retry inside Forge, then again around the process.
    TEMPO_FORK_FLAGS="--fork-retries 5 --fork-retry-backoff 2000 --rpc-timeout 60"
    echo "Tempo fee token (TIP-20): $TEMPO_FEE_TOKEN"
    echo "Forge: $FORGE ($("$FORGE" --version 2>/dev/null | head -1))"
    echo "Fund the deployer with this token before broadcast."
    echo "Tempo tx gas cap: ${TEMPO_TX_GAS_CAP} (broadcast multiplier is fitted under this)."
    if [[ -d "$ROOT_DIR/broadcast/$SCRIPT_PATH/$CHAIN_ID" ]]; then
        echo "If a prior broadcast failed, delete broadcast/$SCRIPT_PATH/$CHAIN_ID before retrying (avoid --resume with a low gas limit)."
    fi
fi

GAS_LIMIT_FLAG=""
if [[ -n "$GAS_LIMIT" ]]; then
    GAS_LIMIT_FLAG="--gas-limit $GAS_LIMIT"
fi

rebuild_fee_multiplier() {
    FEE_FLAGS="$(printf '%s' "$FEE_FLAGS" | sed -E 's/ --gas-estimate-multiplier [0-9]+//')"
    FEE_FLAGS+=" --gas-estimate-multiplier ${GAS_MULT}"
}

forge_output_is_transient() {
    grep -E -q 'could not instantiate forked environment|nodename nor servname|dns error|error sending request for url|timed out|Connection refused' "$1"
}

# Stream Forge output. Retry when the RPC fork never connects. A non-zero return
# means the call failed for a reason a retry will not fix, or retries are exhausted.
invoke_forge() {
    local attempt=1
    local max=4
    local log code
    while true; do
        log="$(mktemp)"
        set +e
        ETHERSCAN_API_KEY= "$FORGE" "$@" 2>&1 | tee "$log"
        code=${PIPESTATUS[0]}
        set -e
        if [[ "$code" -eq 0 ]]; then
            rm -f "$log"
            return 0
        fi
        if [[ "$attempt" -ge "$max" ]] || ! forge_output_is_transient "$log"; then
            rm -f "$log"
            return "$code"
        fi
        rm -f "$log"
        echo "RPC connect failed (attempt ${attempt}/${max}). Retrying in $((attempt * 2))s..."
        sleep $((attempt * 2))
        attempt=$((attempt + 1))
    done
}

# Simulate at 100%, then pick the highest multiplier whose limit is <= TEMPO_TX_GAS_CAP.
cap_tempo_gas_multiplier() {
    local name="$1"
    local path="script/solidity/${name}.s.sol"
    if [[ "$CHAIN_ID" != "4217" && "$CHAIN_ID" != "42431" ]]; then
        return 0
    fi
    if [[ "${DRY_RUN:-}" == "1" || -z "${BROADCAST_FLAG:-}" ]]; then
        return 0
    fi
    echo "Tempo: measuring $name gas (no broadcast) to stay under ${TEMPO_TX_GAS_CAP}..."
    local out est attempt=1 code
    while true; do
        set +e
        # shellcheck disable=SC2086
        out=$(ETHERSCAN_API_KEY= "$FORGE" script $EVM_VERSION_FLAG "$path:$name" \
            --rpc-url "$RPC_URL" \
            $TEMPO_FLAGS \
            $TEMPO_FORK_FLAGS \
            --gas-estimate-multiplier 100 \
            2>&1)
        code=$?
        set -e
        est="$(printf '%s\n' "$out" | grep -E 'Estimated total gas used for script:' | tail -1 | awk '{print $NF}')"
        if [[ "$est" =~ ^[0-9]+$ && "$est" -gt 0 ]]; then
            break
        fi
        if [[ "$attempt" -ge 4 ]] || ! printf '%s\n' "$out" | grep -E -q 'could not instantiate forked environment|nodename nor servname|dns error|error sending request for url'; then
            echo "Error: could not read simulated gas for $name (forge exit ${code})."
            printf '%s\n' "$out" | tail -40
            echo "No transaction was sent. Forge could not finish the RPC simulation."
            exit 1
        fi
        echo "RPC connect failed while measuring $name (attempt ${attempt}/4). Retrying in $((attempt * 2))s..."
        sleep $((attempt * 2))
        attempt=$((attempt + 1))
    done
    if (( est >= TEMPO_TX_GAS_CAP )); then
        echo "Error: $name simulated gas ${est} is already above Tempo's ${TEMPO_TX_GAS_CAP} transaction cap."
        exit 1
    fi
    GAS_MULT=$(( TEMPO_TX_GAS_CAP * 100 / est ))
    while (( est * GAS_MULT / 100 > TEMPO_TX_GAS_CAP && GAS_MULT > 100 )); do
        GAS_MULT=$(( GAS_MULT - 1 ))
    done
    rebuild_fee_multiplier
    echo "Tempo $name: sim ${est} gas × ${GAS_MULT}% → limit $(( est * GAS_MULT / 100 )) (cap ${TEMPO_TX_GAS_CAP})."
}

read_created_address() {
    local script_name="$1"
    local contract_name="$2"
    python3 - "$script_name" "$CHAIN_ID" "$contract_name" <<'PY'
import json, sys
script_name, chain_id, contract_name = sys.argv[1], sys.argv[2], sys.argv[3]
path = f"broadcast/{script_name}.s.sol/{chain_id}/run-latest.json"
with open(path) as f:
    data = json.load(f)
for tx in data.get("transactions", []):
    if tx.get("transactionType") == "CREATE" and tx.get("contractName") == contract_name:
        print(tx["contractAddress"])
        sys.exit(0)
sys.exit(1)
PY
}

# Tempo code creation is ~1000 gas/byte. Escrow's constructor also creates Logic, so one tx
# holds both bytecodes and cannot fit under the 30M cap. Deploy Logic first.
tempo_predeploy_escrow_logic() {
    if [[ -n "${ESCROW_LOGIC_ADDRESS:-}" ]]; then
        echo "Using existing ESCROW_LOGIC_ADDRESS=$ESCROW_LOGIC_ADDRESS"
        return 0
    fi
    echo "Tempo: deploying NodeRailsEscrowLogic in its own transaction."
    cap_tempo_gas_multiplier DeployEscrowLogic
    # shellcheck disable=SC2086
    if ! invoke_forge script $SKIP_SIM_FLAG $EVM_VERSION_FLAG "script/solidity/DeployEscrowLogic.s.sol:DeployEscrowLogic" \
        --rpc-url "$RPC_URL" \
        $BROADCAST_FLAG \
        $FEE_FLAGS \
        $TEMPO_FLAGS \
        $TEMPO_FORK_FLAGS \
        $GAS_LIMIT_FLAG \
        -vvvv; then
        echo "Forge did not broadcast Logic. A 'deployed at' line above is the local simulation, not an on-chain address."
        exit 1
    fi
    ESCROW_LOGIC_ADDRESS="$(read_created_address DeployEscrowLogic NodeRailsEscrowLogic)"
    export ESCROW_LOGIC_ADDRESS
    echo "ESCROW_LOGIC_ADDRESS=$ESCROW_LOGIC_ADDRESS"
    python3 script/save-deploy-data.py "$CHAIN_ID" DeployEscrowLogic
}

run_forge_deploy() {
    local name="$1"
    local path="script/solidity/${name}.s.sol"
    if [[ "$name" == "DeployEscrow" && ( "$CHAIN_ID" == "4217" || "$CHAIN_ID" == "42431" ) && -n "${BROADCAST_FLAG:-}" && "${DRY_RUN:-}" != "1" ]]; then
        tempo_predeploy_escrow_logic
    fi
    cap_tempo_gas_multiplier "$name"
    echo "Deploying $name on $CHAIN_NAME (chain $CHAIN_ID)..."
    # shellcheck disable=SC2086
    if ! invoke_forge script $SKIP_SIM_FLAG $EVM_VERSION_FLAG "$path:$name" \
        --rpc-url "$RPC_URL" \
        $BROADCAST_FLAG \
        $FEE_FLAGS \
        $TEMPO_FLAGS \
        $TEMPO_FORK_FLAGS \
        $GAS_LIMIT_FLAG \
        -vvvv; then
        echo "Forge failed. A 'deployed at' line above is the local simulation, not an on-chain address."
        exit 1
    fi
    echo ""
}

# Tempo: one top-level CREATE per transaction (Foundry --batch rule). Fee estimate must
# not create Logic outside startBroadcast — that address has no code in the on-chain sim
# and Escrow reverts with "Logic has no code". Use the Logic contract already on this chain.
if [[ "$CHAIN_ID" == "4217" || "$CHAIN_ID" == "42431" ]] \
    && [[ "$TARGET" == "all" ]] \
    && [[ "$DRY_RUN" == "1" ]]; then
    echo "Dry run: one CREATE per script (Logic, Escrow, MerchantManager). No broadcast."
    saved_logic="$(python3 - "$CHAIN_ID" <<'PY'
import json, sys
cid = sys.argv[1]
try:
    data = json.load(open("deployData/contractAddresses.json"))
except OSError:
    sys.exit(0)
print((data.get(cid) or {}).get("NodeRailsEscrowLogic", ""))
PY
)"
    if [[ -n "$saved_logic" ]]; then
        logic_code="$(cast code "$saved_logic" --rpc-url "$RPC_URL" 2>/dev/null || true)"
        if [[ -n "$logic_code" && "$logic_code" != "0x" ]]; then
            export ESCROW_LOGIC_ADDRESS="$saved_logic"
            echo "Dry run: Escrow simulation uses on-chain logic $saved_logic"
        fi
    fi
    echo ""
    if [[ -n "${ESCROW_LOGIC_ADDRESS:-}" ]]; then
        run_forge_deploy DeployEscrowLogic
    fi
    run_forge_deploy DeployEscrow
    run_forge_deploy DeployMerchantManager
    echo "Dry run complete. Addresses were not saved."
    exit 0
fi

# Tempo: DeployAll's first broadcast batch exceeds ~24M on-chain even at 250% gas mult.
if [[ "$CHAIN_ID" == "4217" || "$CHAIN_ID" == "42431" ]] \
    && [[ "$TARGET" == "all" ]] \
    && [[ "$DRY_RUN" != "1" ]] \
    && [[ -n "$BROADCAST_FLAG" ]]; then
    echo "Tempo: broadcasting Logic, then Escrow, then MerchantManager (separate txs; 30M gas cap)."
    echo ""
    run_forge_deploy DeployEscrow
    echo "Saving Escrow deployment data..."
    python3 script/save-deploy-data.py "$CHAIN_ID" DeployEscrow
    echo ""
    run_forge_deploy DeployMerchantManager
    echo "Saving MerchantManager deployment data..."
    python3 script/save-deploy-data.py "$CHAIN_ID" DeployMerchantManager
    echo ""
    echo "Registering deployment with NodeRails War Room..."
    "$SCRIPT_DIR/register-war-room.sh" "$CHAIN_ID" DeployMerchantManager || true
    echo ""
    echo "============================================"
    echo "  Deployment complete!"
    echo "  Chain: $CHAIN_NAME ($CHAIN_ID)"
    echo "  Target: all (Tempo split: Escrow + MerchantManager)"
    echo "============================================"
    exit 0
fi

# Deploy without verification first (verification happens as separate step after save)
run_forge_deploy "$SCRIPT_NAME"

if [[ "$DRY_RUN" == "1" ]]; then
    echo "Dry run complete. Addresses were not saved."
    exit 0
fi

# --- Save deploy data ---
echo "Saving deployment data..."
python3 script/save-deploy-data.py "$CHAIN_ID" "$SCRIPT_NAME"

echo ""

# --- Verify (best effort, does not block saved deployment metadata) ---
SHOULD_VERIFY="false"
if [[ -n "${ETHERSCAN_API_KEY:-}" ]]; then
    # Only verify if we have an API key
    SHOULD_VERIFY="true"
fi

if [[ "$SHOULD_VERIFY" == "true" ]]; then
    VERIFY_BACKEND=""
    VERIFY_API_URL=""

    # Tempo (Sourcify-compatible verifier)
    if [[ "$CHAIN_ID" == "4217" || "$CHAIN_ID" == "42431" ]]; then
        VERIFY_BACKEND="tempo"
        VERIFY_API_URL="${VERIFIER_URL:-https://contracts.tempo.xyz}"
    # Blockscout-based chains
    elif [[ "$EXPLORER_URL" == *"blockscout"* ]]; then
        VERIFY_BACKEND="blockscout"
        VERIFY_API_URL="${EXPLORER_URL%/}/api"
    elif [[ -n "${ETHERSCAN_API_KEY:-}" ]]; then
        # Etherscan-compatible path
        VERIFY_BACKEND="etherscan"
    fi

    if [[ -n "$VERIFY_BACKEND" ]]; then
        echo "Starting verification (best effort)..."
        set +e

        if [[ "$VERIFY_BACKEND" == "tempo" ]]; then
            "$FORGE" script "$SCRIPT_PATH:$SCRIPT_NAME" \
                --rpc-url "$RPC_URL" \
                --resume \
                --verify \
                --verifier sourcify \
                --verifier-url "$VERIFY_API_URL" \
                $TEMPO_FLAGS \
                -vvvv
        elif [[ "$VERIFY_BACKEND" == "blockscout" ]]; then
            "$FORGE" script "$SCRIPT_PATH:$SCRIPT_NAME" \
                --rpc-url "$RPC_URL" \
                --resume \
                --verify \
                --verifier blockscout \
                --verifier-url "$VERIFY_API_URL" \
                -vvvv
        else
            "$FORGE" script "$SCRIPT_PATH:$SCRIPT_NAME" \
                --rpc-url "$RPC_URL" \
                --resume \
                --verify \
                --etherscan-api-key "$ETHERSCAN_API_KEY" \
                -vvvv
        fi

        VERIFY_EXIT_CODE=$?
        set -e

        if [[ $VERIFY_EXIT_CODE -eq 0 ]]; then
            echo "✓ Verification succeeded"
        else
            echo "⚠ Verification failed (best effort - deployment data already saved)"
        fi
    fi
fi

echo ""
echo "Registering deployment with NodeRails War Room..."
"$SCRIPT_DIR/register-war-room.sh" "$CHAIN_ID" "$SCRIPT_NAME" || true

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "  Chain: $CHAIN_NAME ($CHAIN_ID)"
echo "  Target: $TARGET"
echo "============================================"
