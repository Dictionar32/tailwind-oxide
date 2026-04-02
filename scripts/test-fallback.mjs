#!/usr/bin/env node
import { execSync } from "node:child_process"

process.env.TWS_NO_NATIVE = "1"
execSync("node scripts/smoke/index.mjs", {
  stdio: "inherit",
  env: process.env,
})
