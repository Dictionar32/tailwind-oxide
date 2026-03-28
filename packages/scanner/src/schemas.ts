import { z } from "zod"

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

const NonNegativeIntegerSchema = z.number().int().min(0)

export const ScanWorkspaceOptionsSchema = z.object({
  includeExtensions: z.array(z.string()).optional(),
  ignoreDirectories: z.array(z.string()).optional(),
  useCache: z.boolean().optional(),
  cacheDir: z.string().min(1).optional(),
  smartInvalidation: z.boolean().optional(),
})

export type ScanWorkspaceOptions = z.infer<typeof ScanWorkspaceOptionsSchema>

export const ScanFileResultSchema = z.object({
  file: z.string(),
  classes: z.array(z.string()),
  hash: z.string().optional(),
})

export type ScanFileResult = z.infer<typeof ScanFileResultSchema>

export const ScanWorkspaceResultSchema = z
  .object({
    files: z.array(ScanFileResultSchema),
    totalFiles: NonNegativeIntegerSchema,
    uniqueClasses: z.array(z.string()),
  })
  .refine((value) => value.totalFiles === value.files.length, {
    message: "scan result totalFiles must match files.length",
    path: ["totalFiles"],
  })

export type ScanWorkspaceResult = z.infer<typeof ScanWorkspaceResultSchema>

export const ScannerWorkerRequestSchema = z.object({
  rootDir: z.string().min(1),
  options: ScanWorkspaceOptionsSchema.optional(),
})

export type ScannerWorkerRequest = z.infer<typeof ScannerWorkerRequestSchema>

export const ScannerWorkerSuccessMessageSchema = z.object({
  ok: z.literal(true),
  result: ScanWorkspaceResultSchema,
})

export const ScannerWorkerErrorMessageSchema = z.object({
  ok: z.literal(false),
  error: z.string().optional(),
})

export const ScannerWorkerMessageSchema = z.union([
  ScannerWorkerSuccessMessageSchema,
  ScannerWorkerErrorMessageSchema,
])

export type ScannerWorkerMessage = z.infer<typeof ScannerWorkerMessageSchema>

export const parseScanWorkspaceOptions = (options: unknown) =>
  parseWithSchema(ScanWorkspaceOptionsSchema, options ?? {}, "scanner options are invalid")

export const parseScanFileResult = (result: unknown) =>
  parseWithSchema(ScanFileResultSchema, result, "scanner file result is invalid")

export const parseScanWorkspaceResult = (result: unknown) =>
  parseWithSchema(ScanWorkspaceResultSchema, result, "scanner workspace result is invalid")

export const parseScannerWorkerRequest = (request: unknown) =>
  parseWithSchema(ScannerWorkerRequestSchema, request, "scanner worker request is invalid")

export const parseScannerWorkerMessage = (message: unknown) =>
  parseWithSchema(ScannerWorkerMessageSchema, message, "scanner worker message is invalid")
