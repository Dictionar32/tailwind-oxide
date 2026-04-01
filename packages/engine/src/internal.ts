/**
 * @tailwind-styled/engine v5 — Internal API
 *
 * This module contains internal functions that are NOT part of the public API.
 * These functions may change at any time without notice.
 *
 * Usage: import from "@tailwind-styled/engine/internal"
 */

// Re-export scanner types
export type {
  ScanFileResult,
  ScanWorkspaceOptions,
  ScanWorkspaceResult,
} from "@tailwind-styled/scanner"
export { type BundleAnalysisResult, BundleAnalyzer, type ClassBundleInfo } from "./bundleAnalyzer"
export { type ComponentImpact, type ImpactReport, ImpactTracker } from "./impactTracker"
export { applyIncrementalChange } from "./incremental"
export {
  CascadeResolutionId,
  type CascadeResolutionIR,
  CascadeStage,
  ConditionId,
  type ConditionIR,
  ConditionResult,
  compareCascadeOrder,
  createFingerprint,
  createResolutionReason,
  type FinalComputedStyleIR,
  Importance,
  LayerId,
  Origin,
  type PropertyBucketIR,
  PropertyId,
  type ResolutionCause,
  type ResolutionReason,
  RuleId,
  type RuleIR,
  SelectorId,
  type SelectorIR,
  type SourceLocation,
  type StyleGraphIR,
  ValueId,
  VariantChainId,
  type VariantChainIR,
} from "./ir"
export type { EngineMetricsSnapshot } from "./metrics"
export { EngineMetricsCollector } from "./metrics"
export {
  type EnginePlugin,
  type EnginePluginContext,
  type EngineWatchContext,
  runAfterBuild,
  runAfterScan,
  runAfterWatch,
  runBeforeBuild,
  runBeforeScan,
  runBeforeWatch,
  runOnError,
  runTransformClasses,
} from "./plugin-api"
export { type ClassUsage, ReverseLookup, type ReverseLookupResult } from "./reverseLookup"
export type { WorkspaceWatcher } from "./watch"
export { watchWorkspace as watchWorkspaceLegacy } from "./watch"
export type { WatchCallback, WatchEvent, WatchEventKind, WatchHandle } from "./watch-native"
export { watchWorkspace as watchWorkspaceNative } from "./watch-native"
