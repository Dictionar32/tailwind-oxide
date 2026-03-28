#!/usr/bin/env node
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { performance } = require("node:perf_hooks")

const FILE_COUNT = Number(process.env.BENCH_FILE_COUNT ?? 1000)
const MAX_FULL_SCAN_MS = Number(process.env.BENCH_MAX_FULL_SCAN_MS ?? 250)
const MAX_INCREMENTAL_MS = Number(process.env.BENCH_MAX_INCREMENTAL_MS ?? 80)
const OUTPUT_FILE = process.env.BENCH_OUTPUT_FILE ?? "artifacts/benchmark-incremental.json"
const BASELINE_FILE = process.env.BENCH_BASELINE_FILE ?? "artifacts/benchmark-baseline.json"

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tw-styled-bench-"))
const CLASS_PATTERN = /class(Name)?=\"([^\"]+)\"/g

function createFixture(root, count) {
  for (let i = 0; i < count; i += 1) {
    const subDir = path.join(root, `group-${Math.floor(i / 100)}`)
    fs.mkdirSync(subDir, { recursive: true })
    const file = path.join(subDir, `component-${i}.tsx`)
    fs.writeFileSync(
      file,
      `export function C${i}(){return <div className=\"px-4 py-2 bg-blue-500 text-white\">${i}</div>}`,
      "utf8",
    )
  }
}

function scanWorkspace(root, cache) {
  let count = 0
  let classCount = 0

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (!fullPath.endsWith(".tsx")) continue

      const stat = fs.statSync(fullPath)
      const key = `${stat.mtimeMs}:${stat.size}`
      const cached = cache.get(fullPath)
      if (cached?.key === key) {
        classCount += cached.classCount
        count += 1
        continue
      }

      const src = fs.readFileSync(fullPath, "utf8")
      let localCount = 0
      CLASS_PATTERN.lastIndex = 0
      for (const match of src.matchAll(CLASS_PATTERN)) {
        localCount += match[2].split(/\s+/).length
      }
      cache.set(fullPath, { key, classCount: localCount })
      classCount += localCount
      count += 1
    }
  }

  walk(root)
  return { count, classCount }
}

createFixture(tmpRoot, FILE_COUNT)
const cache = new Map()

const t1 = performance.now()
const first = scanWorkspace(tmpRoot, cache)
const fullScanMs = performance.now() - t1

const changedFile = path.join(tmpRoot, "group-0", "component-0.tsx")
fs.appendFileSync(changedFile, "\n// change", "utf8")

const t2 = performance.now()
const second = scanWorkspace(tmpRoot, cache)
const incrementalLikeMs = performance.now() - t2

const result = {
  generatedAt: new Date().toISOString(),
  fileCount: FILE_COUNT,
  scannedFiles: second.count,
  detectedClasses: second.classCount,
  fullScanMs: Number(fullScanMs.toFixed(2)),
  incrementalLikeMs: Number(incrementalLikeMs.toFixed(2)),
  memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  note: "Benchmark baseline scanner traversal + cache key mtime:size",
  warmup: first.count,
  thresholds: {
    maxFullScanMs: MAX_FULL_SCAN_MS,
    maxIncrementalLikeMs: MAX_INCREMENTAL_MS,
  },
}

const outputPath = path.resolve(process.cwd(), OUTPUT_FILE)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + "\n")

const baselinePath = path.resolve(process.cwd(), BASELINE_FILE)
if (!fs.existsSync(baselinePath)) {
  fs.writeFileSync(baselinePath, JSON.stringify(result, null, 2) + "\n")
}

const failures = []
if (result.fullScanMs > MAX_FULL_SCAN_MS) {
  failures.push(`fullScanMs ${result.fullScanMs}ms > ${MAX_FULL_SCAN_MS}ms`)
}
if (result.incrementalLikeMs > MAX_INCREMENTAL_MS) {
  failures.push(`incrementalLikeMs ${result.incrementalLikeMs}ms > ${MAX_INCREMENTAL_MS}ms`)
}

console.log(JSON.stringify(result, null, 2))
console.log(`Artifact: ${path.relative(process.cwd(), outputPath)}`)

if (failures.length > 0) {
  console.error("Benchmark regression detected:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
}

fs.rmSync(tmpRoot, { recursive: true, force: true })
