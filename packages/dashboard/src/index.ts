export {
  currentMetrics,
  events,
  getMetricsSummary,
  history,
  normalizeMetrics,
  resetHistory,
  updateMetrics,
} from "./state.js"

// Re-export shared trace utilities for dashboard surfaces
export type { TraceSnapshot, TraceSummary } from "@tailwind-styled/shared"
export {
  getHealthColor,
  getModeColor,
  formatMemory,
  formatDuration,
  calculateHealth,
  getBuildTimeColor,
  getMemoryColor,
  createTraceSnapshot,
  getPipelinePercentages,
} from "@tailwind-styled/shared"
