#!/usr/bin/env node
import { execSync } from "node:child_process"

process.env.TWS_DISABLE_NATIVE = "1"
execSync("node scripts/smoke/index.mjs", {
  stdio: "inherit",
  env: process.env,
})
