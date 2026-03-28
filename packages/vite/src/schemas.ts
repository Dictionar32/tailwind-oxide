import { z } from "zod"

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

export const VitePluginOptionsSchema = z.object({
  include: z.instanceof(RegExp).optional(),
  exclude: z.instanceof(RegExp).optional(),
  scanDirs: z.array(z.string()).optional(),
  safelistOutput: z.string().optional(),
  generateSafelist: z.boolean().optional(),
  scanReportOutput: z.string().optional(),
  useEngineBuild: z.boolean().optional(),
  analyze: z.boolean().optional(),
  strict: z.boolean().optional(),
  mode: z.enum(["zero-runtime", "runtime"]).optional(),
  routeCss: z.boolean().optional(),
  deadStyleElimination: z.boolean().optional(),
  addDataAttr: z.boolean().optional(),
  autoClientBoundary: z.boolean().optional(),
  hoist: z.boolean().optional(),
  incremental: z.boolean().optional(),
})

export type VitePluginOptionsInput = z.infer<typeof VitePluginOptionsSchema>

export const parseVitePluginOptions = (options: unknown) =>
  parseWithSchema(VitePluginOptionsSchema, options ?? {}, "vite plugin options are invalid")
