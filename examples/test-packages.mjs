#!/usr/bin/env node
/**
 * Package test runner that uses examples/ as real-world integration tests.
 *
 * `npm run verify:builds` is the full two-stage gate:
 *   1. `npm run build` at the repository root
 *   2. this script to verify example integrations
 *
 * This script keeps the second stage focused on real consumption:
 *   - integration smoke checks
 *   - install + `npm run build` for each framework example
 *
 * Usage: node examples/test-packages.mjs [--verbose]
 */

import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

const VERBOSE = process.argv.includes("--verbose")
const ROOT = join(import.meta.dirname, "..")
const EXAMPLES = import.meta.dirname

const results = []

function run(label, cmd, cwd) {
  process.stdout.write(`  ${label}... `)
  try {
    execSync(cmd, {
      cwd,
      stdio: VERBOSE ? "inherit" : "pipe",
      timeout: 180_000,
      env: { ...process.env, NODE_ENV: "test" },
    })
    console.log("OK")
    results.push({ label, ok: true })
  } catch (error) {
    console.log("FAIL")
    if (!VERBOSE) {
      const msg = (error.stderr?.toString() ?? error.message).slice(0, 400)
      console.error(`    ${msg}`)
    }
    results.push({ label, ok: false })
  }
}

function runScript(label, script, cwd) {
  run(label, `node ${script}`, cwd)
}

function latestResultOk() {
  return results.at(-1)?.ok ?? false
}

function runExampleBuild(example) {
  const exampleDir = join(ROOT, example.dir)
  if (!existsSync(exampleDir)) {
    console.log(`\n  [SKIP] ${example.name} - ${example.dir} not found`)
    return
  }

  run(`${example.name}: install`, "npm install --ignore-scripts", exampleDir)
  if (!latestResultOk()) {
    console.log(`    skipping build because install failed for ${example.name}`)
    return
  }

  run(`${example.name}: build`, "npm run build", exampleDir)
}

console.log("\n" + "=".repeat(60))
console.log("  tailwind-styled-v4 - Package Test Runner (examples)")
console.log("=".repeat(60))

console.log("\n-- Phase 1: Integration Tests --------------------------")

const integrationDir = join(EXAMPLES, "integration-test")

if (existsSync(integrationDir)) {
  runScript("import verification", "test-imports.mjs", integrationDir)
  runScript("adapter API surface", "adapter-check.mjs", integrationDir)
  runScript("pipeline e2e", "pipeline-check.mjs", integrationDir)
} else {
  console.log("  [SKIP] integration-test directory not found")
}

console.log("\n-- Phase 2: Example App Builds -------------------------")

const exampleApps = [
  { name: "vite-react", dir: "examples/vite-react" },
  { name: "vite", dir: "examples/vite" },
  { name: "rspack", dir: "examples/rspack" },
  { name: "next-js-app", dir: "examples/next-js-app" },
  { name: "demo-subcomponents", dir: "examples/demo-subcomponents" },
]

for (const example of exampleApps) {
  runExampleBuild(example)
}

const passed = results.filter((result) => result.ok).length
const failed = results.filter((result) => !result.ok).length
const total = results.length

console.log("\n" + "=".repeat(60))
console.log(`  Results: ${passed}/${total} passed, ${failed} failed`)
console.log("=".repeat(60))

if (failed > 0) {
  console.error("\nFailed tests:")
  for (const result of results.filter((entry) => !entry.ok)) {
    console.error(`  x ${result.label}`)
  }
  process.exit(1)
}

console.log("\nAll package tests passed")
