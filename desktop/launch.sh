#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
unset ELECTRON_RUN_AS_NODE
exec "$HERE/zombie-bagarre" --steam-deck "$@"
