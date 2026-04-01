import { EventEmitter } from "node:events"

import { z } from "zod"

const MAX_HISTORY = 100

const MemoryMetricsSchema = z
  .object({
    rss: z.number().nonnegative().optional(),
    heapUsed: z.number().nonnegative().optional(),
    heapTotal: z.number().nonnegative().optional(),
  })
  .passthrough()

const DashboardMetricsSchema = z
  .object({
    generatedAt: z.string().min(1).default(() => new Date().toISOString()),
    buildMs: z.number().nonnegative().nullable().default(null),
    scanMs: z.number().nonnegative().nullable().default(null),
    analyzeMs: z.number().nonnegative().nullable().default(null),
    compileMs: z.number().nonnegative().nullable().default(null),
    memoryMb: MemoryMetricsSchema.nullable().default(null),
    classCount: z.number().int().nonnegative().nullable().default(null),
    fileCount: z.number().int().nonnegative().nullable().default(null),
    cssBytes: z.number().int().nonnegative().nullable().default(null),
    packageCount: z.number().int().nonnegative().nullable().default(null),
    mode: z.enum(["idle", "jit", "build", "watch", "error"]).nullable().default("idle"),
    error: z.string().optional(),
    lastEventType: z.string().optional(),
    eventsReceived: z.number().int().nonnegative().optional(),
    eventsProcessed: z.number().int().nonnegative().optional(),
    batchesProcessed: z.number().int().nonnegative().optional(),
    incrementalUpdates: z.number().int().nonnegative().optional(),
    fullRescans: z.number().int().nonnegative().optional(),
    skippedLargeFiles: z.number().int().nonnegative().optional(),
    queueMaxSize: z.number().int().nonnegative().optional(),
    lastBuildMs: z.number().nonnegative().optional(),
    avgBuildMs: z.number().nonnegative().optional(),
  })
  .passthrough()

function createDefaultMetrics() {
  return DashboardMetricsSchema.parse({})
}

function formatIssues(error) {
  return error.issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("; ")
}

export const currentMetrics = createDefaultMetrics()
export const history = []
export const events = new EventEmitter()

export function normalizeMetrics(data) {
  const parsed = DashboardMetricsSchema.safeParse({
    ...currentMetrics,
    ...data,
  })

  if (parsed.success) {
    return parsed.data
  }

  return {
    ...createDefaultMetrics(),
    generatedAt: new Date().toISOString(),
    mode: "error",
    error: formatIssues(parsed.error),
  }
}

export function updateMetrics(data) {
  const next = normalizeMetrics(data)
  Object.assign(currentMetrics, next, { generatedAt: new Date().toISOString() })
  history.push({ ...currentMetrics })
  if (history.length > MAX_HISTORY) history.shift()
  events.emit("update", currentMetrics)
  return currentMetrics
}

export function resetHistory() {
  history.length = 0
  events.emit("reset")
}

export function getMetricsSummary() {
  const issues = []

  if (currentMetrics.error) {
    issues.push({
      severity: "error",
      message: currentMetrics.error,
    })
  }

  if ((currentMetrics.buildMs ?? 0) > 2000) {
    issues.push({
      severity: "warning",
      message: `Build duration is elevated at ${currentMetrics.buildMs}ms.`,
    })
  }

  if ((currentMetrics.scanMs ?? 0) > 1000) {
    issues.push({
      severity: "warning",
      message: `Scan duration is elevated at ${currentMetrics.scanMs}ms.`,
    })
  }

  if ((currentMetrics.memoryMb?.heapUsed ?? 0) > 500) {
    issues.push({
      severity: "warning",
      message: `Heap usage is elevated at ${currentMetrics.memoryMb.heapUsed}MB.`,
    })
  }

  const status =
    currentMetrics.mode === "error" || issues.some((issue) => issue.severity === "error")
      ? "unhealthy"
      : issues.some((issue) => issue.severity === "warning")
        ? "degraded"
        : "healthy"

  return {
    workspace: {
      totalPackages: currentMetrics.packageCount ?? 0,
      totalFiles: currentMetrics.fileCount ?? 0,
      totalClasses: currentMetrics.classCount ?? 0,
      lastScanDurationMs: currentMetrics.scanMs ?? 0,
      lastBuildDurationMs: currentMetrics.buildMs ?? 0,
    },
    cache: {
      hitRate:
        (currentMetrics.eventsReceived ?? 0) > 0
          ? Math.max(
              0,
              Math.min(
                1,
                (currentMetrics.eventsProcessed ?? 0) / Math.max(currentMetrics.eventsReceived ?? 1, 1)
              )
            )
          : 0,
      totalEntries: history.length,
      memoryUsageMb: currentMetrics.memoryMb?.heapUsed ?? 0,
    },
    pipeline: {
      scanDurationMs: currentMetrics.scanMs ?? 0,
      analyzeDurationMs: currentMetrics.analyzeMs ?? 0,
      compileDurationMs: currentMetrics.compileMs ?? 0,
      totalDurationMs:
        (currentMetrics.scanMs ?? 0) +
        (currentMetrics.analyzeMs ?? 0) +
        (currentMetrics.compileMs ?? 0),
    },
    health: {
      status,
      issues,
    },
  }
}
