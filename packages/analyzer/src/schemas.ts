import type { ScanWorkspaceOptions } from "@tailwind-styled/scanner"
import { z } from "zod"

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>"
      return `${path}: ${issue.message}`
    })
    .join("; ")

const parseWithSchema = <T>(schema: z.ZodType<T>, data: unknown, label: string): T => {
  const parsed = schema.safeParse(data)
  if (parsed.success) return parsed.data
  throw new TypeError(`${label}: ${formatIssues(parsed.error)}`)
}

const CountSchema = z.number().int().min(0)

export const ClassUsageSchema = z.object({
  name: z.string(),
  count: CountSchema,
  isUnused: z.boolean().optional(),
  isConflict: z.boolean().optional(),
})

export const ClassConflictSchema = z.object({
  className: z.string(),
  variants: z.array(z.string()),
  classes: z.array(z.string()),
  message: z.string(),
})

const ClassCountSchema = z.object({
  name: z.string(),
  count: CountSchema,
})

export const NativeReportSchema = z.object({
  root: z.string(),
  totalFiles: CountSchema,
  uniqueClassCount: CountSchema,
  totalClassOccurrences: CountSchema,
  topClasses: z.array(ClassCountSchema),
  duplicateCandidates: z.array(ClassCountSchema),
  safelist: z.array(z.string()),
})

export const NativeCssCompileResultSchema = z.object({
  css: z.string(),
  resolvedClasses: z.array(z.string()),
  unknownClasses: z.array(z.string()),
  sizeBytes: CountSchema,
})

const AnalyzerClassStatsSchema = z.object({
  top: z
    .number({
      error: "analyzeWorkspace options.classStats.top must be a number when provided.",
    })
    .finite()
    .optional(),
  frequentThreshold: z
    .number({
      error:
        "analyzeWorkspace options.classStats.frequentThreshold must be a number when provided.",
    })
    .finite()
    .optional(),
})

const AnalyzerSemanticOptionsSchema = z.object({
  tailwindConfigPath: z
    .string({
      error:
        "analyzeWorkspace options.semantic.tailwindConfigPath must be a non-empty string when provided.",
    })
    .min(
      1,
      "analyzeWorkspace options.semantic.tailwindConfigPath must be a non-empty string when provided."
    )
    .optional(),
})

export const AnalyzerOptionsSchema = z.object({
  scanner: z
    .custom<ScanWorkspaceOptions>(
      (value) => isPlainObject(value),
      "analyzeWorkspace options.scanner must be an object when provided."
    )
    .optional(),
  classStats: AnalyzerClassStatsSchema.optional(),
  semantic: z
    .union([
      z.boolean({
        error: "analyzeWorkspace options.semantic must be a boolean or an object when provided.",
      }),
      AnalyzerSemanticOptionsSchema,
    ])
    .optional(),
  includeClass: z
    .custom<(className: string) => boolean>(
      (value) => typeof value === "function",
      "analyzeWorkspace options.includeClass must be a function when provided."
    )
    .optional(),
})

export const ClassToCssOptionsSchema = z.object({
  prefix: z
    .union([z.string(), z.null()], {
      error: "classToCss options.prefix must be a string or null when provided.",
    })
    .optional(),
  strict: z
    .boolean({
      error: "classToCss options.strict must be a boolean when provided.",
    })
    .optional(),
})

export const parseAnalyzerOptions = (options: unknown) =>
  parseWithSchema(AnalyzerOptionsSchema, options ?? {}, "analyzeWorkspace options are invalid")

export const parseNativeReport = (report: unknown) =>
  parseWithSchema(NativeReportSchema, report, "Native analyzer report is invalid")

export const parseNativeCssCompileResult = (result: unknown, className?: string) =>
  parseWithSchema(
    NativeCssCompileResultSchema,
    result,
    className
      ? `Native CSS compile result is invalid for class "${className}"`
      : "Native CSS compile result is invalid"
  )

export const parseClassToCssOptions = (options: unknown) =>
  parseWithSchema(ClassToCssOptionsSchema, options ?? {}, "classToCss options are invalid")
