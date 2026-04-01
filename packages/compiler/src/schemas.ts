import { z } from "zod"

export const NativeRscResultSchema = z.object({
  isServer: z.boolean(),
  needsClientDirective: z.boolean(),
  clientReasons: z.array(z.string()).default([]),
})

export const SubComponentMetadataSchema = z.object({
  tag: z.string().optional(),
  class: z.string(),
})

export const ComponentMetadataSchema = z.object({
  component: z.string(),
  tag: z.string(),
  baseClass: z.string(),
  subComponents: z.record(z.string(), SubComponentMetadataSchema),
})

export const ComponentMetadataListSchema = z.array(ComponentMetadataSchema)
export const SafelistSchema = z.array(z.string())

export type NativeRscResult = z.infer<typeof NativeRscResultSchema>
export type ComponentMetadata = z.infer<typeof ComponentMetadataSchema>

const parseJsonWithSchema = <TSchema extends z.ZodTypeAny>(
  raw: string,
  schema: TSchema
): z.infer<TSchema> | undefined => {
  try {
    const parsed = JSON.parse(raw) as unknown
    const result = schema.safeParse(parsed)
    return result.success ? result.data : undefined
  } catch {
    return undefined
  }
}

export const parseNativeRscJson = (raw: string): NativeRscResult | undefined => {
  return parseJsonWithSchema(raw, NativeRscResultSchema)
}

export const parseComponentMetadataJson = (raw: string): ComponentMetadata[] | undefined => {
  return parseJsonWithSchema(raw, ComponentMetadataListSchema)
}

export const parseSafelistJson = (raw: string): string[] | undefined => {
  return parseJsonWithSchema(raw, SafelistSchema)
}

// --- TransformOptions (compiler boundary input) ---
export const TransformOptionsSchema = z.object({
  mode: z.literal("zero-runtime").optional(),
  autoClientBoundary: z.boolean().optional(),
  addDataAttr: z.boolean().optional(),
  hoist: z.boolean().optional(),
  filename: z.string().optional(),
  preserveImports: z.boolean().optional(),
  deadStyleElimination: z.boolean().optional(),
})
export type TransformOptionsValidated = z.infer<typeof TransformOptionsSchema>

// --- TransformResult (compiler boundary output) ---
export const TransformResultSchema = z.object({
  code: z.string(),
  classes: z.array(z.string()),
  rsc: z
    .object({
      isServer: z.boolean(),
      needsClientDirective: z.boolean(),
      clientReasons: z.array(z.string()),
    })
    .optional(),
  changed: z.boolean(),
})
export type TransformResultValidated = z.infer<typeof TransformResultSchema>

// --- CssCompileResult ---
export const CssCompileResultSchema = z.object({
  css: z.string(),
  resolvedClasses: z.array(z.string()),
  unknownClasses: z.array(z.string()),
  sizeBytes: z.number().int().min(0),
  engine: z.enum(["rust"]),
})
export type CssCompileResultValidated = z.infer<typeof CssCompileResultSchema>

// --- LoaderOptions (extends TransformOptions) ---
export const LoaderOptionsSchema = TransformOptionsSchema.extend({
  routeCss: z.boolean().optional(),
  incremental: z.boolean().optional(),
  verbose: z.boolean().optional(),
})
export type LoaderOptionsValidated = z.infer<typeof LoaderOptionsSchema>

// --- CompileInput (boundary input for compilation) ---
export const CompileInputSchema = z.object({
  filepath: z.string().min(1, "filepath tidak boleh kosong"),
  source: z.string(),
  options: TransformOptionsSchema,
})
export type CompileInputValidated = z.infer<typeof CompileInputSchema>

// --- CoreCompileResult ---
export const CoreCompileResultSchema = z.object({
  result: TransformResultSchema,
  engine: z.enum(["none", "native", "js"]),
  cacheHit: z.boolean(),
  metadata: ComponentMetadataSchema.optional(),
  css: z.string().optional(),
})
export type CoreCompileResultValidated = z.infer<typeof CoreCompileResultSchema>

// --- Validation helpers ---
export function validateTransformOptions(input: unknown): TransformOptionsValidated {
  return TransformOptionsSchema.parse(input)
}

export function validateCompileInput(input: unknown): CompileInputValidated {
  return CompileInputSchema.parse(input)
}
