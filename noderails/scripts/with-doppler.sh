#!/usr/bin/env bash
set -euo pipefail

# Cursor/VS Code tasks inherit macOS launchctl maxfiles soft=256. Four Next.js
# Watchpack watchers then throw EMFILE (too many open files) and miss routes.
_nofile="$(ulimit -n)"
if [ "$_nofile" != "unlimited" ] && [ "${_nofile:-0}" -lt 10240 ]; then
  ulimit -S -n 10240 2>/dev/null || ulimit -S -n 4096 2>/dev/null || true
fi
unset _nofile

if ! command -v doppler >/dev/null 2>&1; then
  echo "Doppler CLI is required." >&2
  echo "Install: https://docs.doppler.com/docs/install-cli" >&2
  exit 1
fi

PROJECT="${DOPPLER_PROJECT:-noderails}"
CONFIG="${DOPPLER_CONFIG:-dev_backend}"

exec doppler run --project "$PROJECT" --config "$CONFIG" -- "$@"
