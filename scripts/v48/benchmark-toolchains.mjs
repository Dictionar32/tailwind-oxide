#!/usr/bin/env node
/**
 * tw benchmark — Real toolchain comparison benchmark (v4.8)
 * Mengukur: parse, transform, lint, format — dengan dan tanpa Oxc
 * Output: docs/benchmark/toolchain-comparison.json
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { spawnSync } from 'node:child_process'

const RUNS = Number(process.env.BENCH_RUNS ?? 20)
const OUT  = process.env.BENCH_OUT ?? 'docs/benchmark/toolchain-comparison.json'

// Find a real TS file to benchmark against
const SAMPLE_FILES = [
  'packages/scanner/src/index.ts',
  'packages/core/src/createComponent.ts',
  'packages/compiler/src/astParser.ts',
  'packages/cli/src/index.ts',
]
const sampleFile = SAMPLE_FILES.find(f => fs.existsSync(f)) ?? SAMPLE_FILES[0]

function benchScript(label, script, args = [], runs = RUNS) {
  const times = []
  let errors = 0
  for (let i = 0; i < runs; i++) {
    const t = performance.now()
    const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10_000 })
    times.push(performance.now() - t)
    if (r.status !== 0) errors++
  }
  times.sort((a, b) => a - b)
  return {
    label, runs,
    avgMs:  Math.round(times.reduce((a,b) => a+b, 0) / runs),
    p50Ms:  Math.round(times[Math.floor(runs * 0.5)]),
    p95Ms:  Math.round(times[Math.floor(runs * 0.95)]),
    minMs:  Math.round(times[0]),
    maxMs:  Math.round(times[times.length - 1]),
    errorRate: (errors / runs).toFixed(3),
  }
}

// Detect oxc availability
let oxcAvailable = false
try { await import('oxc-parser'); oxcAvailable = true } catch {}
let oxcTransformAvailable = false
try { await import('oxc-transform'); oxcTransformAvailable = true } catch {}

console.log(`[tw benchmark] Running ${RUNS} iterations per command`)
console.log(`[tw benchmark] Sample file: ${sampleFile}`)
console.log(`[tw benchmark] oxc-parser: ${oxcAvailable ? '✅' : '❌ (fallback)'}`)
console.log(`[tw benchmark] oxc-transform: ${oxcTransformAvailable ? '✅' : '❌ (fallback)'}`)
console.log('')

const results = []
if (fs.existsSync(sampleFile)) {
  results.push(benchScript('tw parse',       'scripts/v46/parse.mjs',     [sampleFile]))
  results.push(benchScript('tw transform',   'scripts/v46/transform.mjs', [sampleFile]))
  results.push(benchScript('tw minify',      'scripts/v47/minify.mjs',    [sampleFile]))
  results.push(benchScript('tw format',      'scripts/v48/format.mjs',    [sampleFile]))
  results.push(benchScript('tw lint (1w)',   'scripts/v48/lint-parallel.mjs', ['packages/core/src', '1']))
} else {
  console.warn(`[tw benchmark] Sample file not found: ${sampleFile}`)
}

const mem = process.memoryUsage()
const output = {
  generatedAt: new Date().toISOString(),
  system: { platform: os.platform(), cpus: os.cpus().length, nodeVersion: process.version },
  sampleFile, runs: RUNS,
  oxc: { parser: oxcAvailable, transform: oxcTransformAvailable },
  results,
  memoryMb: { rss: Math.round(mem.rss/1024/1024), heapUsed: Math.round(mem.heapUsed/1024/1024) },
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n')
console.log(`\n✅ Benchmark written to ${OUT}`)
results.forEach(r => console.log(`   ${r.label.padEnd(20)} avg=${r.avgMs}ms  p95=${r.p95Ms}ms`))
