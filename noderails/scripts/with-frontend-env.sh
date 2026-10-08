#!/usr/bin/env bash
set -euo pipefail

export DOPPLER_CONFIG="${DOPPLER_CONFIG:-dev_frontend}"
# fs.watch/kqueue EMFILE when several Next apps share a machine with tsx + Cursor.
export WATCHPACK_POLLING="${WATCHPACK_POLLING:-1000}"
export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-1}"
exec "$(cd "$(dirname "$0")" && pwd)/with-doppler.sh" "$@"
