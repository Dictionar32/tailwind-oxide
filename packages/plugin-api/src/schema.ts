import { z } from "zod"

// --- Design Tokens (recursive) ---
export const DesignTokensSchema: z.ZodType<Record<string, string | number | Record<string, unknown>>> = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.lazy(() => DesignTokensSchema)])
)

// --- TwClassResult ---
export const TwClassResultSchema = z.object({
  css: z.string(),
  classes: z.array(z.string()),
})
export type TwClassResultValidated = z.infer<typeof TwClassResultSchema>

// --- TwPluginOptions (boundary input for plugin creation) ---
export const TwPluginOptionsSchema = z.object({
  classProcessor: z.function({ input: [z.array(z.string())], output: TwClassResultSchema }).optional(),
  tokens: DesignTokensSchema.optional(),
  debug: z.boolean().optional(),
  minify: z.boolean().optional(),
})
export type TwPluginOptionsValidated = z.infer<typeof TwPluginOptionsSchema>

// --- ComponentConfig (compiler-generated, validated at plugin boundary) ---
export const ComponentConfigSchema = z.object({
  base: z.string(),
  variants: z.record(z.string(), z.record(z.string(), z.string())),
  compoundVariants: z.array(z.object({
    class: z.string(),
  }).catchall(z.string())),
  defaultVariants: z.record(z.string(), z.string()),
})
export type ComponentConfigValidated = z.infer<typeof ComponentConfigSchema>

// --- TransformContext ---
export const TransformContextSchema = z.object({
  filename: z.string().optional(),
  componentName: z.string().optional(),
  tag: z.string().optional(),
})
export type TransformContextValidated = z.infer<typeof TransformContextSchema>

// --- TransformMeta ---
export const TransformMetaSchema = z.object({
  componentName: z.string(),
  tag: z.string(),
})
export type TransformMetaValidated = z.infer<typeof TransformMetaSchema>

// --- TokenEngineAPI (runtime boundary for token engine bridge) ---
const StringOrUndefined = z.union([z.string(), z.undefined()])
const RecordOrUndefined = z.union([z.record(z.string(), z.string()), z.undefined()])
const SubscribeCallback = z.function({ input: [z.record(z.string(), z.string())], output: z.void() })

export const TokenEngineAPISchema = z.object({
  getToken: z.function({ input: [z.string()], output: StringOrUndefined }).optional(),
  getTokens: z.function({ input: [], output: RecordOrUndefined }).optional(),
  subscribeTokens: z.function({ input: [SubscribeCallback], output: z.function() }).optional(),
  subscribe: z.function({ input: [SubscribeCallback], output: z.function() }).optional(),
})
export type TokenEngineAPIValidated = z.infer<typeof TokenEngineAPISchema>

// --- TwGlobalRegistry (validated at global registration boundary) ---
const TransformFn = z.function({ input: [ComponentConfigSchema, TransformContextSchema], output: ComponentConfigSchema })

export const TwGlobalRegistrySchema = z.object({
  transforms: z.array(TransformFn),
  tokens: z.record(z.string(), z.string()),
})
export type TwGlobalRegistryValidated = z.infer<typeof TwGlobalRegistrySchema>

// --- Plugin manifest (for plugin registration validation) ---
export const PluginManifestSchema = z.object({
  name: z.string().min(1, "plugin name tidak boleh kosong"),
  version: z.string().optional(),
  description: z.string().optional(),
})
export type PluginManifestValidated = z.infer<typeof PluginManifestSchema>

// --- Validation helpers ---
export function validateTwPluginOptions(input: unknown): TwPluginOptionsValidated {
  return TwPluginOptionsSchema.parse(input)
}

export function validateComponentConfig(input: unknown): ComponentConfigValidated {
  return ComponentConfigSchema.parse(input)
}

export function validatePluginManifest(input: unknown): PluginManifestValidated {
  return PluginManifestSchema.parse(input)
}
