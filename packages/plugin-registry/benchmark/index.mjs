#!/usr/bin/env node
/**
 * Plugin Registry Benchmark — SLO gate
 * p95 target: search < 500ms, list < 500ms (per docs/ops)
 * Error rate target: < 1% in 100 runs
 */
import { spawnSync } from "node:child_process"
import { performance } from "node:perf_hooks"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI = path.join(__dirname, "../dist/cli.js")
const RUNS = Number(process.env.BENCH_RUNS ?? 100)
const P95_TARGET_MS = Number(process.env.BENCH_P95_MS ?? 500)

function bench(label, args) {
  const times = []
  let errors = 0
  for (let i = 0; i < RUNS; i++) {
    const t = performance.now()
    const r = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", timeout: 5000 })
    times.push(performance.now() - t)
    if (r.status !== 0) errors++
  }
  times.sort((a, b) => a - b)
  const p50 = times[Math.floor(RUNS * 0.50)]
  const p95 = times[Math.floor(RUNS * 0.95)]
  const avg = times.reduce((a, b) => a + b, 0) / RUNS
  const errorRate = errors / RUNS
  const sloPass = p95 < P95_TARGET_MS && errorRate < 0.01
  return { label, runs: RUNS, avgMs: Math.round(avg), p50Ms: Math.round(p50), p95Ms: Math.round(p95), errorRate: errorRate.toFixed(3), sloPass }
}

console.log(`Running ${RUNS} iterations per command...\n`)
const results = [
  bench("search animation", ["search", "animation"]),
  bench("list",             ["list"]),
  bench("info official",   ["info", "@tailwind-styled/plugin-animation"]),
  bench("install dry-run", ["install", "@tailwind-styled/plugin-animation", "--dry-run"]),
]

const allPass = results.every(r => r.sloPass)
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), sloTarget: { p95Ms: P95_TARGET_MS, errorRate: "< 1%" }, results, allSloPass: allPass }, null, 2))
if (!allPass) { console.error("\n❌ SLO not met"); process.exit(1) }
console.log("\n✅ All SLO targets met")
