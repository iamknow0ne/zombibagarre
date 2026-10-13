#!/usr/bin/env bash
set -euo pipefail
SOURCE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  printf 'This edition requires x86_64 Linux (Steam Deck / SteamOS).\n' >&2; exit 1
fi
if [[ ! -x "$SOURCE/zombie-bagarre" || ! -f "$SOURCE/resources/app.asar" ]]; then
  printf 'Extract the complete download first, then run Install Zombie Bagarre.sh.\n' >&2; exit 1
fi
DEST="$HOME/Games/Zombie Bagarre"
if [[ $# -gt 0 ]]; then
  if [[ $# -ne 2 || "$1" != --prefix || "$2" != /* ]]; then printf 'Usage: install.sh [--prefix /absolute/install/path]\n' >&2; exit 1; fi
  DEST="$2"
fi
if [[ "$SOURCE" == "$DEST" ]]; then printf 'Already installed in %s\n' "$DEST"; exit 0; fi
if pgrep -f "$DEST/zombie-bagarre" >/dev/null 2>&1; then printf 'Close Zombie Bagarre before installing an update.\n' >&2; exit 1; fi
PARENT="$(dirname -- "$DEST")"
mkdir -p "$PARENT"
STAGE="$(mktemp -d "$PARENT/.zombie-bagarre-install.XXXXXX")"
trap 'rm -rf -- "$STAGE"' EXIT
cp -a "$SOURCE/." "$STAGE/"
if [[ -e "$DEST" ]]; then
  BACKUP="${DEST}.backup.$(date +%s)"
  if [[ -e "$BACKUP" ]]; then printf 'An installation backup already exists. Try again shortly.\n' >&2; exit 1; fi
  mv -- "$DEST" "$BACKUP"
  printf 'Previous installation preserved in %s\n' "$BACKUP"
fi
mv -- "$STAGE" "$DEST"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
mkdir -p "$DATA/applications" "$DATA/icons/hicolor/256x256/apps"
cp "$DEST/desktop/icon.png" "$DATA/icons/hicolor/256x256/apps/zombie-bagarre.png"
# Desktop Entry Exec has its own escaping, including percent field codes.
desktop_quote() { local s="$1"; s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; s="${s//\$/\\\$}"; s="${s//\`/\\\`}"; s="${s//%/%%}"; printf '"%s"' "$s"; }
{
  printf '[Desktop Entry]\nType=Application\nName=Zombie Bagarre\nComment=Quarantine - offline survival action\n'
  printf 'Exec='; desktop_quote "$DEST/launch.sh"; printf '\n'
  printf 'Icon=zombie-bagarre\nTerminal=false\nCategories=Game;ActionGame;\nStartupWMClass=zombie-bagarre\n'
} > "$DATA/applications/zombie-bagarre.desktop"
command -v update-desktop-database >/dev/null && update-desktop-database "$DATA/applications" || true
printf '\nInstalled! Your character saves are preserved separately.\n\nIn Steam Desktop Mode:\n  Games > Add a Non-Steam Game to My Library\n  Select Zombie Bagarre, then Add Selected Programs.\n  Controller layout: Gamepad With Joystick Trackpad.\n  Do not force Proton compatibility.\n\nReturn to Gaming Mode > Library > Non-Steam > Zombie Bagarre.\n'
