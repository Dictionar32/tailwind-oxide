import { z } from "zod"

// --- RspackPluginOptions (boundary input for tailwindStyledRspackPlugin) ---
export const RspackPluginOptionsSchema = z.object({
  include: z.instanceof(RegExp).optional(),
  exclude: z.instanceof(RegExp).optional(),
  addDataAttr: z.boolean().optional(),
  analyze: z.boolean().optional(),
})
export type RspackPluginOptionsValidated = z.infer<typeof RspackPluginOptionsSchema>

// --- NativeBindingResultSchema (for rspack native binary boundary) ---
const RawObj = z.object({ raw: z.string().optional() })
const ParseFn = z.function({ input: [z.string()], output: z.array(RawObj) })
const ExtractFn = z.function({ input: [z.string()], output: z.union([z.array(z.string()), z.null()]) })

export const NativeBindingResultSchema = z.object({
  parse_classes: ParseFn.optional(),
  parseClasses: ParseFn.optional(),
  extractClassesFromSource: ExtractFn.optional(),
}).passthrough()
export type NativeBindingResultValidated = z.infer<typeof NativeBindingResultSchema>

// --- Validation helpers ---
export function validateRspackPluginOptions(input: unknown): RspackPluginOptionsValidated {
  return RspackPluginOptionsSchema.parse(input)
}
