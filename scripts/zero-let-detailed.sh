#!/bin/bash
# Zero Let Detailed Analyzer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

source "$SCRIPT_DIR/zero-let-common.sh"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CODE_ONLY_FILE="$(mktemp)"
RAW_FILE="$(mktemp)"
trap 'rm -f "$CODE_ONLY_FILE" "$RAW_FILE"' EXIT

collect_code_only_lets > "$CODE_ONLY_FILE"
collect_raw_lets > "$RAW_FILE"

TOTAL_LET="$(count_hits "$CODE_ONLY_FILE")"
RAW_TOTAL_LET="$(count_hits "$RAW_FILE")"
RAW_NOISE_COUNT="$(collect_raw_noise_examples "$RAW_FILE" | wc -l | tr -d ' ')"

echo ""
echo "${CYAN}Zero Let Detailed Analyzer${NC}"
echo ""
echo "${BLUE}Primary metric:${NC} package source only, executable ${YELLOW}let${NC} declarations"
echo "  ${YELLOW}Code-only executable let:${NC} $TOTAL_LET"
echo "  ${CYAN}Raw grep let hits (secondary):${NC} $RAW_TOTAL_LET"
echo "  ${CYAN}Raw-only noise/examples available:${NC} $RAW_NOISE_COUNT"
echo ""

echo "${CYAN}Primary locations:${NC}"
if [ "$TOTAL_LET" -gt 0 ]; then
  head -n 30 "$CODE_ONLY_FILE" | sed 's/^/  /'
else
  echo "  none"
fi
echo ""

echo "${CYAN}Per-package breakdown:${NC}"
printf "  %-20s %12s %12s\n" "Package" "CodeOnly" "Raw"
for pkg in packages/*; do
  [ -d "$pkg" ] || continue
  pkg_name="$(basename "$pkg")"
  code_count="$(collect_code_only_lets_for_scope "$pkg" | wc -l | tr -d ' ')"
  raw_count="$(collect_raw_lets_for_scope "$pkg" | wc -l | tr -d ' ')"
  if [ "$code_count" -gt 0 ] || [ "$raw_count" -gt 0 ]; then
    printf "  %-20s %12s %12s\n" "$pkg_name" "$code_count" "$raw_count"
  fi
done
echo ""

if [ "$RAW_NOISE_COUNT" -gt 0 ]; then
  echo "${CYAN}Secondary-only raw grep hits (comments/tests/docs):${NC}"
  collect_raw_noise_examples "$RAW_FILE" | sed 's/^/  /'
  echo ""
fi

if [ "$TOTAL_LET" -eq 0 ]; then
  echo "${GREEN}Zero let achieved for the primary metric.${NC}"
else
  echo "${YELLOW}Remaining primary lets to refactor:${NC} $TOTAL_LET"
fi
echo ""
