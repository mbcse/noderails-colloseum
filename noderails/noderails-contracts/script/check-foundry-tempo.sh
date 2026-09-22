#!/bin/bash
# Exit 0 if `forge script` supports --tempo.fee-token (required for Tempo 4217 / 42431 deploy).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/foundry-path.sh
source "$SCRIPT_DIR/lib/foundry-path.sh"
foundry_prepend_path
FORGE="$(foundry_forge_bin)"

if ! command -v "$FORGE" >/dev/null 2>&1 && [[ ! -x "$FORGE" ]]; then
  echo "forge not found. Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup"
  exit 1
fi

if "$FORGE" script --help 2>&1 | grep -q -- '--tempo.fee-token'; then
  echo "OK: $FORGE ($("$FORGE" --version 2>/dev/null | head -1))"
  exit 0
fi

echo "Foundry is too old for Tempo deploy (missing --tempo.fee-token)."
echo "Forge: $FORGE"
echo "Current: $("$FORGE" --version 2>/dev/null | head -1)"
echo "Run: foundryup"
echo "Then restart contracts ops-ui (Cursor task does not load your shell profile)."
echo "Docs: https://tempo.xyz/developers/docs/sdk/foundry"
exit 1
