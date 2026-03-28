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

export const CliGlobalOptionsSchema = z.object({
  json: z.boolean().optional(),
  debug: z.boolean().optional(),
  verbose: z.boolean().optional(),
})

export type CliGlobalOptionsInput = z.infer<typeof CliGlobalOptionsSchema>

export const SetupOptionsSchema = z.object({
  yes: z.boolean().optional(),
  next: z.boolean().optional(),
  vite: z.boolean().optional(),
  rspack: z.boolean().optional(),
  react: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  skipInstall: z.boolean().optional(),
})

export type SetupOptionsInput = z.infer<typeof SetupOptionsSchema>

export const CreateOptionsSchema = z.object({
  template: z.string().optional(),
  yes: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  json: z.boolean().optional(),
})

export type CreateOptionsInput = z.infer<typeof CreateOptionsSchema>

export const ScanOptionsSchema = z.object({
  dir: z.string().optional(),
  json: z.boolean().optional(),
})

export type ScanOptionsInput = z.infer<typeof ScanOptionsSchema>

export const DeployOptionsSchema = z.object({
  dryRun: z.boolean().optional(),
  json: z.boolean().optional(),
})

export type DeployOptionsInput = z.infer<typeof DeployOptionsSchema>

export const parseCliGlobalOptions = (options: unknown) =>
  parseWithSchema(CliGlobalOptionsSchema, options ?? {}, "CLI global options are invalid")

export const parseSetupOptions = (options: unknown) =>
  parseWithSchema(SetupOptionsSchema, options ?? {}, "setup options are invalid")

export const parseCreateOptions = (options: unknown) =>
  parseWithSchema(CreateOptionsSchema, options ?? {}, "create options are invalid")
