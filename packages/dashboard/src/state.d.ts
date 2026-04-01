import type { EventEmitter } from "node:events"

export interface DashboardMemoryMetrics {
  rss?: number
  heapUsed?: number
  heapTotal?: number
  [key: string]: unknown
}

export interface DashboardMetrics {
  generatedAt: string
  buildMs: number | null
  scanMs: number | null
  analyzeMs: number | null
  compileMs: number | null
  memoryMb: DashboardMemoryMetrics | null
  classCount: number | null
  fileCount: number | null
  cssBytes: number | null
  packageCount: number | null
  mode: "idle" | "jit" | "build" | "watch" | "error" | null
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
  [key: string]: unknown
}

export interface DashboardHealthIssue {
  severity: "error" | "warning"
  message: string
}

export interface DashboardMetricsSummary {
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
    issues: DashboardHealthIssue[]
  }
}

export const currentMetrics: DashboardMetrics
export const history: DashboardMetrics[]
export const events: EventEmitter
export function normalizeMetrics(data: Record<string, unknown>): DashboardMetrics
export function updateMetrics(data: Record<string, unknown>): DashboardMetrics
export function resetHistory(): void
export function getMetricsSummary(): DashboardMetricsSummary
