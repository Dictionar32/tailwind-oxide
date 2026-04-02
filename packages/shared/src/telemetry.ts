/**
 * Performance telemetry — tracks build performance over time.
 *
 * Collects build metrics and provides trend analysis.
 * Only active in non-production environments.
 */

export interface BuildTelemetry {
  timestamp: number
  durationMs: number
  filesScanned: number
  filesCached: number
  classesExtracted: number
  phases: {
    scan: number
    compile: number
    engine: number
    output: number
  }
}

export interface TelemetryStats {
  avgDuration: number
  p50Duration: number
  p95Duration: number
  cacheHitRate: number
  totalBuilds: number
  trend: "improving" | "stable" | "degrading"
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export class TelemetryCollector {
  private data: BuildTelemetry[] = []
  private readonly maxEntries: number

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries
  }

  record(build: BuildTelemetry): void {
    this.data.push(build)
    if (this.data.length > this.maxEntries) {
      this.data = this.data.slice(-this.maxEntries)
    }
  }

  getStats(): TelemetryStats {
    if (this.data.length === 0) {
      return {
        avgDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        cacheHitRate: 0,
        totalBuilds: 0,
        trend: "stable",
      }
    }

    const durations = [...this.data].map((d) => d.durationMs).sort((a, b) => a - b)
    const totalFiles = this.data.reduce((s, d) => s + d.filesScanned, 0)
    const totalCached = this.data.reduce((s, d) => s + d.filesCached, 0)

    return {
      avgDuration: avg(durations),
      p50Duration: durations[Math.floor(durations.length * 0.5)] ?? 0,
      p95Duration: durations[Math.floor(durations.length * 0.95)] ?? durations.at(-1) ?? 0,
      cacheHitRate: totalFiles > 0 ? totalCached / totalFiles : 0,
      totalBuilds: this.data.length,
      trend: this.computeTrend(),
    }
  }

  getLast(): BuildTelemetry | undefined {
    return this.data.at(-1)
  }

  clear(): void {
    this.data = []
  }

  private computeTrend(): "improving" | "stable" | "degrading" {
    if (this.data.length < 6) return "stable"

    const recent = this.data.slice(-3).map((d) => d.durationMs)
    const older = this.data.slice(-6, -3).map((d) => d.durationMs)

    const recentAvg = avg(recent)
    const olderAvg = avg(older)

    if (olderAvg === 0) return "stable"

    const change = (recentAvg - olderAvg) / olderAvg
    if (change < -0.1) return "improving"
    if (change > 0.1) return "degrading"
    return "stable"
  }
}

export const telemetry = new TelemetryCollector()
