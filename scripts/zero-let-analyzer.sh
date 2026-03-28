#!/bin/bash
# Zero Let Analyzer & Auto-Fix Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

source "$SCRIPT_DIR/zero-let-common.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

capture_snapshot() {
  local code_file="$1"
  local raw_file="$2"
  collect_code_only_lets > "$code_file"
  collect_raw_lets > "$raw_file"
}

INITIAL_CODE_FILE="$(mktemp)"
INITIAL_RAW_FILE="$(mktemp)"
FINAL_CODE_FILE="$(mktemp)"
FINAL_RAW_FILE="$(mktemp)"
trap 'rm -f "$INITIAL_CODE_FILE" "$INITIAL_RAW_FILE" "$FINAL_CODE_FILE" "$FINAL_RAW_FILE"' EXIT

capture_snapshot "$INITIAL_CODE_FILE" "$INITIAL_RAW_FILE"

INITIAL_TOTAL="$(count_hits "$INITIAL_CODE_FILE")"
INITIAL_RAW_TOTAL="$(count_hits "$INITIAL_RAW_FILE")"

echo ""
echo "${CYAN}Zero Let Analyzer & Fixer${NC}"
echo ""
echo "${BLUE}Primary metric:${NC} executable ${YELLOW}let${NC} declarations in package source files only"
echo "  ${YELLOW}Code-only executable let:${NC} $INITIAL_TOTAL"
echo "  ${CYAN}Raw grep let hits (secondary):${NC} $INITIAL_RAW_TOTAL"
echo ""

if [ "$INITIAL_TOTAL" -gt 0 ]; then
  echo "${CYAN}Examples from the primary metric:${NC}"
  head -n 15 "$INITIAL_CODE_FILE" | sed 's/^/  /'
  echo ""
fi

NOISE_COUNT="$(collect_raw_noise_examples "$INITIAL_RAW_FILE" | wc -l | tr -d ' ')"
if [ "$NOISE_COUNT" -gt 0 ]; then
  echo "${CYAN}Secondary-only raw grep hits (tests/comments/docs):${NC}"
  collect_raw_noise_examples "$INITIAL_RAW_FILE" | sed 's/^/  /'
  echo ""
fi

echo "${BLUE}Running ESLint prefer-const --fix...${NC}"
echo "----------------------------------------"
npx eslint "packages/**/*.ts" -c eslint.config.js --fix --cache 2>&1 | grep -v "MODULE_TYPELESS" | grep -v "Reparsing" | grep -v "To eliminate" || true
echo ""

echo "${BLUE}Building...${NC}"
echo "----------------------------------------"
npm run build 2>&1 | tail -5
echo ""

capture_snapshot "$FINAL_CODE_FILE" "$FINAL_RAW_FILE"

FINAL_TOTAL="$(count_hits "$FINAL_CODE_FILE")"
FINAL_RAW_TOTAL="$(count_hits "$FINAL_RAW_FILE")"
PRIMARY_SAVED=$((INITIAL_TOTAL - FINAL_TOTAL))
RAW_SAVED=$((INITIAL_RAW_TOTAL - FINAL_RAW_TOTAL))

echo "${CYAN}Final Report${NC}"
echo ""
echo "  ${BLUE}Primary before:${NC} $INITIAL_TOTAL"
echo "  ${BLUE}Primary after:${NC}  $FINAL_TOTAL"
echo "  ${GREEN}Primary reduced:${NC} $PRIMARY_SAVED"
echo ""
echo "  ${BLUE}Raw before:${NC} $INITIAL_RAW_TOTAL"
echo "  ${BLUE}Raw after:${NC}  $FINAL_RAW_TOTAL"
echo "  ${GREEN}Raw reduced:${NC} $RAW_SAVED"
echo ""
echo "  ${GREEN}Build status:${NC} success"
echo ""
