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

export const TokenConfigSchema = z.object({
  name: z.string().min(1),
  values: z.record(z.string(), z.record(z.string(), z.string())),
  asRoot: z.boolean().optional(),
})

export type TokenConfigInput = z.infer<typeof TokenConfigSchema>

export const LiveTokenUpdateSchema = z.object({
  tokens: z.record(z.string(), z.string()),
  source: z.string().optional(),
})

export type LiveTokenUpdateInput = z.infer<typeof LiveTokenUpdateSchema>

export const ThemeRegistrationSchema = z.object({
  name: z.string().min(1),
  tokens: z.record(z.string(), z.record(z.string(), z.string())),
  isDefault: z.boolean().optional(),
})

export type ThemeRegistrationInput = z.infer<typeof ThemeRegistrationSchema>

export const parseTokenConfig = (data: unknown) =>
  parseWithSchema(TokenConfigSchema, data, "token config is invalid")

export const parseLiveTokenUpdate = (data: unknown) =>
  parseWithSchema(LiveTokenUpdateSchema, data, "live token update is invalid")
