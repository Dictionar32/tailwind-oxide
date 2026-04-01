import { z } from "zod"
import type { EnginePlugin } from "./plugin-api"

const formatIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const p = issue.path.length > 0 ? issue.path.join(".") : "<root>"
      return `${p}: ${issue.message}`
    })
    .join("; ")

const parseWithSchema = <T>(schema: z.ZodType<T>, data: unknown, label: string): T => {
  const parsed = schema.safeParse(data)
  if (parsed.success) return parsed.data
  throw new TypeError(`${label}: ${formatIssues(parsed.error)}`)
}

export const EngineOptionsSchema = z.object({
  root: z.string().optional(),
  scanner: z
    .object({
      includeExtensions: z.array(z.string()).optional(),
      ignoreDirectories: z.array(z.string()).optional(),
      useCache: z.boolean().optional(),
      cacheDir: z.string().min(1).optional(),
      smartInvalidation: z.boolean().optional(),
    })
    .optional(),
  compileCss: z.boolean().optional(),
  tailwindConfigPath: z.string().optional(),
  analyze: z.boolean().optional(),
  plugins: z.array(z.custom<EnginePlugin>()).optional(),
})

export type EngineOptionsInput = z.infer<typeof EngineOptionsSchema>

export const EngineWatchOptionsSchema = z.object({
  debounceMs: z.number().int().min(0).optional(),
  maxEventsPerFlush: z.number().int().min(1).optional(),
  largeFileThreshold: z.number().int().min(0).optional(),
})

export type EngineWatchOptionsInput = z.infer<typeof EngineWatchOptionsSchema>

export const BuildResultSchema = z.object({
  scan: z.object({
    files: z.array(
      z.object({ file: z.string(), classes: z.array(z.string()), hash: z.string().optional() })
    ),
    totalFiles: z.number().int().min(0),
    uniqueClasses: z.array(z.string()),
  }),
  mergedClassList: z.string(),
  css: z.string(),
  analysis: z
    .object({
      unusedClasses: z.array(z.string()),
      classConflicts: z.array(
        z.object({
          className: z.string(),
          files: z.array(z.string()),
          classes: z.array(z.string()).optional(),
          message: z.string().optional(),
        })
      ),
      classUsage: z.record(z.string(), z.number()),
    })
    .optional(),
})

export type BuildResultInput = z.infer<typeof BuildResultSchema>

export const parseEngineOptions = (options: unknown) =>
  parseWithSchema(EngineOptionsSchema, options ?? {}, "engine options are invalid")

export const parseEngineWatchOptions = (options: unknown) =>
  parseWithSchema(EngineWatchOptionsSchema, options ?? {}, "engine watch options are invalid")
