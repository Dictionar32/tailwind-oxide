/**
 * Shared trace utilities for CLI, devtools, and dashboard
 * 
 * Provides reusable trace snapshot handling, formatting, and analysis
 * across the tailwind-styled-v4 ecosystem without introducing coupling.
 */

export interface TraceSnapshot {
  generatedAt: string
  buildMs: number | null
  scanMs: number | null
  analyzeMs: number | null
  compileMs: number | null
  memoryMb: { rss: number; heapUsed: number; heapTotal: number } | null
  classCount: number | null
  fileCount: number | null
  cssBytes: number | null
  mode: string | null
  eventsReceived?: number
  eventsProcessed?: number
  batchesProcessed?: number
  incrementalUpdates?: number
  fullRescans?: number
}

export interface TraceSummary {
  workspace: {
    totalPackages: number
    totalFiles: number
    totalClasses: number
    lastScanDurationMs: number
    lastBuildDurationMs: number
  }
  cache: {
    hitRate: number
    totalEntries: number
    memoryUsageMb: number
  }
  pipeline: {
    scanDurationMs: number
    analyzeDurationMs: number
    compileDurationMs: number
    totalDurationMs: number
  }
  health: {
    status: "healthy" | "degraded" | "unhealthy"
    issues: Array<{ severity: string; message: string }>
  }
}

/**
 * Get health status color for UI rendering
 */
export function getHealthColor(status?: string): string {
  switch (status) {
    case "healthy":
      return "#34d399"
    case "degraded":
      return "#fbbf24"
    case "unhealthy":
      return "#f87171"
    default:
      return "#52525b"
  }
}

/**
 * Get mode color for UI rendering
 */
export function getModeColor(mode?: string | null): string {
  switch (mode) {
    case "build":
      return "#fbbf24"
    case "watch":
      return "#34d399"
    case "jit":
      return "#60a5fa"
    case "error":
      return "#f87171"
    case "idle":
      return "#71717a"
    default:
      return "#52525b"
  }
}

/**
 * Format memory in human-readable format
 */
export function formatMemory(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "—"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Calculate health status from metrics
 */
export function calculateHealth(
  metrics: TraceSnapshot,
  summary?: TraceSummary
): "healthy" | "degraded" | "unhealthy" {
  if (summary?.health?.status) return summary.health.status

  // Fallback to simple heuristics
  if (metrics.mode === "error") return "unhealthy"
  if ((metrics.buildMs ?? 0) > 5000) return "degraded"
  if (metrics.memoryMb && metrics.memoryMb.heapUsed > 500) return "degraded"
  return "healthy"
}

/**
 * Get color for build time indicator
 */
export function getBuildTimeColor(ms: number | null): string {
  if (ms === null) return "#52525b"
  if (ms > 1000) return "#f87171" // red - very slow
  if (ms > 500) return "#fbbf24" // amber - acceptable
  return "#34d399" // green - fast
}

/**
 * Get color for memory usage indicator
 */
export function getMemoryColor(mb: number): string {
  if (mb > 500) return "#f87171" // red - high
  if (mb > 250) return "#fbbf24" // amber - moderate
  return "#34d399" // green - low
}

/**
 * Create trace snapshot from dashboard data
 */
export function createTraceSnapshot(data: Record<string, unknown>): TraceSnapshot {
  return {
    generatedAt: (data.generatedAt as string) || new Date().toISOString(),
    buildMs: (data.buildMs as number) ?? null,
    scanMs: (data.scanMs as number) ?? null,
    analyzeMs: (data.analyzeMs as number) ?? null,
    compileMs: (data.compileMs as number) ?? null,
    memoryMb: (data.memoryMb as { rss: number; heapUsed: number; heapTotal: number } | null) ?? null,
    classCount: (data.classCount as number) ?? null,
    fileCount: (data.fileCount as number) ?? null,
    cssBytes: (data.cssBytes as number) ?? null,
    mode: (data.mode as string) ?? null,
    eventsReceived: (data.eventsReceived as number | undefined) ?? undefined,
    eventsProcessed: (data.eventsProcessed as number | undefined) ?? undefined,
    batchesProcessed: (data.batchesProcessed as number | undefined) ?? undefined,
    incrementalUpdates: (data.incrementalUpdates as number | undefined) ?? undefined,
    fullRescans: (data.fullRescans as number | undefined) ?? undefined,
  }
}

/**
 * Calculate pipeline time distribution
 */
export function getPipelinePercentages(metrics: TraceSnapshot): {
  scanPct: number
  analyzePct: number
  compilePct: number
} {
  const scan = metrics.scanMs ?? 0
  const analyze = metrics.analyzeMs ?? 0
  const compile = metrics.compileMs ?? 0
  const total = scan + analyze + compile

  if (total === 0) {
    return { scanPct: 0, analyzePct: 0, compilePct: 0 }
  }

  return {
    scanPct: (scan / total) * 100,
    analyzePct: (analyze / total) * 100,
    compilePct: (compile / total) * 100,
  }
}
