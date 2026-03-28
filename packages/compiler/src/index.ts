/**
 * @tailwind-styled/compiler v5 — Public API
 *
 * This is the public API for end users.
 * For internal functions, import from "@tailwind-styled/compiler/internal"
 *
 * v5 Changes:
 * - Native binding is now REQUIRED (throws if unavailable)
 * - Mode option removed (zero-runtime only)
 * - API streamlined: only essential functions exported
 * - Dead Style Elimination (DSE) now available as public API
 */

// ── CORE TRANSFORM ─────────────────────────────────────────────────────────

export type { TransformOptions, TransformResult } from "./astTransform"
export { transformSource } from "./astTransform"

// ── CSS COMPILATION ────────────────────────────────────────────────────────

export type { CssCompileResult } from "./cssCompiler"
export { buildStyleTag, compileCssFromClasses } from "./cssCompiler"

// ── CLASS EXTRACTION ───────────────────────────────────────────────────────

export { extractAllClasses } from "./classExtractor"

// ── DEAD STYLE ELIMINATOR ─────────────────────────────────────────────────

export type { EliminationReport, VariantUsage } from "./deadStyleEliminator"
export {
  eliminateDeadCss,
  extractComponentUsage,
  findDeadVariants,
  optimizeCss,
  runElimination,
  scanProjectUsage,
} from "./deadStyleEliminator"

// ── INCREMENTAL COMPILATION ───────────────────────────────────────────────

export type { IncrementalEngineOptions, IncrementalStats } from "./incrementalEngine"
export {
  getIncrementalEngine,
  IncrementalEngine,
  resetIncrementalEngine,
} from "./incrementalEngine"

// ── RSC ANALYSIS ──────────────────────────────────────────────────────────

export type { RscAnalysis } from "./rscAnalyzer"
export { analyzeFile } from "./rscAnalyzer"

// ── STYLE BUCKET SYSTEM ───────────────────────────────────────────────────

export type { BucketStats, StyleBucket } from "./styleBucketSystem"
export { BucketEngine, getBucketEngine, resetBucketEngine } from "./styleBucketSystem"

////////////////////////////////////////////////////////////////////////////////
// DEPRECATED EXPORTS - Will be removed in v6
// Use @tailwind-styled/compiler/internal instead
////////////////////////////////////////////////////////////////////////////////

/** @deprecated Import from @tailwind-styled/compiler/internal */
export { shouldProcess } from "./astTransform"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { AtomicRule } from "./atomicCss"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export {
  clearAtomicRegistry,
  generateAtomicCss,
  getAtomicRegistry,
  parseAtomicClass,
  toAtomicClasses,
} from "./atomicCss"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export { mergeClassesStatic, normalizeClasses } from "./classMerger"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { HoistResult } from "./componentHoister"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export { hoistComponents } from "./componentHoister"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { CompileEngine, CompileInput } from "./context"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export { CompileContext } from "./context"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { CoreCompileOptions, CoreCompileResult } from "./coreCompiler"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export { compileWithCore, resetCompileCache } from "./coreCompiler"

/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { CssDiff, FileDependencyGraph, ProcessResult, StyleNode } from "./incrementalEngine"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { parseClassesToNodes } from "./incrementalEngine"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { LoaderContext, LoaderOptions, LoaderOutput } from "./loaderCore"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { runLoaderTransform, shouldSkipFile } from "./loaderCore"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export {
  bootstrapZeroConfig,
  getContentPaths,
  invalidateConfigCache,
  isZeroConfig,
  loadTailwindConfig,
} from "./loadTailwindConfig"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { ComponentMetadata, NativeBridge, NativeTransformResult } from "./nativeBridge"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { adaptNativeResult, getNativeBridge, resetNativeBridgeCache } from "./nativeBridge"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { Pipeline } from "./pipeline"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { RouteClassMap } from "./routeCssCollector"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export {
  fileToRoute,
  getAllRoutes,
  getCollector,
  getCollectorSummary,
  getRouteClasses,
  registerFileClasses,
  registerGlobalClasses,
  resetCollector,
} from "./routeCssCollector"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { ComponentEnv, StaticVariantUsage } from "./rscAnalyzer"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export {
  analyzeVariantUsage,
  injectClientDirective,
  injectServerOnlyComment,
  resolveServerVariant,
} from "./rscAnalyzer"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { AstExtractResult } from "./rustCssCompiler"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { astExtractClassesNative, compileCssNative } from "./rustCssCompiler"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { generateSafelist, generateSafelistCss, loadSafelist } from "./safelistGenerator"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { ConflictWarning } from "./styleBucketSystem"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { bucketSort, classifyNode, detectConflicts } from "./styleBucketSystem"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export type { CssGenerateResult, TailwindEngineOptions } from "./tailwindEngine"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { generateAllRouteCss, generateCssForClasses } from "./tailwindEngine"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export {
  hasInteractiveFeatures,
  hasTwUsage,
  isDynamic,
  isServerComponent,
} from "./twDetector"
/** @deprecated Import from @tailwind-styled/compiler/internal */
export { compileVariants } from "./variantCompiler"
