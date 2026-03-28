#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Navigate to demo project
cd examples/demo-subcomponents

clear

echo ""
echo "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║     Tailwind Styled v4 — Explainable Styling System         ║${NC}"
echo "${CYAN}║     \"You don't debug styles anymore. You inspect them.\"      ║${NC}"
echo "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

sleep 2

echo "${GREEN}📦 Step 1: Install package${NC}"
echo "   npm install tailwind-styled-v4"
echo ""
echo "${YELLOW}(Assuming package is already installed in this demo project)${NC}"
echo ""
sleep 2

echo "${GREEN}🔍 Step 2: Trace a class — understand why it behaves the way it does${NC}"
echo "   npx tw trace bg-blue-500"
echo ""
sleep 1

node ../../dist/cli.js trace bg-blue-500
echo ""
sleep 3

echo "${GREEN}🔍 Step 3: Trace another class with variants${NC}"
echo "   npx tw trace px-4"
echo ""
sleep 1

node ../../dist/cli.js trace px-4
echo ""
sleep 3

echo "${GREEN}🏥 Step 4: Doctor command — diagnose issues in your codebase${NC}"
echo "   npx tw doctor"
echo ""
sleep 1

node ../../dist/cli.js doctor
echo ""
sleep 3

echo "${GREEN}⚙️  Step 5: Setup — auto-configure for your framework${NC}"
echo "   npx tw setup --yes"
echo ""
sleep 1

node ../../dist/cli.js setup --yes
echo ""
sleep 3

echo "${GREEN}❓ Step 6: Help — see all available commands${NC}"
echo "   npx tw --help"
echo ""
sleep 1

node ../../dist/cli.js --help | head -40
echo ""
sleep 3

echo ""
echo "${CYAN}✨ You don't debug styles anymore. You inspect them.${NC}"
echo ""
echo "${YELLOW}🚀 Try it now:${NC}"
echo "   npm install tailwind-styled-v4"
echo "   npx tw trace your-class-name"
echo "   npx tw doctor"
echo ""
