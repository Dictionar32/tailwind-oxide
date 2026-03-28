#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)

function run(command, cmdArgs) {
  const result = spawnSync(command, cmdArgs, { stdio: "inherit" })
  process.exit(result.status ?? 1)
}

if (process.platform === "win32") {
  run("powershell", [
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(__dirname, "build-bindings.ps1"),
    ...args,
  ])
} else {
  run("bash", [path.join(__dirname, "build-bindings.sh"), ...args])
}
