import { z } from "zod"

// --- ScanWorkspaceOptions passthrough (from @tailwind-styled/scanner) ---
const ScanWorkspaceOptionsSchema = z
  .object({
    includeExtensions: z.array(z.string()).optional(),
    ignoreDirectories: z.array(z.string()).optional(),
    useCache: z.boolean().optional(),
    cacheDir: z.string().min(1).optional(),
    smartInvalidation: z.boolean().optional(),
  })
  .optional()

// --- EngineOptions (primary boundary input) ---
export const EngineOptionsSchema = z.object({
  root: z.string().min(1, "root tidak boleh kosong").optional(),
  scanner: ScanWorkspaceOptionsSchema,
  compileCss: z.boolean().optional(),
  tailwindConfigPath: z.string().min(1).optional(),
  plugins: z
    .array(
      z.object({
        name: z.string().min(1, "plugin name tidak boleh kosong"),
      })
    )
    .optional(),
  analyze: z.boolean().optional(),
})
export type EngineOptionsValidated = z.infer<typeof EngineOptionsSchema>

// --- EngineWatchOptions ---
export const EngineWatchOptionsSchema = z.object({
  debounceMs: z.number().int().min(0).max(60000).optional(),
  maxEventsPerFlush: z.number().int().min(1).max(10000).optional(),
  largeFileThreshold: z.number().int().min(0).optional(),
})
export type EngineWatchOptionsValidated = z.infer<typeof EngineWatchOptionsSchema>

// --- EngineMetricsSnapshot ---
export const EngineMetricsSnapshotSchema = z.object({
  eventsReceived: z.number().int().min(0),
  eventsProcessed: z.number().int().min(0),
  batchesProcessed: z.number().int().min(0),
  incrementalUpdates: z.number().int().min(0),
  fullRescans: z.number().int().min(0),
  skippedLargeFiles: z.number().int().min(0),
  queueMaxSize: z.number().int().min(0),
  lastBuildMs: z.number().min(0),
  avgBuildMs: z.number().min(0),
})
export type EngineMetricsSnapshotValidated = z.infer<typeof EngineMetricsSnapshotSchema>

// --- EnginePluginContext ---
export const EnginePluginContextSchema = z.object({
  root: z.string().min(1),
  timestamp: z.number().int().min(0),
})
export type EnginePluginContextValidated = z.infer<typeof EnginePluginContextSchema>

// --- SourceLocation ---
export const SourceLocationSchema = z.object({
  file: z.string(),
  line: z.number().int().min(0),
  column: z.number().int().min(0),
})
export type SourceLocationValidated = z.infer<typeof SourceLocationSchema>

// --- ImpactReport ---
export const ImpactReportSchema = z.object({
  className: z.string(),
  totalComponents: z.number().int().min(0),
  directUsage: z.number().int().min(0),
  indirectUsage: z.number().int().min(0),
  bundleSizeBytes: z.number().int().min(0),
  estimatedSavings: z.number().int().min(0),
  riskLevel: z.enum(["low", "medium", "high"]),
  suggestions: z.array(z.string()),
})
export type ImpactReportValidated = z.infer<typeof ImpactReportSchema>

// --- ComponentImpact ---
export const ComponentImpactSchema = z.object({
  file: z.string(),
  line: z.number().int().min(0),
  column: z.number().int().min(0),
  usageType: z.enum(["direct", "variant", "component"]),
  variant: z.string().optional(),
})
export type ComponentImpactValidated = z.infer<typeof ComponentImpactSchema>

// --- ClassBundleInfo ---
export const ClassBundleInfoSchema = z.object({
  className: z.string(),
  usageCount: z.number().int().min(0),
  usedInFiles: z.array(SourceLocationSchema),
  bundleSize: z.number().int().min(0),
  componentsAffected: z.number().int().min(0),
  variantChain: z.array(z.string()),
  isDeadCode: z.boolean(),
  dependencies: z.array(z.string()),
})
export type ClassBundleInfoValidated = z.infer<typeof ClassBundleInfoSchema>

// --- BundleAnalysisResult ---
export const BundleAnalysisResultSchema = z.object({
  className: z.string(),
  totalUsage: z.number().int().min(0),
  files: z.array(SourceLocationSchema),
  bundleSizeBytes: z.number().int().min(0),
  variantChains: z.array(z.string()),
  isDeadCode: z.boolean(),
  dependencies: z.array(z.string()),
})
export type BundleAnalysisResultValidated = z.infer<typeof BundleAnalysisResultSchema>

// --- Validation helpers ---
export function validateEngineOptions(input: unknown): EngineOptionsValidated {
  return EngineOptionsSchema.parse(input)
}

export function validateEngineWatchOptions(input: unknown): EngineWatchOptionsValidated {
  return EngineWatchOptionsSchema.parse(input)
}
