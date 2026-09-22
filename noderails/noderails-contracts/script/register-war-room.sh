#!/bin/bash
set -euo pipefail

# Register the latest forge deploy with NodeRails War Room (PUT /api/deployments).
# Usage: ./script/register-war-room.sh <chainId> <scriptName>
# If WAR_ROOM_URL is unset, warn and exit 0 so local forge still works.

CHAIN_ID="${1:-}"
SCRIPT_NAME="${2:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "$CHAIN_ID" || -z "$SCRIPT_NAME" ]]; then
    echo "Usage: ./script/register-war-room.sh <chainId> <scriptName>"
    exit 1
fi

if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

if [[ -z "${WAR_ROOM_URL:-}" ]]; then
    echo "⚠ WAR_ROOM_URL unset — skip War Room register (local forge still works)"
    exit 0
fi

if [[ -z "${WAR_ROOM_DEPLOY_API_KEY:-}" ]]; then
    echo "⚠ WAR_ROOM_DEPLOY_API_KEY unset — skip War Room register"
    exit 0
fi

ADDRESSES_FILE="deployData/contractAddresses.json"
BROADCAST_FILE="broadcast/${SCRIPT_NAME}.s.sol/${CHAIN_ID}/run-latest.json"

if [[ ! -f "$ADDRESSES_FILE" ]]; then
    echo "⚠ $ADDRESSES_FILE missing — skip War Room register"
    exit 0
fi

PAYLOAD="$(python3 - "$ADDRESSES_FILE" "$BROADCAST_FILE" "$CHAIN_ID" <<'PY'
import json, sys
addresses_path, broadcast_path, chain_id = sys.argv[1], sys.argv[2], sys.argv[3]
with open(addresses_path) as f:
    all_addr = json.load(f)
chain = all_addr.get(str(chain_id), {})
escrow = chain.get("NodeRailsEscrow", "")
mm = chain.get("NodeRailsMerchantManager", "")
tx_hash = ""
try:
    with open(broadcast_path) as f:
        broadcast = json.load(f)
    receipts = broadcast.get("receipts") or []
    if receipts:
        tx_hash = receipts[0].get("transactionHash") or receipts[0].get("transactionHash") or ""
    if not tx_hash:
        txs = broadcast.get("transactions") or []
        if txs:
            tx_hash = txs[0].get("hash") or txs[0].get("transactionHash") or ""
except FileNotFoundError:
    pass
print(json.dumps({
    "chainId": int(chain_id),
    "escrow": escrow or None,
    "merchantManager": mm or None,
    "txHash": tx_hash or None,
}))
PY
)"

URL="${WAR_ROOM_URL%/}/api/deployments"
echo "PUT $URL"
if curl -sS -X PUT "$URL" \
    -H "Authorization: Bearer ${WAR_ROOM_DEPLOY_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD"; then
    echo ""
    echo "✓ War Room registered chain $CHAIN_ID"
else
    echo "⚠ War Room register failed (deploy data is already saved locally)"
fi
