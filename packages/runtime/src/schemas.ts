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

export const SubComponentDefSchema = z.object({
  tag: z.string().optional(),
  class: z.string(),
})

export type SubComponentDefInput = z.infer<typeof SubComponentDefSchema>

export const ComponentMetadataSchema = z.object({
  component: z.string(),
  tag: z.string(),
  baseClass: z.string(),
  subComponents: z.record(z.string(), SubComponentDefSchema),
})

export type ComponentMetadataInput = z.infer<typeof ComponentMetadataSchema>

export const ConditionalPropsSchema = z.record(z.string(), z.string())

export type ConditionalPropsInput = z.infer<typeof ConditionalPropsSchema>

export const parseSubComponentDef = (data: unknown) =>
  parseWithSchema(SubComponentDefSchema, data, "sub-component definition is invalid")

export const parseComponentMetadata = (data: unknown) =>
  parseWithSchema(ComponentMetadataSchema, data, "component metadata is invalid")
