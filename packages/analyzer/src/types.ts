import type { ScanWorkspaceOptions, ScanWorkspaceResult } from "@tailwind-styled/scanner"
import type { z } from "zod"

import type {
  AnalyzerOptionsSchema,
  ClassConflictSchema,
  ClassToCssOptionsSchema,
  ClassUsageSchema,
  NativeCssCompileResultSchema,
  NativeReportSchema,
} from "./schemas"

export interface NativeAnalyzerBinding {
  analyzeClasses: (filesJson: string, root: string, topN: number) => NativeReport | null
  compileCss?: (classes: string[], prefix: string | null) => NativeCssCompileResult | null
}

export interface NativeCssCompilerBinding extends NativeAnalyzerBinding {
  compileCss: (classes: string[], prefix: string | null) => NativeCssCompileResult | null
}

export type NativeReport = z.infer<typeof NativeReportSchema>

export type NativeCssCompileResult = z.infer<typeof NativeCssCompileResultSchema>

export type ClassUsage = z.infer<typeof ClassUsageSchema>

export type ClassConflict = z.infer<typeof ClassConflictSchema>

export interface AnalyzerSemanticReport {
  unusedClasses: ClassUsage[]
  unknownClasses: ClassUsage[]
  conflicts: ClassConflict[]
  tailwindConfig?: {
    path: string
    loaded: boolean
    safelistCount: number
    customUtilityCount: number
    warning?: string
  }
}

export interface AnalyzerReport {
  root: string
  totalFiles: number
  uniqueClassCount: number
  totalClassOccurrences: number
  classStats: {
    all: ClassUsage[]
    top: ClassUsage[]
    frequent: ClassUsage[]
    unique: ClassUsage[]
    distribution: Record<string, number>
  }
  /** All classes found, useful for Tailwind safelist. */
  safelist: string[]
  semantic?: AnalyzerSemanticReport
}

export type AnalyzerOptions = z.infer<typeof AnalyzerOptionsSchema> & {
  scanner?: ScanWorkspaceOptions
}

export type ClassToCssOptions = z.infer<typeof ClassToCssOptionsSchema>

export interface ClassToCssResult {
  inputClasses: string[]
  css: string
  declarations: string
  resolvedClasses: string[]
  unknownClasses: string[]
  sizeBytes: number
}

export interface LoadedTailwindConfig {
  path: string
  loaded: boolean
  warning?: string
  safelist: Set<string>
  customUtilities: Set<string>
}

export interface TailwindConfigCacheEntry {
  mtimeMs: number
  size: number
  config: LoadedTailwindConfig
}

export type { ScanWorkspaceResult }
