/**
 * tailwind-styled-v4 — Metrics Writer
 *
 * Menulis metrics dari engine ke file `.tw-cache/metrics.json`
 * sehingga dashboard server bisa membaca secara real-time.
 *
 * Dipanggil dari engine setelah setiap build selesai.
 */

import fs from "node:fs"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { createLogger } from "@tailwind-styled/shared"

const _log = createLogger("tw:metrics")

export interface BuildMetrics {
  buildMs?: number
  scanMs?: number
  analyzeMs?: number
  compileMs?: number
  classCount?: number
  fileCount?: number
  cssBytes?: number
  packageCount?: number
  memoryMb?: { rss: number; heapUsed: number; heapTotal: number }
  mode?: "jit" | "build" | "watch" | "idle" | "error"
  route?: string
  error?: string
  lastEventType?: string
  eventsReceived?: number
  eventsProcessed?: number
  batchesProcessed?: number
  incrementalUpdates?: number
  fullRescans?: number
  skippedLargeFiles?: number
  queueMaxSize?: number
  lastBuildMs?: number
  avgBuildMs?: number
  generatedAt?: string
}

const METRICS_FILE_NAME = "metrics.json"
const CACHE_DIR = ".tw-cache"

/**
 * Tulis metrics ke file untuk dibaca oleh dashboard server.
 * Non-blocking — error diabaikan.
 */
export function writeMetrics(metrics: BuildMetrics, cwd = process.cwd()): void {
  try {
    const cacheDir = path.join(cwd, CACHE_DIR)
    fs.mkdirSync(cacheDir, { recursive: true })

    const mem = process.memoryUsage()
    const data: BuildMetrics = {
      ...metrics,
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      generatedAt: new Date().toISOString(),
    }

    fs.writeFileSync(path.join(cacheDir, METRICS_FILE_NAME), JSON.stringify(data, null, 2))
  } catch {
    // Non-critical — dashboard adalah opsional
  }
}

/**
 * Higher-order wrapper — ukur durasi fungsi dan tulis metrics.
 *
 * @example
 * const result = await withMetrics('build', async () => {
 *   return await engine.build()
 * }, { classCount: result.scan.uniqueClasses.length })
 */
export async function withMetrics<T>(
  mode: BuildMetrics["mode"],
  fn: () => Promise<T>,
  extraMetrics: Partial<BuildMetrics> = {},
  cwd = process.cwd()
): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const elapsed = Math.round(performance.now() - start)

  writeMetrics({ mode, buildMs: elapsed, ...extraMetrics }, cwd)

  return result
}

/**
 * Buat timer untuk mengukur scan time.
 *
 * @example
 * const timer = startScanTimer()
 * const scan = scanWorkspace(root)
 * writeMetrics({ scanMs: timer.elapsed(), classCount: scan.uniqueClasses.length })
 */
export function startTimer() {
  const start = performance.now()
  return {
    elapsed: () => Math.round(performance.now() - start),
  }
}

export default { writeMetrics, withMetrics, startTimer }
