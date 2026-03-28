/**
 * @tailwind-styled/analyzer v5
 *
 * Native-first async analyzer with semantic reporting.
 */

import { analyzeWorkspace, buildDistribution, collectClassCounts } from "./analyzeWorkspace"
import { classToCss, normalizeClassInput } from "./classToCss"
import {
  parseAnalyzerOptions,
  parseClassToCssOptions,
  parseNativeCssCompileResult,
  parseNativeReport,
} from "./schemas"
import { resolveConflictGroup, splitVariantAndBase, utilityPrefix } from "./semantic"

export type {
  AnalyzerOptions,
  AnalyzerReport,
  AnalyzerSemanticReport,
  ClassConflict,
  ClassToCssOptions,
  ClassToCssResult,
  ClassUsage,
} from "./types"

export { analyzeWorkspace, classToCss }

export const __internal = {
  normalizeClassInput,
  splitVariantAndBase,
  resolveConflictGroup,
  collectClassCounts,
  buildDistribution,
  utilityPrefix,
  parseAnalyzerOptions,
  parseClassToCssOptions,
  parseNativeReport,
  parseNativeCssCompileResult,
}
