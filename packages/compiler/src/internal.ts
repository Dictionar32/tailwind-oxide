/**
 * @tailwind-styled/compiler v5 — Internal API
 *
 * This module contains internal functions that are NOT part of the public API.
 * These functions may change at any time without notice.
 *
 * Usage: import from "@tailwind-styled/compiler/internal"
 */

// ── AST Parser ─────────────────────────────────────────────────────────────
export { parseComponentConfig } from "./astParser"

// ── Atomic CSS — DEPRECATED in v5, use @tailwind-styled/atomic ──────────
// Deprecated: These functions are now available in @tailwind-styled/atomic package
// See: https://github.com/tailwind-styled/atomic
export {
  clearAtomicRegistry,
  generateAtomicCss,
  getAtomicRegistry,
  parseAtomicClass,
  toAtomicClasses,
} from "./atomicCss"

// ── Class utilities ────────────────────────────────────────────────────────
export { mergeClassesStatic, normalizeClasses } from "./classMerger"

// ── Component Hoisting ────────────────────────────────────────────────────
export type { HoistResult } from "./componentHoister"
export { hoistComponents } from "./componentHoister"
// ── Context & Pipeline ────────────────────────────────────────────────────
export type { CompileEngine, CompileInput } from "./context"
export { CompileContext } from "./context"
// ── Core Compiler ─────────────────────────────────────────────────────────
export type { CoreCompileOptions, CoreCompileResult } from "./coreCompiler"
export { compileWithCore, resetCompileCache } from "./coreCompiler"
export type { CssCompileResult } from "./cssCompiler"
// ── CSS Compiler (LightningCSS-style) ─────────────────────────────────────
export { buildStyleTag, compileCssFromClasses } from "./cssCompiler"
// ── Dead Style Eliminator ──────────────────────────────────────────────────
export type { EliminationReport, RegisteredComponent, VariantUsage } from "./deadStyleEliminator"
export {
  eliminateDeadCss,
  extractComponentUsage,
  findDeadVariants,
  optimizeCss,
  runElimination,
  scanProjectUsage,
} from "./deadStyleEliminator"
// ── Incremental Engine ─────────────────────────────────────────────────────
export type {
  CssDiff,
  FileDependencyGraph,
  IncrementalEngineOptions,
  IncrementalStats,
  ProcessResult,
  StyleNode,
} from "./incrementalEngine"
export {
  getIncrementalEngine,
  IncrementalEngine,
  parseClassesToNodes,
  resetIncrementalEngine,
} from "./incrementalEngine"
// ── Loader Core ────────────────────────────────────────────────────────────
export type { LoaderContext, LoaderOptions, LoaderOutput } from "./loaderCore"
export { runLoaderTransform, shouldSkipFile } from "./loaderCore"
export type { TailwindConfig } from "./loadTailwindConfig"
// ── Tailwind Config Loader ─────────────────────────────────────────────────
export {
  bootstrapZeroConfig,
  getContentPaths,
  invalidateConfigCache,
  isZeroConfig,
  loadTailwindConfig,
} from "./loadTailwindConfig"
// ── Native Bridge ─────────────────────────────────────────────────────────
export type {
  ComponentMetadata,
  NativeBridge,
  NativeRscResult,
  NativeTransformResult,
} from "./nativeBridge"
export {
  adaptNativeResult,
  getNativeBridge,
  resetNativeBridgeCache,
} from "./nativeBridge"
export { Pipeline } from "./pipeline"
// ── Route CSS Collector ─────────────────────────────────────────────────────
export type { RouteClassMap } from "./routeCssCollector"
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
// ── RSC Analyzer ──────────────────────────────────────────────────────────
export type { ComponentEnv, RscAnalysis, StaticVariantUsage } from "./rscAnalyzer"
export {
  analyzeFile,
  analyzeVariantUsage,
  injectClientDirective,
  injectServerOnlyComment,
  resolveServerVariant,
} from "./rscAnalyzer"
// ── Rust CSS Compiler ─────────────────────────────────────────────────────
export type {
  AstExtractResult as RustAstExtractResult,
  CssCompileResult as RustCssCompileResult,
} from "./rustCssCompiler"
export { astExtractClassesNative, compileCssNative } from "./rustCssCompiler"
// ── Safelist Generator ────────────────────────────────────────────────────
export { generateSafelist, generateSafelistCss, loadSafelist } from "./safelistGenerator"
export {
  parseComponentMetadataJson,
  parseNativeRscJson,
  parseSafelistJson,
} from "./schemas"
export type { CompiledVariantTable, StaticVariantConfig } from "./staticVariantCompiler"
// ── Static Variant Compiler ────────────────────────────────────────────────
export {
  compileAllVariantCombinations,
  generateStaticVariantCode,
  generateStaticVariantLookup,
  makeCombinationKey,
  StaticVariantResolver,
} from "./staticVariantCompiler"
// ── Style Bucket System ────────────────────────────────────────────────────
export type { BucketStats, ConflictWarning, StyleBucket } from "./styleBucketSystem"
export {
  BucketEngine,
  bucketSort,
  classifyNode,
  detectConflicts,
  getBucketEngine,
  resetBucketEngine,
} from "./styleBucketSystem"
export type { CssLayer, RegistryStats, StyleEntry } from "./styleRegistry"
// ── Style Registry ─────────────────────────────────────────────────────────
export {
  generateAtomicClass,
  getStyleRegistry,
  resetStyleRegistry,
  StyleRegistry,
} from "./styleRegistry"
// ── Tailwind Engine ────────────────────────────────────────────────────────
export type { CssGenerateResult, TailwindEngineMode, TailwindEngineOptions } from "./tailwindEngine"
export { generateAllRouteCss, generateCssForClasses } from "./tailwindEngine"
// ── Detectors ──────────────────────────────────────────────────────────────
export {
  hasInteractiveFeatures,
  hasTwUsage,
  isDynamic,
  isServerComponent,
} from "./twDetector"
export type { CompiledVariants } from "./variantCompiler"
// ── Variant Compiler ───────────────────────────────────────────────────────
export { compileVariants, generateVariantCode, parseObjectConfig } from "./variantCompiler"
