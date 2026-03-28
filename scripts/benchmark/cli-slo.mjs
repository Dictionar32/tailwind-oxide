#!/usr/bin/env node
/**
 * CLI SLO benchmark — Track B gate
 * Target: p95 < 500ms untuk semua command CLI utama
 * Error rate: < 1% dalam 100 eksekusi
 */
import { spawnSync } from "node:child_process"
import { performance } from "node:perf_hooks"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../..")
const RUNS = Number(process.env.BENCH_RUNS ?? 100)
const P95_TARGET = Number(process.env.BENCH_P95_MS ?? 500)
const CLI = path.join(ROOT, "packages/cli/dist/index.js")

function bench(label, args) {
  const times = []
  let errors = 0
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now()
    const r = spawnSync(process.execPath, [CLI, ...args], {
      encoding: "utf8", timeout: 10_000, cwd: ROOT,
    })
    times.push(performance.now() - t)
    if (r.status !== 0) errors++
  }
  times.sort((a, b) => a - b)
  const p50 = times[Math.floor(RUNS * 0.5)]
  const p95 = times[Math.floor(RUNS * 0.95)]
  const avg = times.reduce((a, b) => a + b, 0) / RUNS
  const errorRate = errors / RUNS
  const sloPass = p95 < P95_TARGET && errorRate < 0.01
  return { label, runs: RUNS, avgMs: Math.round(avg), p50Ms: Math.round(p50), p95Ms: Math.round(p95), errorRate: errorRate.toFixed(3), sloPass, sloTarget: P95_TARGET }
}

// Only run if CLI is built
import fs from "node:fs"
if (!fs.existsSync(CLI)) {
  console.error(`CLI not built: ${CLI}`)
  console.error("Run: npm run build -w packages/cli")
  process.exit(0) // non-fatal — skip in CI before build
}

console.log(`CLI SLO Benchmark — ${RUNS} runs/command, target p95 < ${P95_TARGET}ms\n`)

const results = [
  bench("tw plugin list",    ["plugin", "list"]),
  bench("tw plugin search",  ["plugin", "search", "animation"]),
  bench("tw audit --json",   ["audit", "--json"]),
  bench("tw preflight --json", ["preflight", "--json"]),
  bench("tw sync init",      ["sync", "init"]),
]

const allPass = results.every(r => r.sloPass)
const output = {
  generatedAt: new Date().toISOString(),
  sloTarget: { p95Ms: P95_TARGET, errorRate: "< 1%" },
  results,
  allSloPass: allPass,
}

console.table(results.map(r => ({
  command: r.label,
  "avg ms": r.avgMs,
  "p50 ms": r.p50Ms,
  "p95 ms": r.p95Ms,
  "err rate": r.errorRate,
  SLO: r.sloPass ? "✅" : "❌",
})))

if (!allPass) {
  const failed = results.filter(r => !r.sloPass).map(r => r.label)
  console.error(`\n❌ SLO not met: ${failed.join(", ")}`)
  process.exitCode = 1
} else {
  console.log("\n✅ All CLI SLO targets met")
}
