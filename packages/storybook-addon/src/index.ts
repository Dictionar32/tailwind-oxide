/**
 * tailwind-styled-v4 — Storybook Addon
 *
 * Integrasi Storybook untuk komponen tw().
 * Fitur:
 *   - withTailwindStyled decorator: inject className ke story
 *   - generateArgTypes: auto-generate controls dari ComponentConfig
 *   - enumerateVariantProps: buat semua kombinasi variant untuk testing
 */

import type { VariantMatrix } from "@tailwind-styled/shared"
export type { VariantMatrix } from "@tailwind-styled/shared"

export interface ComponentConfig {
  base?: string
  variants?: Record<string, Record<string, string>>
  defaultVariants?: Record<string, string>
  compoundVariants?: Array<{ class: string; [key: string]: string }>
}

// ─── Variant enumeration (core utility) ──────────────────────────────────────

/**
 * Enumerate semua kombinasi variant dari matrix.
 *
 * @example
 * enumerateVariantProps({ size: ['sm','lg'], intent: ['primary','danger'] })
 * // → [{ size:'sm', intent:'primary' }, { size:'sm', intent:'danger' }, ...]
 */
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

// ─── Storybook argTypes generator ─────────────────────────────────────────────

/**
 * Generate Storybook argTypes dari ComponentConfig.
 * Otomatis membuat kontrol dropdown untuk setiap variant.
 */
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

// ─── Storybook decorator ───────────────────────────────────────────────────────

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

// ─── Story template helpers ────────────────────────────────────────────────────

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

