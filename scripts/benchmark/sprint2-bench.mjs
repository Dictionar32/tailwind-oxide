#!/usr/bin/env node
/**
 * Sprint 2 — Benchmark Suite
 * Mengukur performa: parse (v4.6), shake (v4.7), cluster (v5.0)
 * 
 * Output: docs/benchmark/sprint2-results.json
 * 
 * Usage:
 *   node scripts/benchmark/sprint2-bench.mjs
 *   node scripts/benchmark/sprint2-bench.mjs --files=500 --out=custom.json
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { spawnSync } from "node:child_process"

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=")
    return [k, v ?? "true"]
  })
)

const FILE_COUNT  = Number(args.get("files") ?? 100)
const OUT_FILE    = args.get("out") ?? "docs/benchmark/sprint2-results.json"
const VERBOSE     = args.get("verbose") === "true"

const PARSE_SCRIPT   = new URL("../../scripts/v46/parse.mjs", import.meta.url).pathname
const SHAKE_SCRIPT   = new URL("../../scripts/v47/shake-css.mjs", import.meta.url).pathname
const CLUSTER_SCRIPT = new URL("../../scripts/v50/cluster.mjs", import.meta.url).pathname

// ─── Fixture generator ────────────────────────────────────────────────────────

const SAMPLE_CLASSES = [
  "px-4 py-2 bg-blue-500 text-white rounded",
  "flex items-center gap-2 hover:opacity-75",
  "text-xl font-bold text-gray-900 dark:text-white",
  "border border-gray-200 rounded-lg shadow-sm",
  "w-full h-10 focus:outline-none focus:ring-2 focus:ring-blue-500",
  "grid grid-cols-2 md:grid-cols-4 gap-4",
  "absolute inset-0 bg-black/50 backdrop-blur-sm",
  "transition-all duration-200 ease-in-out",
]

function generateFixture(dir, count) {
  fs.mkdirSync(dir, { recursive: true })
  const files = []
  for (let i = 0; i < count; i++) {
    const classes = SAMPLE_CLASSES[i % SAMPLE_CLASSES.length]
    const file = path.join(dir, `Comp${i}.tsx`)
    fs.writeFileSync(file, `
export function Component${i}({ active }: { active?: boolean }) {
  return (
    <div className="${classes}">
      <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded">
        Button ${i}
      </button>
      <span className={active ? 'text-green-500 font-semibold' : 'text-gray-400'}>
        Status
      </span>
    </div>
  )
}
`)
    files.push(file)
  }
  return files
}

function generateCssFixture(dir, classCount = 200) {
  const rules = []
  const classes = []
  // Common Tailwind classes
  const props = [
    ['px-4','padding-left:1rem;padding-right:1rem'],
    ['py-2','padding-top:.5rem;padding-bottom:.5rem'],
    ['bg-blue-500','background-color:rgb(59 130 246)'],
    ['text-white','color:rgb(255 255 255)'],
    ['rounded','border-radius:.25rem'],
    ['flex','display:flex'],
    ['items-center','align-items:center'],
    ['gap-2','gap:.5rem'],
    ['font-bold','font-weight:700'],
    ['text-xl','font-size:1.25rem;line-height:1.75rem'],
    ['w-full','width:100%'],
    ['h-10','height:2.5rem'],
    ['border','border-width:1px'],
    ['shadow','box-shadow:0 1px 3px 0 rgb(0 0 0/.1)'],
    ['opacity-75','opacity:.75'],
  ]
  for (let i = 0; i < Math.min(classCount, props.length * 10); i++) {
    const [cls, decl] = props[i % props.length]
    const uniqueCls = i < props.length ? cls : `${cls}-${i}`
    rules.push(`.${uniqueCls.replace(/[:/]/g,'\\$&')}{${decl}}`)
    classes.push(uniqueCls)
  }
  const cssPath = path.join(dir, "output.css")
  fs.writeFileSync(cssPath, rules.join("\n"))
  return { cssPath, classes }
}

// ─── Benchmark runner ─────────────────────────────────────────────────────────

function bench(label, fn, runs = 3) {
  const times = []
  for (let i = 0; i < runs; i++) {
    const t = performance.now()
    fn()
    times.push(performance.now() - t)
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  if (VERBOSE) console.log(`  ${label}: avg=${avg.toFixed(1)}ms min=${min.toFixed(1)}ms max=${max.toFixed(1)}ms`)
  return { label, avgMs: Math.round(avg), minMs: Math.round(min), maxMs: Math.round(max), runs }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-bench-sprint2-"))
const results = { generatedAt: new Date().toISOString(), system: {}, benchmarks: {} }

try {
  results.system = {
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model ?? "unknown",
    platform: os.platform(),
    nodeVersion: process.version,
    fileCount: FILE_COUNT,
  }

  console.log(`\n🔬 Sprint 2 Benchmark Suite`)
  console.log(`   Files: ${FILE_COUNT} | CPUs: ${os.cpus().length} | Node: ${process.version}\n`)

  // ── 1. PARSE benchmark (v4.6) ───────────────────────────────────────────────
  console.log("📊 1. Parse benchmark (v4.6 — oxc/babel/regex)")
  const srcDir = path.join(tmpDir, "src")
  const files = generateFixture(srcDir, FILE_COUNT)

  const parseSingle = bench("parse single file", () => {
    spawnSync(process.execPath, [PARSE_SCRIPT, files[0]], { encoding: "utf8" })
  })

  // Parse all files sequentially (simulate real usage)
  const parseAllStart = performance.now()
  let totalClasses = 0
  for (const f of files) {
    const r = spawnSync(process.execPath, [PARSE_SCRIPT, f], { encoding: "utf8", timeout: 5000 })
    if (r.status === 0) {
      try { totalClasses += JSON.parse(r.stdout).classCount } catch {}
    }
  }
  const parseAllMs = performance.now() - parseAllStart

  results.benchmarks.parse = {
    ...parseSingle,
    allFilesMs: Math.round(parseAllMs),
    filesPerSec: Math.round(FILE_COUNT / (parseAllMs / 1000)),
    totalClassesFound: totalClasses,
  }
  console.log(`   ✓ ${FILE_COUNT} files in ${results.benchmarks.parse.allFilesMs}ms (${results.benchmarks.parse.filesPerSec} files/sec)`)

  // ── 2. SHAKE benchmark (v4.7) ───────────────────────────────────────────────
  console.log("📊 2. Tree-shaking benchmark (v4.7 — real CSS analysis)")
  const { cssPath, classes: cssClasses } = generateCssFixture(tmpDir, 150)

  // Write source that uses ~50% of classes
  const shakeTestSrc = path.join(tmpDir, "shake-src")
  fs.mkdirSync(shakeTestSrc, { recursive: true })
  const usedClasses = cssClasses.slice(0, Math.floor(cssClasses.length / 2))
  fs.writeFileSync(
    path.join(shakeTestSrc, "App.tsx"),
    `<div className="${usedClasses.join(" ")}">test</div>`
  )

  const originalSize = fs.statSync(cssPath).size
  const shakeResult = bench("shake CSS", () => {
    // Use a fresh copy each time to avoid "already shaken" skew
    const copy = cssPath + ".bench"
    fs.copyFileSync(cssPath, copy)
    spawnSync(process.execPath, [SHAKE_SCRIPT, copy, "--classes-from", shakeTestSrc], { encoding: "utf8" })
    fs.unlinkSync(copy)
  })

  // Do one real shake for stats
  const shakeCopy = cssPath + ".final"
  fs.copyFileSync(cssPath, shakeCopy)
  const shakeRun = spawnSync(process.execPath, [SHAKE_SCRIPT, shakeCopy, "--classes-from", shakeTestSrc], { encoding: "utf8" })
  let shakeStats = {}
  try { shakeStats = JSON.parse(shakeRun.stdout) } catch {}

  results.benchmarks.shake = {
    ...shakeResult,
    originalRules: shakeStats.originalRules ?? 0,
    keptRules: shakeStats.keptRules ?? 0,
    removedRules: shakeStats.removedRules ?? 0,
    savedPercent: shakeStats.savedPercent ?? "0%",
    originalBytes: originalSize,
    finalBytes: shakeStats.finalBytes ?? originalSize,
  }
  console.log(`   ✓ ${results.benchmarks.shake.removedRules} rules removed (${results.benchmarks.shake.savedPercent} saved) in ${shakeResult.avgMs}ms`)

  // ── 3. CLUSTER benchmark (v5.0) ─────────────────────────────────────────────
  console.log("📊 3. Cluster build benchmark (v5.0 — worker threads)")
  const clusterInit = spawnSync(process.execPath, [CLUSTER_SCRIPT, "init", String(Math.min(4, os.cpus().length))], {
    encoding: "utf8", cwd: tmpDir
  })

  const clusterBuild = bench("cluster build", () => {
    spawnSync(process.execPath, [CLUSTER_SCRIPT, "build", srcDir], { encoding: "utf8", cwd: tmpDir, timeout: 30_000 })
  }, 2)

  let clusterStats = {}
  const clusterFinal = spawnSync(process.execPath, [CLUSTER_SCRIPT, "build", srcDir], { encoding: "utf8", cwd: tmpDir })
  try { clusterStats = JSON.parse(clusterFinal.stdout) } catch {}

  results.benchmarks.cluster = {
    ...clusterBuild,
    workers: clusterStats.workers ?? 1,
    totalFiles: clusterStats.totalFiles ?? FILE_COUNT,
    totalClasses: clusterStats.totalClasses ?? 0,
    throughput: clusterStats.throughput ?? "n/a",
  }
  console.log(`   ✓ ${clusterStats.totalFiles ?? FILE_COUNT} files across ${clusterStats.workers ?? 1} workers in ${clusterBuild.avgMs}ms (${clusterStats.throughput ?? "n/a"})`)

  // ── 4. Memory snapshot ───────────────────────────────────────────────────────
  const mem = process.memoryUsage()
  results.memoryMb = {
    rss: Math.round(mem.rss / 1024 / 1024),
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n📋 Summary")
  console.log(`   Parse:   ${results.benchmarks.parse.filesPerSec} files/sec`)
  console.log(`   Shake:   ${results.benchmarks.shake.savedPercent} CSS reduction in ${results.benchmarks.shake.avgMs}ms`)
  console.log(`   Cluster: ${results.benchmarks.cluster.throughput} (${results.benchmarks.cluster.workers} workers)`)
  console.log(`   Memory:  ${results.memoryMb.heapUsed}MB heap\n`)

} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

// ─── Write output ─────────────────────────────────────────────────────────────
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2))
console.log(`✅ Results written to ${OUT_FILE}`)
