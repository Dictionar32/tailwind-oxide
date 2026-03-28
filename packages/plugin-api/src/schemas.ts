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

export const TwPluginOptionsSchema = z.object({
  debug: z.boolean().optional(),
  minify: z.boolean().optional(),
  tokens: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})

export type TwPluginOptionsInput = z.infer<typeof TwPluginOptionsSchema>

export const PluginManifestSchema = z.object({
  name: z.string().min(1),
  setup: z.function(),
})

export type PluginManifestInput = z.infer<typeof PluginManifestSchema>

export const TransformRegistrationSchema = z.function()

export const TokenRegistrationSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
})

export type TokenRegistrationInput = z.infer<typeof TokenRegistrationSchema>

export const parseTwPluginOptions = (options: unknown) =>
  parseWithSchema(TwPluginOptionsSchema, options ?? {}, "plugin options are invalid")

export const parseTokenRegistration = (data: unknown) =>
  parseWithSchema(TokenRegistrationSchema, data, "token registration is invalid")
