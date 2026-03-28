#!/bin/bash
# Show let locations in the codebase

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

source "$SCRIPT_DIR/zero-let-common.sh"

CODE_ONLY_FILE="$(mktemp)"
RAW_FILE="$(mktemp)"
trap 'rm -f "$CODE_ONLY_FILE" "$RAW_FILE"' EXIT

collect_code_only_lets > "$CODE_ONLY_FILE"
collect_raw_lets > "$RAW_FILE"

TOTAL_CODE_ONLY="$(count_hits "$CODE_ONLY_FILE")"
TOTAL_RAW="$(count_hits "$RAW_FILE")"

echo "Let Locations"
echo ""
echo "Primary metric (package source executable lets): $TOTAL_CODE_ONLY"
echo "Raw grep hits (secondary): $TOTAL_RAW"
echo ""

echo "By package:"
for pkg in packages/*; do
  [ -d "$pkg" ] || continue
  pkg_name="$(basename "$pkg")"
  count="$(collect_code_only_lets_for_scope "$pkg" | wc -l | tr -d ' ')"
  if [ "$count" -gt 0 ]; then
    echo ""
    echo "  $pkg_name ($count)"
    collect_code_only_lets_for_scope "$pkg" | head -20 | sed 's/^/    /'
  fi
done

echo ""
echo "All primary locations:"
if [ "$TOTAL_CODE_ONLY" -gt 0 ]; then
  head -100 "$CODE_ONLY_FILE" | sed 's/^/  /'
else
  echo "  none"
fi

NOISE_COUNT="$(collect_raw_noise_examples "$RAW_FILE" | wc -l | tr -d ' ')"
if [ "$NOISE_COUNT" -gt 0 ]; then
  echo ""
  echo "Secondary-only raw grep hits:"
  collect_raw_noise_examples "$RAW_FILE" | sed 's/^/  /'
fi
echo ""
