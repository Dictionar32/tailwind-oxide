import { z } from "zod"

// --- TokenConfig (boundary input for theme token setup) ---
export const TokenConfigSchema = z.object({
  vars: z.record(z.string(), z.string()).optional(),
  selector: z.string().optional(),
})
export type TokenConfigValidated = z.infer<typeof TokenConfigSchema>

// --- LiveTokenUpdate (boundary input for runtime token updates) ---
export const LiveTokenUpdateSchema = z.record(z.string(), z.string())
export type LiveTokenUpdateValidated = z.infer<typeof LiveTokenUpdateSchema>

// --- DesignTokens (recursive nested tokens) ---
export const DesignTokensSchema: z.ZodType<
  Record<string, string | number | Record<string, unknown>>
> = z.record(z.string(), z.union([z.string(), z.number(), z.lazy(() => DesignTokensSchema)]))
export type DesignTokensValidated = z.infer<typeof DesignTokensSchema>

// --- Validation helpers ---
export function validateTokenConfig(input: unknown): TokenConfigValidated {
  return TokenConfigSchema.parse(input)
}

export function validateLiveTokenUpdate(input: unknown): LiveTokenUpdateValidated {
  return LiveTokenUpdateSchema.parse(input)
}
