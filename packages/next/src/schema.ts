import { z } from "zod"

// --- NextAdapterOptions (boundary input for withTailwindStyled) ---
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
export type NextAdapterOptionsValidated = z.infer<typeof NextAdapterOptionsSchema>

// --- Validation helper ---
export function validateNextAdapterOptions(input: unknown): NextAdapterOptionsValidated {
  return NextAdapterOptionsSchema.parse(input)
}
