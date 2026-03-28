/**
 * tailwind-styled-v4 v2 — cv()
 *
 * UPGRADE #3: cv() now infers exact variant values from config.
 *
 * Standalone class variant function — no React needed.
 * Compatible with shadcn/ui, Radix, Headless UI.
 *
 * @example
 * const button = cv({
 *   base: "px-4 py-2 rounded-lg",
 *   variants: { size: { sm: "text-sm", lg: "text-lg" } },
 *   defaultVariants: { size: "sm" }
 * })
 *
 * // BEFORE: button({ size: "xl" }) — no error (size was string)
 * // AFTER:  button({ size: "xl" }) — TypeScript ERROR: "xl" not in "sm" | "lg" ✓
 *
 * button({ size: "lg" }) → "px-4 py-2 rounded-lg text-lg"
 */

import { twMerge } from "tailwind-merge"
import type { ComponentConfig, CvFn, InferVariantProps } from "./types"

export function cv<C extends ComponentConfig>(config: C): CvFn<C> {
  const { base = "", variants = {}, compoundVariants = [], defaultVariants = {} } = config

  return (
    props: InferVariantProps<C> & { className?: string } & Readonly<Record<string, unknown>> = {} as never
  ): string => {
    const classes = [base]

    // Process single-value variants
    for (const key in variants) {
      const val = (props as Record<string, unknown>)[key] ?? defaultVariants[key]
      if (val !== undefined && (variants as Record<string, Record<string, string>>)[key]?.[String(val)]) {
        classes.push((variants as Record<string, Record<string, string>>)[key]![String(val)])
      }
    }

    // Process compound variants
    for (const compound of compoundVariants) {
      const { class: cls, ...conditions } = compound
      const match = Object.entries(conditions).every(([k, v]) => (props as Record<string, unknown>)[k] === v)
      if (match) classes.push(cls)
    }

    if (props.className) classes.push(props.className)

    return twMerge(...classes)
  }
}
