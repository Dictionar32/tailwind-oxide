/**
 * @tailwind-styled/shared - Zod Validation Schemas
 * Provides type-safe validation for common data structures
 */

import { z } from "zod"

// ============================================
// Source Location
// ============================================

export const SourceLocationSchema = z.object({
  file: z.string(),
  line: z.number().int().min(1),
  column: z.number().int().min(1).optional(),
})

export type SourceLocation = z.infer<typeof SourceLocationSchema>

// ============================================
// CSS Types
// ============================================

export const CssPropertySchema = z.object({
  property: z.string(),
  value: z.string(),
  important: z.boolean().default(false),
})

export type CssProperty = z.infer<typeof CssPropertySchema>

export const StyleNodeSchema = z.object({
  twClass: z.string(),
  atomicClass: z.string(),
  declaration: z.string(),
  modifier: z.string().optional(),
  layer: z
    .enum([
      "reset",
      "layout",
      "spacing",
      "sizing",
      "typography",
      "visual",
      "interaction",
      "responsive",
      "utilities",
    ])
    .default("utilities"),
  refCount: z.number().int().min(0).default(1),
})

export type StyleNode = z.infer<typeof StyleNodeSchema>

// ============================================
// Utility Types
// ============================================

export const UtilitySchema = z.object({
  name: z.string(),
  property: z.string(),
  value: z.string(),
  variants: z.array(z.string()).default([]),
  responsive: z.array(z.string()).default([]),
  pseudo: z.array(z.string()).default([]),
})

export type Utility = z.infer<typeof UtilitySchema>

// ============================================
// Config Types
// ============================================

export const BaseConfigSchema = z.object({
  verbose: z.boolean().default(false),
  debug: z.boolean().default(false),
  cwd: z.string().default(process.cwd?.() ?? "."),
  cacheDir: z.string().default(".tw-cache"),
})

export type BaseConfig = z.infer<typeof BaseConfigSchema>

// ============================================
// Result Type for Error Handling (Railway-Oriented Programming)
// ============================================

export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }

// Helper functions
export const ok = <T, E = string>(value: T): Result<T, E> => ({ ok: true, value })

export const err = <T, E = string>(error: E): Result<T, E> => ({ ok: false, error })

export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } =>
  result.ok === true

export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } =>
  result.ok === false

export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => (isOk(result) ? { ok: true, value: fn(result.value) } : result)

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => (isOk(result) ? fn(result.value) : result)

export const match = <T, E, R>(
  result: Result<T, E>,
  patterns: { ok: (value: T) => R; err: (error: E) => R }
): R => (isOk(result) ? patterns.ok(result.value) : patterns.err(result.error))

// ============================================
// Validation Helpers
// ============================================

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): Result<T, string> => {
  try {
    return ok(schema.parse(data))
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error))
  }
}

export const safeParse = <T>(schema: z.ZodSchema<T>, data: unknown): Result<T, string> =>
  validate(schema, data)

// ============================================
// Parser State (for immutable state pattern)
// ============================================

export const ParserStateSchema = z.object({
  inBlock: z.boolean(),
  keepBlock: z.boolean(),
  depth: z.number().int().min(0),
})

export type ParserState = z.infer<typeof ParserStateSchema>

export const initialParserState: ParserState = {
  inBlock: false,
  keepBlock: false,
  depth: 0,
}

// ============================================
// ID Generator State (for counter pattern replacement)
// ============================================

export const IdGeneratorSchema = z.object({
  nextId: z.number().int().min(0),
  ids: z.record(z.string(), z.number()).default({}),
})

export type IdGenerator = z.infer<typeof IdGeneratorSchema>

export const createIdGenerator = (): IdGenerator => ({
  nextId: 0,
  ids: {},
})

export const generateId = (gen: IdGenerator, name: string): number => {
  const id = gen.nextId++
  gen.ids[name] = id
  return id
}

// ============================================
// Native Binding Result Schemas
// ============================================

export const ParsedClassSchema = z.object({
  raw: z.string(),
  base: z.string(),
  variants: z.array(z.string()),
  modifierType: z.string().nullable().optional(),
  modifierValue: z.string().nullable().optional(),
})

export type ParsedClass = z.infer<typeof ParsedClassSchema>

export const SubComponentSchema = z.object({
  name: z.string(),
  tag: z.string(),
  classes: z.string(),
  scopedClass: z.string(),
})

export type SubComponent = z.infer<typeof SubComponentSchema>

export const TransformResultSchema = z.object({
  code: z.string(),
  classes: z.array(z.string()),
  changed: z.boolean(),
  rscJson: z.string().nullable().optional(),
  metadataJson: z.string().nullable().optional(),
})

export type TransformResult = z.infer<typeof TransformResultSchema>

export const RscAnalysisSchema = z.object({
  isServer: z.boolean(),
  needsClientDirective: z.boolean(),
  clientReasons: z.array(z.string()),
})

export type RscAnalysis = z.infer<typeof RscAnalysisSchema>

export const ScannedFileSchema = z.object({
  file: z.string(),
  classes: z.array(z.string()),
  hash: z.string(),
})

export type ScannedFile = z.infer<typeof ScannedFileSchema>

export const ScanResultSchema = z.object({
  files: z.array(ScannedFileSchema),
  totalFiles: z.number().int().nonnegative(),
  uniqueClasses: z.array(z.string()),
})

export type ScanResult = z.infer<typeof ScanResultSchema>

export const IncrementalDiffSchema = z.object({
  addedClasses: z.array(z.string()),
  removedClasses: z.array(z.string()),
  changedFiles: z.array(z.string()),
  unchangedFiles: z.number().int().nonnegative(),
})

export type IncrementalDiff = z.infer<typeof IncrementalDiffSchema>

export const FileChangeDiffSchema = z.object({
  added: z.array(z.string()),
  removed: z.array(z.string()),
})

export type FileChangeDiff = z.infer<typeof FileChangeDiffSchema>

export const ClassCountSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
})

export type ClassCount = z.infer<typeof ClassCountSchema>

export const AnalyzerReportSchema = z.object({
  root: z.string(),
  totalFiles: z.number().int().nonnegative(),
  uniqueClassCount: z.number().int().nonnegative(),
  totalClassOccurrences: z.number().int().nonnegative(),
  topClasses: z.array(ClassCountSchema),
  duplicateCandidates: z.array(ClassCountSchema),
  safelist: z.array(z.string()),
})

export type AnalyzerReport = z.infer<typeof AnalyzerReportSchema>

export const CompiledAnimationSchema = z.object({
  className: z.string(),
  keyframesCss: z.string(),
  animationCss: z.string(),
})

export type CompiledAnimation = z.infer<typeof CompiledAnimationSchema>

export const ThemeTokenSchema = z.object({
  key: z.string(),
  cssVar: z.string(),
  value: z.string(),
})

export type ThemeToken = z.infer<typeof ThemeTokenSchema>

export const CompiledThemeSchema = z.object({
  name: z.string(),
  selector: z.string(),
  css: z.string(),
  tokens: z.array(ThemeTokenSchema),
})

export type CompiledTheme = z.infer<typeof CompiledThemeSchema>