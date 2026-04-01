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

export const NextAdapterOptionsSchema = z.object({
  mode: z.literal("zero-runtime").optional(),
  autoClientBoundary: z.boolean().optional(),
  addDataAttr: z.boolean().optional(),
  hoist: z.boolean().optional(),
  routeCss: z.boolean().optional(),
  incremental: z.boolean().optional(),
  verbose: z.boolean().optional(),
  include: z.instanceof(RegExp).optional(),
  exclude: z.instanceof(RegExp).optional(),
})

export type NextAdapterOptionsInput = z.infer<typeof NextAdapterOptionsSchema>

export const parseNextAdapterOptions = (options: unknown) =>
  parseWithSchema(NextAdapterOptionsSchema, options ?? {}, "next adapter options are invalid")
