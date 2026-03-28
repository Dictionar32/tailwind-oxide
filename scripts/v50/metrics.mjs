#!/usr/bin/env node
/**
 * tw metrics [dir] -- Runtime metrics for scanner + analyzer (v5).
 */
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import { analyzeWorkspace } from "@tailwind-styled/analyzer"
import { scanWorkspaceAsync } from "@tailwind-styled/scanner"

const require = createRequire(import.meta.url)
const runtimeDir = path.dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const root = path.resolve(process.cwd(), args.find((arg) => !arg.startsWith("--")) ?? ".")
const jsonFlag = args.includes("--json")
const watchFlag = args.includes("--watch")

function loadNativeBinding() {
  const candidates = [
    path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
    path.resolve(runtimeDir, "..", "..", "native", "tailwind_styled_parser.node"),
  ]
  for (const candidate of candidates) {
    try {
      return require(candidate)
    } catch {
      // keep trying next candidate
    }
  }
  return null
}

const native = loadNativeBinding()

function toMs(startNs) {
  return Number(process.hrtime.bigint() - startNs) / 1e6
}

function padRow(label, value) {
  return `|  ${label.padEnd(14)} ${String(value).padEnd(36)}|`
}

async function collectMetrics() {
  const scanStarted = process.hrtime.bigint()
  const scanResult = await scanWorkspaceAsync(root)
  const scanMs = toMs(scanStarted)

  const cacheStats = native?.scanCacheStats?.() ?? { size: 0 }

  const analyzeStarted = process.hrtime.bigint()
  let report = null
  let analyzeError = null

  try {
    report = await analyzeWorkspace(root, {
      classStats: { top: 5, frequentThreshold: 2 },
    })
  } catch (error) {
    analyzeError = error instanceof Error ? error.message : String(error)
  }
  const analyzeMs = toMs(analyzeStarted)

  return {
    engine: native ? "rust" : "js",
    nativeLoaded: Boolean(native),
    nativeExports: native ? Object.keys(native).length : 0,
    scan: {
      totalFiles: scanResult.totalFiles,
      uniqueClasses: scanResult.uniqueClasses.length,
      timeMs: scanMs.toFixed(2),
      filesPerSecond:
        scanResult.totalFiles > 0 && scanMs > 0
          ? ((scanResult.totalFiles / scanMs) * 1000).toFixed(0)
          : "0",
    },
    cache: {
      inMemoryEntries: cacheStats.size ?? 0,
      backend: native ? "DashMap (Rust)" : "Map (JS)",
    },
    analyzer: report
      ? {
          totalFiles: report.totalFiles,
          uniqueClassCount: report.uniqueClassCount,
          totalOccurrences: report.totalClassOccurrences,
          frequentClasses: report.classStats.frequent.length,
          topClasses: report.classStats.top.slice(0, 5),
          timeMs: analyzeMs.toFixed(2),
        }
      : null,
    analyzeError,
  }
}

async function run() {
  const metrics = await collectMetrics()

  if (jsonFlag) {
    console.log(JSON.stringify(metrics, null, 2))
    return
  }

  const bar = "-".repeat(54)
  console.log(`\n+${bar}+`)
  console.log(`|  tailwind-styled-v4 Engine Metrics (v5)               |`)
  console.log(`+${bar}+`)
  console.log(padRow("Engine", metrics.engine))
  console.log(padRow("Native", metrics.nativeLoaded ? "loaded" : "not found"))
  console.log(padRow("Exports", metrics.nativeExports))
  console.log(`+${bar}+`)
  console.log(`|  SCAN                                                  |`)
  console.log(padRow("Files", metrics.scan.totalFiles))
  console.log(padRow("Classes", metrics.scan.uniqueClasses))
  console.log(padRow("Time", `${metrics.scan.timeMs}ms`))
  console.log(padRow("Speed", `${metrics.scan.filesPerSecond} files/sec`))
  console.log(`+${bar}+`)
  console.log(`|  CACHE                                                 |`)
  console.log(padRow("In-memory", `${metrics.cache.inMemoryEntries} entries`))
  console.log(padRow("Backend", metrics.cache.backend))

  if (metrics.analyzer) {
    console.log(`+${bar}+`)
    console.log(`|  ANALYZER                                              |`)
    console.log(padRow("Occurrences", metrics.analyzer.totalOccurrences))
    console.log(padRow("Frequent", metrics.analyzer.frequentClasses))
    console.log(padRow("Time", `${metrics.analyzer.timeMs}ms`))
    if (metrics.analyzer.topClasses.length > 0) {
      console.log(`|  Top classes:                                          |`)
      for (const item of metrics.analyzer.topClasses) {
        const line = `${item.name} (x${item.count})`
        console.log(`|    ${line.padEnd(50)}|`)
      }
    }
  } else if (metrics.analyzeError) {
    console.log(`+${bar}+`)
    console.log(`|  ANALYZER                                              |`)
    console.log(padRow("Status", "failed"))
    console.log(padRow("Reason", metrics.analyzeError))
  }

  console.log(`+${bar}+\n`)
}

async function main() {
  await run()
  if (watchFlag) {
    console.log("Watching... (Ctrl+C to stop)")
    setInterval(() => {
      void run()
    }, 5000)
  }
}

void main()
