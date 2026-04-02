/**
 * tailwind-styled-v4 — Core Types
 */

// ── Shared types (re-exported for backward compatibility) ─────────────────────
import type { HtmlTagName, VariantMatrix, VariantValue } from "@tailwind-styled/shared"
export type { HtmlTagName, VariantProps, VariantValue, VariantMatrix } from "@tailwind-styled/shared"

// ── Variant Types ────────────────────────────────────────────────────────────
export type VariantLiterals = string | number | boolean

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferVariantProps<T = any> = {
  [K in keyof T]?: keyof T[K]
}

// ── Component Config ─────────────────────────────────────────────────────────
export interface ComponentConfig {
  base?: string
  variants?: Record<string, Record<string, string>>
  defaultVariants?: Record<string, string>
  compoundVariants?: Array<{ class: string; [key: string]: string }>
  state?: Record<string, Record<string, string>>
  container?: Record<string, string>
  containerName?: string
}

// ── Container Config ─────────────────────────────────────────────────────────
export interface ContainerConfig {
  base?: string
  queries?: Record<string, string>
  defaultQuery?: string
}

// ── State Config ─────────────────────────────────────────────────────────────
export interface StateConfig {
  base?: string
  states?: Record<string, Record<string, string>>
  defaultStates?: Record<string, boolean>
}

// ── CV (Class Variant) Function ──────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CvFn<C = any> = any

// ── Styled Component Props ───────────────────────────────────────────────────
export interface StyledComponentProps {
  className?: string
  as?: HtmlTagName
  [key: string]: VariantValue
}

// ── Sub Component Map ────────────────────────────────────────────────────────
export type SubComponentMap = Record<string, unknown>

// ── Tw Object ────────────────────────────────────────────────────────────────
export interface TwObject {
  tag: HtmlTagName
  config: ComponentConfig
}

// ── Tw Styled Component ──────────────────────────────────────────────────────
export interface TwStyledComponent<T = string> {
  (props: StyledComponentProps & Record<string, unknown>): unknown
  displayName?: string
  extend?: (strings: TemplateStringsArray) => TwStyledComponent<T>
  withVariants?: (config: Partial<ComponentConfig>) => TwStyledComponent<T>
  [key: string]: any
}

// ── Tw Sub Component ─────────────────────────────────────────────────────────
export interface TwSubComponent<P = unknown> {
  (props: P): unknown
  displayName?: string
}

// ── Tw Tag Factory ───────────────────────────────────────────────────────────
export type TwTagFactory = {
  [K in HtmlTagName]: (config?: ComponentConfig) => TwStyledComponent<K>
}

// ── Tw Tag Factory Any ───────────────────────────────────────────────────────
export type TwTagFactoryAny = {
  [key: string]: (config?: ComponentConfig) => TwStyledComponent
}

// ── Tw Component Factory ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TwComponentFactory<T = any> = any

// ── Tw Server Object ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TwServerObject = any

// ── Storybook utilities ──────────────────────────────────────────────────────
export function enumerateVariantProps(
  matrix: VariantMatrix
): Array<Record<string, string | number | boolean>> {
  const keys = Object.keys(matrix)
  if (keys.length === 0) return [{}]

  const result: Array<Record<string, string | number | boolean>> = []

  function walk(index: number, current: Record<string, string | number | boolean>) {
    if (index >= keys.length) {
      result.push({ ...current })
      return
    }
    const key = keys[index]!
    for (const value of matrix[key] ?? []) {
      current[key] = value
      walk(index + 1, current)
    }
  }

  walk(0, {})
  return result
}

export function generateArgTypes(config: ComponentConfig): Record<string, unknown> {
  if (!config.variants) return {}

  const argTypes: Record<string, unknown> = {}

  for (const [variantKey, variantValues] of Object.entries(config.variants)) {
    const options = Object.keys(variantValues)
    const defaultValue = config.defaultVariants?.[variantKey]

    argTypes[variantKey] = {
      control: { type: "select" },
      options,
      defaultValue,
      description: `Variant: **${variantKey}**`,
      table: {
        type: { summary: options.join(" | ") },
        defaultValue: defaultValue ? { summary: defaultValue } : undefined,
        category: "Variants",
      },
    }
  }

  return argTypes
}

export function generateDefaultArgs(config: ComponentConfig): Record<string, string> {
  return { ...(config.defaultVariants ?? undefined) }
}

export function withTailwindStyled(
  StoryFn: () => unknown,
  context: {
    args?: Record<string, unknown>
    parameters?: { tailwindStyled?: { wrapperClass?: string; padding?: string } }
  }
): unknown {
  const wrapperClass = context.parameters?.tailwindStyled?.wrapperClass ?? ""
  const padding = context.parameters?.tailwindStyled?.padding ?? "p-8"

  if (typeof document !== "undefined") {
    const wrapper = document.createElement("div")
    wrapper.className = [padding, wrapperClass].filter(Boolean).join(" ")
    return wrapper
  }

  return StoryFn()
}

export function createVariantStoryArgs(config: ComponentConfig): {
  combinations: Array<Record<string, string | number | boolean>>
  matrix: VariantMatrix
} {
  if (!config.variants) return { combinations: [{}], matrix: {} }

  const matrix: VariantMatrix = {}
  for (const [key, values] of Object.entries(config.variants)) {
    matrix[key] = Object.keys(values)
  }

  return {
    combinations: enumerateVariantProps(matrix),
    matrix,
  }
}

export function getVariantClass(config: ComponentConfig, props: Record<string, string>): string {
  const classes: string[] = []

  if (config.base) classes.push(config.base)

  if (config.variants) {
    for (const [key, values] of Object.entries(config.variants)) {
      const val = props[key] ?? config.defaultVariants?.[key]
      if (val && values[val]) classes.push(values[val])
    }
  }

  if (config.compoundVariants) {
    for (const compound of config.compoundVariants) {
      const { class: cls, ...conditions } = compound
      if (Object.entries(conditions).every(([k, v]) => props[k] === v)) {
        classes.push(cls)
      }
    }
  }

  return classes.join(" ")
}
