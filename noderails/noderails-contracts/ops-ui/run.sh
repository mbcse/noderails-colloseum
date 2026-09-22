#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ ! -d noderails-contracts/ops-ui/node_modules ] && [ ! -d node_modules/.pnpm ]; then
  pnpm install
fi
exec pnpm --filter noderails-contracts-ops-ui start
