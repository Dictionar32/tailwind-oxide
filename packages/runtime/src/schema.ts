import { z } from "zod"

// --- SubComponentDef ---
export const SubComponentDefSchema = z.object({
  tag: z.string().optional(),
  class: z.string().min(1, "subComponent class tidak boleh kosong"),
})
export type SubComponentDefValidated = z.infer<typeof SubComponentDefSchema>

// --- ComponentMetadata (compiler-generated, validated at runtime boundary) ---
export const ComponentMetadataSchema = z.object({
  component: z.string().min(1, "component name tidak boleh kosong"),
  tag: z.string().min(1, "tag tidak boleh kosong"),
  baseClass: z.string(),
  subComponents: z.record(z.string(), SubComponentDefSchema).optional(),
})
export type ComponentMetadataValidated = z.infer<typeof ComponentMetadataSchema>

// --- RuntimeConfig (boundary input for runtime component creation) ---
export const RuntimeConfigSchema = z.object({
  tag: z.string().optional(),
  baseClass: z.string(),
  subComponents: z.record(z.string(), SubComponentDefSchema).optional(),
  conditionals: z.record(z.string(), z.string()).optional(),
})
export type RuntimeConfigValidated = z.infer<typeof RuntimeConfigSchema>

// --- Validation helpers ---
export function validateRuntimeConfig(input: unknown): RuntimeConfigValidated {
  return RuntimeConfigSchema.parse(input)
}

export function validateComponentMetadata(input: unknown): ComponentMetadataValidated {
  return ComponentMetadataSchema.parse(input)
}
