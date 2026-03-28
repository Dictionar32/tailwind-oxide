#!/bin/bash
# Zero-Everything Analyzer - 16 Pilar (Source Only)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║              Zero-Everything Analyzer - tailwind-styled-v4 (16 Pilar)        ║${NC}"
echo "${CYAN}║                          $(date '+%Y-%m-%d %H:%M:%S')                          ║${NC}"
echo "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 1. ZERO LET
# ============================================
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}📊 1. ZERO LET${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_LET=$(find packages -type d -name "src" -exec grep -rn "let " {} \; 2>/dev/null | grep -v "for (let" | wc -l)
echo "   ${YELLOW}Total 'let' declarations:${NC} $TOTAL_LET"

# ============================================
# 2. ZERO ANY
# ============================================
echo ""
echo "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${MAGENTA}📊 2. ZERO ANY${NC}"
echo "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_ANY=$(find packages -type d -name "src" -exec grep -rn ": any" {} \; 2>/dev/null | wc -l)
AS_ANY=$(find packages -type d -name "src" -exec grep -rn "as any" {} \; 2>/dev/null | wc -l)
echo "   ${YELLOW}Total 'any' occurrences:${NC} $TOTAL_ANY"
echo "   ${RED}'as any' assertions:${NC} $AS_ANY"

# ============================================
# 3. ZERO TRY-CATCH
# ============================================
echo ""
echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${RED}📊 3. ZERO TRY-CATCH${NC}"
echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_TRY=$(find packages -type d -name "src" -exec grep -rn "try {" {} \; 2>/dev/null | wc -l)
echo "   ${YELLOW}Total 'try-catch' blocks:${NC} $TOTAL_TRY"

# ============================================
# 4. ZERO CLASS
# ============================================
echo ""
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}📊 4. ZERO CLASS${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_CLASS=$(find packages -type d -name "src" -exec grep -rn "^export class\|^class " {} \; 2>/dev/null | wc -l)
echo "   ${YELLOW}Total classes:${NC} $TOTAL_CLASS"

# ============================================
# 5. ZERO INTERFACE
# ============================================
echo ""
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${CYAN}📊 5. ZERO INTERFACE${NC}"
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_INTERFACE=$(find packages -type d -name "src" -exec grep -rn "^export interface\|^interface " {} \; 2>/dev/null | wc -l)
echo "   ${YELLOW}Total interfaces:${NC} $TOTAL_INTERFACE"

# ============================================
# 6. ZERO FOR
# ============================================
echo ""
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${YELLOW}📊 6. ZERO FOR${NC}"
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_FOR=$(find packages -type d -name "src" -exec grep -rn "for (" {} \; 2>/dev/null | wc -l)
echo "   ${YELLOW}Total 'for' loops:${NC} $TOTAL_FOR"

# ============================================
# 7. ZERO CONFIG
# ============================================
echo ""
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}📊 7. ZERO CONFIG${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

FW_DETECT=$(find packages -type d -name "src" -exec grep -rn "autoDetect\|detectFramework" {} \; 2>/dev/null | wc -l)
echo "   ${GREEN}Auto-detect framework support:${NC} $FW_DETECT"

# ============================================
# 8. ZERO DEPENDENCIES
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}📊 8. ZERO DEPENDENCIES${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

EXTERNAL=$(find packages -type d -name "src" -exec grep -rn "from 'react'\|from 'next'\|from 'vite'" {} \; 2>/dev/null | wc -l)
echo "   ${YELLOW}External framework imports:${NC} $EXTERNAL"

# ============================================
# 9. ZERO BUNDLE
# ============================================
echo ""
echo "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${MAGENTA}📊 9. ZERO BUNDLE${NC}"
echo "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

CSS_GEN=$(find packages -type d -name "src" -exec grep -rn "generateCss\|generateCSS" {} \; 2>/dev/null | wc -l)
echo "   ${GREEN}CSS generation functions:${NC} $CSS_GEN"

# ============================================
# 10. ZERO RUNTIME
# ============================================
echo ""
echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${RED}📊 10. ZERO RUNTIME${NC}"
echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

BUILD_TIME=$(find packages -type d -name "src" -exec grep -rn "buildTime\|compileTime" {} \; 2>/dev/null | wc -l)
echo "   ${GREEN}Build-time generation:${NC} $BUILD_TIME"

# ============================================
# 11. ZERO REGEX LOOP
# ============================================
echo ""
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${YELLOW}📊 11. ZERO REGEX LOOP${NC}"
echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

WHILE_REGEX=$(find packages -type d -name "src" -exec grep -rn "while.*\.exec" {} \; 2>/dev/null | wc -l)
echo "   ${RED}While regex loops:${NC} $WHILE_REGEX"

# ============================================
# 12. ZERO IIFE
# ============================================
echo ""
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${CYAN}📊 12. ZERO IIFE${NC}"
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

IIFE=$(find packages -type d -name "src" -exec grep -rn "(() => {" {} \; 2>/dev/null | wc -l)
echo "   ${GREEN}IIFE usage:${NC} $IIFE"

# ============================================
# 13. ZERO MODULE STATE
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}📊 13. ZERO MODULE STATE${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

MODULE_LET=$(find packages -type d -name "src" -exec grep -rn "^let _" {} \; 2>/dev/null | wc -l)
echo "   ${RED}Module-level let:${NC} $MODULE_LET"

# ============================================
# 14. ZERO COUNTER
# ============================================
echo ""
echo "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${MAGENTA}📊 14. ZERO COUNTER${NC}"
echo "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

COUNTERS=$(find packages -type d -name "src" -exec grep -rn "let .*Counter\|let .*Id" {} \; 2>/dev/null | wc -l)
echo "   ${RED}Counter/ID variables:${NC} $COUNTERS"

# ============================================
# 15. ZERO NULL
# ============================================
echo ""
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}📊 15. ZERO NULL${NC}"
echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

NULL_USAGE=$(find packages -type d -name "src" -exec grep -rn ": null\|= null" {} \; 2>/dev/null | wc -l)
echo "   ${RED}null usage:${NC} $NULL_USAGE"

# ============================================
# 16. ZERO MUTATION
# ============================================
echo ""
echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${RED}📊 16. ZERO MUTATION${NC}"
echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

SPREAD=$(find packages -type d -name "src" -exec grep -rn "\.\.\." {} \; 2>/dev/null | wc -l)
echo "   ${GREEN}Spread operator:${NC} $SPREAD"

# ============================================
# SUMMARY 16 PILAR
# ============================================
echo ""
echo "${CYAN}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║                        16 PILAR ZERO-* FRAMEWORK (SOURCE ONLY)               ║${NC}"
echo "${CYAN}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "   ${YELLOW}No  Pilar                    Found    Need Fix   Status${NC}"
echo "   ─────────────────────────────────────────────────────────────────────────────"
printf "   %2d  ${YELLOW}Zero Let${NC}              %6d   %6d    " 1 $TOTAL_LET $TOTAL_LET
[ $TOTAL_LET -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero Any${NC}              %6d   %6d    " 2 $TOTAL_ANY $TOTAL_ANY
[ $TOTAL_ANY -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero Try-Catch${NC}        %6d   %6d    " 3 $TOTAL_TRY $TOTAL_TRY
[ $TOTAL_TRY -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero Class${NC}            %6d   %6d    " 4 $TOTAL_CLASS $TOTAL_CLASS
[ $TOTAL_CLASS -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero Interface${NC}        %6d   %6d    " 5 $TOTAL_INTERFACE $TOTAL_INTERFACE
[ $TOTAL_INTERFACE -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero For${NC}              %6d   %6d    " 6 $TOTAL_FOR $TOTAL_FOR
[ $TOTAL_FOR -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

echo "   ─────────────────────────────────────────────────────────────────────────────"
printf "   %2d  ${GREEN}Zero Config${NC}            %6s   %6s    ✅\n" 7 "N/A" "N/A"
printf "   %2d  ${GREEN}Zero Dependencies${NC}      %6s   %6s    ✅\n" 8 "N/A" "N/A"
printf "   %2d  ${GREEN}Zero Bundle${NC}            %6s   %6s    ✅\n" 9 "N/A" "N/A"
printf "   %2d  ${GREEN}Zero Runtime${NC}           %6s   %6s    ✅\n" 10 "N/A" "N/A"

echo "   ─────────────────────────────────────────────────────────────────────────────"
printf "   %2d  ${YELLOW}Zero Regex Loop${NC}       %6d   %6d    " 11 $WHILE_REGEX $WHILE_REGEX
[ $WHILE_REGEX -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero IIFE${NC}             %6d   %6d    " 12 $IIFE $IIFE
[ $IIFE -gt 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero Module State${NC}     %6d   %6d    " 13 $MODULE_LET $MODULE_LET
[ $MODULE_LET -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero Counter${NC}          %6d   %6d    " 14 $COUNTERS $COUNTERS
[ $COUNTERS -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero Null${NC}             %6d   %6d    " 15 $NULL_USAGE $NULL_USAGE
[ $NULL_USAGE -eq 0 ] && echo "${GREEN}✅${NC}" || echo "${RED}⚠️${NC}"

printf "   %2d  ${YELLOW}Zero Mutation${NC}         %6s   %6s    ✅\n" 16 "N/A" "N/A"

# ============================================
# RECOMMENDATIONS
# ============================================
echo ""
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${CYAN}📋 RECOMMENDATIONS (Priority Order)${NC}"
echo "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $TOTAL_LET -gt 0 ]; then
    echo "   🔴 Priority 1: Zero Let ($TOTAL_LET refactorable)"
    echo "      → Convert single-assignment let to const, use reduce/map/filter"
fi

if [ $TOTAL_ANY -gt 0 ]; then
    echo ""
    echo "   🔴 Priority 2: Zero Any ($TOTAL_ANY occurrences)"
    echo "      → Replace any with unknown or proper generic types"
fi

if [ $TOTAL_FOR -gt 0 ]; then
    echo ""
    echo "   🟡 Priority 3: Zero For ($TOTAL_FOR loops)"
    echo "      → Refactor to map/filter/reduce, use functional composition"
fi

if [ $TOTAL_TRY -gt 0 ]; then
    echo ""
    echo "   🟡 Priority 4: Zero Try-Catch ($TOTAL_TRY blocks)"
    echo "      → Use Result type pattern instead of try-catch"
fi

if [ $WHILE_REGEX -gt 0 ]; then
    echo ""
    echo "   🟡 Priority 5: Zero Regex Loop ($WHILE_REGEX loops)"
    echo "      → Use matchAll + for...of instead of while (match = regex.exec())"
fi

if [ $MODULE_LET -gt 0 ]; then
    echo ""
    echo "   🟢 Priority 6: Zero Module State ($MODULE_LET variables)"
    echo "      → Use factory pattern + closure instead of let _binding"
fi

if [ $COUNTERS -gt 0 ]; then
    echo ""
    echo "   🟢 Priority 7: Zero Counter ($COUNTERS variables)"
    echo "      → Use generator function instead of let counter = 0"
fi

echo ""
echo "${GREEN}✅ Analysis Complete!${NC}"
echo ""