import { z } from "zod"

// --- VitePluginOptions (boundary input for tailwindStyledPlugin) ---
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
  // Deprecated fields
  mode: z.enum(["zero-runtime", "runtime"]).optional(),
  routeCss: z.boolean().optional(),
  deadStyleElimination: z.boolean().optional(),
  addDataAttr: z.boolean().optional(),
  autoClientBoundary: z.boolean().optional(),
  hoist: z.boolean().optional(),
  incremental: z.boolean().optional(),
})
export type VitePluginOptionsValidated = z.infer<typeof VitePluginOptionsSchema>

// --- Validation helper ---
export function validateVitePluginOptions(input: unknown): VitePluginOptionsValidated {
  return VitePluginOptionsSchema.parse(input)
}
