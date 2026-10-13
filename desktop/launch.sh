#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# Capture even dynamic-loader/sandbox failures, which happen before our JS runs.
# Keep the game as Steam's tracked process; do not background it or use a pipe.
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/zombie-bagarre"
if mkdir -p "$LOG_DIR" && touch "$LOG_DIR/launch.log"; then
  if [[ $(wc -c < "$LOG_DIR/launch.log") -gt 2097152 ]]; then
    mv -f "$LOG_DIR/launch.log" "$LOG_DIR/launch.previous.log" || true
  fi
  printf 'Startup log: %s/launch.log\n' "$LOG_DIR"
  exec >> "$LOG_DIR/launch.log" 2>&1
else
  printf 'Cannot write a startup log in %s; continuing with terminal output.\n' "$LOG_DIR" >&2
fi
printf '\n--- Zombie Bagarre launch %s ---\n' "$(date -u +%FT%TZ)"
printf 'System: %s; display: X11=%s Wayland=%s\n' "$(uname -sm)" "${DISPLAY:-unset}" "${WAYLAND_DISPLAY:-unset}"
if [[ ! -x "$HERE/zombie-bagarre" || ! -f "$HERE/resources/app.asar" ]]; then
  printf 'Incomplete installation: extract the entire download, then run its installer.\n' >&2
  exit 1
fi
unset ELECTRON_RUN_AS_NODE
exec "$HERE/zombie-bagarre" --steam-deck --enable-logging=stderr "$@"
