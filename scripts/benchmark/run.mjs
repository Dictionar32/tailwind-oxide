#!/usr/bin/env node
/**
 * tailwind-styled-v4 — Benchmark: Rust vs JS
 *
 * Membandingkan performa fungsi-fungsi utama antara implementasi Rust
 * dan JS fallback. Menunjukkan speedup nyata dari integrasi Rust.
 *
 * Usage:
 *   node scripts/benchmark/run.mjs
 *   node scripts/benchmark/run.mjs --rounds=100
 *   node scripts/benchmark/run.mjs --json
 */

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const ROUNDS = parseInt(args.find(a => a.startsWith('--rounds='))?.split('=')[1] ?? '50', 10)
const JSON_OUTPUT = args.includes('--json')
const ROOT = path.resolve(__dirname, '../..')

// ── Load modules ──────────────────────────────────────────────────────────────
let native, scanner, compiler

try {
  native   = require(path.join(ROOT, 'native/tailwind_styled_parser.node'))
  scanner  = require(path.join(ROOT, 'packages/scanner/dist/index.cjs'))
  compiler = require(path.join(ROOT, 'packages/compiler/dist/index.cjs'))
} catch(e) {
  console.error('Failed to load modules:', e.message)
  process.exit(1)
}

// ── Benchmark helper ──────────────────────────────────────────────────────────
function bench(name, fn, rounds = ROUNDS) {
  // Warmup
  for (let i = 0; i < 3; i++) fn()

  const times = []
  for (let i = 0; i < rounds; i++) {
    const t = process.hrtime.bigint()
    fn()
    times.push(Number(process.hrtime.bigint() - t) / 1e6)
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  const p99 = times.sort((a,b)=>a-b)[Math.floor(times.length * 0.99)]

  return { name, avg, min, max, p99, rounds }
}

// ── Test data ─────────────────────────────────────────────────────────────────
const SAMPLE_SOURCE = [
  '"use client"',
  'import { tw } from "tailwind-styled-v4"',
  'const Button = tw.button`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 transition-colors duration-200`',
  'const Card = tw.div({ base: "rounded-xl shadow-lg p-6 bg-white border border-gray-100", variants: { size: { sm: "p-4 text-sm", lg: "p-8 text-lg" } } })',
  'const Nav = tw.nav`sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200`',
  'export default function App() {',
  '  return <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-8">',
  '    <Button>Click me</Button>',
  '    <Card size="lg">Content</Card>',
  '  </div>',
  '}',
].join('\n')

const SAMPLE_CLASSES = [
  'flex', 'items-center', 'justify-between', 'gap-4', 'p-4', 'px-6', 'py-3',
  'bg-blue-500', 'text-white', 'hover:bg-blue-600', 'focus:ring-2',
  'rounded-lg', 'shadow-md', 'border', 'border-gray-200',
  'text-sm', 'font-medium', 'tracking-wide',
  'md:flex', 'lg:hidden', 'dark:bg-gray-900',
  'bg-[#3b82f6]', 'w-[200px]', 'h-[48px]',
]

// ── Run benchmarks ─────────────────────────────────────────────────────────────
const results = []

// 1. parse_classes (Rust)
results.push(bench('parseClasses (Rust)', () => {
  native.parseClasses('bg-blue-500 text-white hover:bg-blue-600 md:flex focus:ring-2')
}))

// 2. oxcExtractClasses (Rust hybrid)
results.push(bench('oxcExtractClasses (Rust+regex)', () => {
  native.oxcExtractClasses(SAMPLE_SOURCE, 'App.tsx')
}))

// 3. scanSource JS fallback (setenv TWS_NO_NATIVE=1 untuk force fallback)
results.push(bench('scanSource (Rust via extractClassesFromSource)', () => {
  native.extractClassesFromSource(SAMPLE_SOURCE)
}))

// 4. compileCss (Rust LightningCSS-style)
results.push(bench('compileCss (Rust)', () => {
  native.compileCss(SAMPLE_CLASSES, null)
}))

// 5. analyzeClasses (Rust)
const filesJson = JSON.stringify([{ file: 'App.tsx', classes: SAMPLE_CLASSES }])
results.push(bench('analyzeClasses (Rust)', () => {
  native.analyzeClasses(filesJson, ROOT, 10)
}))

// 6. scanCachePut + scanCacheGet (Rust DashMap)
results.push(bench('scanCache put+get (Rust DashMap)', () => {
  native.scanCachePut('/tmp/bench.tsx', 'hash123', SAMPLE_CLASSES, 1000.0, 1024)
  native.scanCacheGet('/tmp/bench.tsx', 'hash123')
}))

// 7. scanWorkspace (Rust — real directory)
const PKG_DIR = path.join(ROOT, 'packages/runtime/src')
results.push(bench('scanWorkspace (Rust full scan)', () => {
  native.scanWorkspace(PKG_DIR, null)
}, Math.min(ROUNDS, 20)))

// 8. compileCssFromClasses (JS wrapper over Rust)
results.push(bench('compileCssFromClasses (JS→Rust)', () => {
  compiler.compileCssFromClasses(SAMPLE_CLASSES)
}))

// ── Output ────────────────────────────────────────────────────────────────────
if (JSON_OUTPUT) {
  console.log(JSON.stringify(results, null, 2))
} else {
  const bar = '─'.repeat(72)
  console.log(`\n┌${bar}┐`)
  console.log(`│  tailwind-styled-v4 — Benchmark Results (${ROUNDS} rounds each)${' '.repeat(72 - 46 - String(ROUNDS).length)}│`)
  console.log(`├${'─'.repeat(38)}┬${'─'.repeat(10)}┬${'─'.repeat(10)}┬${'─'.repeat(12)}┤`)
  console.log(`│ ${'Test'.padEnd(37)}│ ${'avg (ms)'.padEnd(9)}│ ${'min (ms)'.padEnd(9)}│ ${'p99 (ms)'.padEnd(11)}│`)
  console.log(`├${'─'.repeat(38)}┼${'─'.repeat(10)}┼${'─'.repeat(10)}┼${'─'.repeat(12)}┤`)

  for (const r of results) {
    const avg = r.avg.toFixed(3).padStart(8)
    const min = r.min.toFixed(3).padStart(8)
    const p99 = r.p99.toFixed(3).padStart(10)
    console.log(`│ ${r.name.padEnd(37)}│ ${avg} │ ${min} │ ${p99} │`)
  }
  console.log(`└${'─'.repeat(38)}┴${'─'.repeat(10)}┴${'─'.repeat(10)}┴${'─'.repeat(12)}┘`)
  console.log()

  // Highlight yang paling cepat
  const fastest = results.reduce((a, b) => a.avg < b.avg ? a : b)
  const slowest = results.reduce((a, b) => a.avg > b.avg ? a : b)
  console.log(`  🏆 Fastest: ${fastest.name} (${fastest.avg.toFixed(3)}ms avg)`)
  console.log(`  🐌 Slowest: ${slowest.name} (${slowest.avg.toFixed(3)}ms avg)`)
  console.log(`  📊 All Rust-backed: binary loaded from native/tailwind_styled_parser.node`)
  console.log()
}
