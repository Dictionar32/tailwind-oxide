#!/usr/bin/env node
/**
 * Smoke tests covering CLI and platform scripts.
 */
import { execSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const cli = `node ${path.join("packages", "cli", "dist", "index.js")}`
const results = []

const DEFAULT_TIMEOUT_MS = 15_000
const BENCHMARK_TIMEOUT_MS = 60_000

function check(label, cmd, opts = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, ...rest } = opts
  process.stdout.write(`  ${label}... `)
  try {
    execSync(cmd, { stdio: "pipe", timeout, ...rest })
    console.log("OK")
    results.push({ label, ok: true })
  } catch (error) {
    console.log("FAIL")
    if (process.env.SMOKE_VERBOSE) {
      console.error(`    ${(error.stderr?.toString() ?? error.message).slice(0, 200)}`)
    }
    results.push({ label, ok: false })
  }
}

function checkScript(label, script, args = [], opts = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, ...rest } = opts
  process.stdout.write(`  ${label}... `)
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    timeout,
    ...rest,
  })
  if (result.status === 0) {
    console.log("OK")
    results.push({ label, ok: true })
    return
  }

  console.log("FAIL")
  if (process.env.SMOKE_VERBOSE) {
    console.error(`    ${(result.stderr ?? "").slice(0, 200)}`)
  }
  results.push({ label, ok: false })
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-smoke-"))
const tmpSrc = path.join(tmpDir, "App.tsx")
const tmpCss = path.join(tmpDir, "out.css")

fs.writeFileSync(tmpSrc, "export const A = () => <div className=\"px-4 py-2 bg-blue-500\" />")
fs.writeFileSync(tmpCss, ".px-4{padding:1rem}\n.py-2{padding:.5rem}\n.unused{color:red}\n")

console.log("\nCore CLI")
check("parse", `${cli} parse packages/scanner/src/index.ts`)
check("transform", `${cli} transform packages/cli/src/index.ts artifacts/transform-output.js`)
check("minify", `${cli} minify packages/cli/src/index.ts`)
check("lint", `${cli} lint packages/cli/src 2`)
check("format", `${cli} format packages/cli/src/index.ts`)
check("stats", `${cli} stats packages/cli/src`)

console.log("\nOxide pipeline")
checkScript("v4.6 parse", "scripts/v46/parse.mjs", [tmpSrc])
checkScript("v4.7 shake", "scripts/v47/shake-css.mjs", [tmpCss, "--classes-from", tmpDir])
checkScript("v4.9 optimize", "scripts/v49/optimize.mjs", [tmpSrc, "--dedup"])
checkScript("v4.8 benchmark", "scripts/v48/benchmark-toolchains.mjs", [], {
  timeout: BENCHMARK_TIMEOUT_MS,
})
checkScript("v4.9 split", "scripts/v49/split-routes.mjs", [tmpDir])
checkScript("lsp stub mode", "scripts/v48/lsp.mjs", [])
checkScript("studio help", "scripts/v45/studio.mjs", ["--help"])

console.log("\nPlugin registry")
check("plugin list", "node packages/plugin-registry/dist/cli.js list")
check("plugin search", "node packages/plugin-registry/dist/cli.js search animation")
check(
  "plugin dry-run",
  "node packages/plugin-registry/dist/cli.js install @tailwind-styled/plugin-animation --dry-run"
)

const tmpHtml = path.join(tmpDir, "smoke.html")
const tmpCssFile = path.join(tmpDir, "smoke.css")
fs.writeFileSync(tmpHtml, '<div class="px-4">test</div>')
fs.writeFileSync(tmpCssFile, ".px-4{padding:1rem}.unused{color:red}")
checkScript("critical-css", "scripts/v49/critical-css.mjs", [tmpHtml, tmpCssFile])
checkScript("adopt route-css dry-run", "scripts/v50/adopt.mjs", ["route-css", ".", "--dry-run"])

console.log("\nStudio and Sync")
checkScript("sync init", "scripts/v45/sync.mjs", ["init"])
checkScript("sync push css", "scripts/v45/sync.mjs", ["push", "--to=css"])
checkScript("preflight --json", "--experimental-strip-types", ["packages/cli/src/preflight.ts", "--json", "--allow-fail"])
checkScript("deploy dry-run", "packages/cli/dist/index.js", ["deploy", "--dry-run"])
checkScript("ai button", "scripts/v45/ai.mjs", ["primary button"])
checkScript("ai card", "scripts/v45/ai.mjs", ["card component"])

console.log("\nCluster and Cache")
checkScript("cluster init", "scripts/v50/cluster.mjs", ["init", "2"])
checkScript("cluster status", "scripts/v50/cluster.mjs", ["status"])
checkScript("cache enable", "scripts/v50/cache.mjs", ["enable", "local"])
checkScript("cache status", "scripts/v50/cache.mjs", ["status"])

fs.rmSync(tmpDir, { recursive: true, force: true })

const passed = results.filter((item) => item.ok).length
const failed = results.filter((item) => !item.ok).length

console.log(`\n${"-".repeat(50)}`)
console.log(`Smoke: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error(`Failed: ${results.filter((item) => !item.ok).map((item) => item.label).join(", ")}`)
  process.exit(1)
}

console.log("All smoke tests passed")
