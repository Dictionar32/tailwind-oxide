import { twMerge } from "./merge"

export interface StyledOptions {
  base?: string
  variants?: Record<string, Record<string, string>>
  defaultVariants?: Record<string, string>
  compoundVariants?: Array<{
    variants: Record<string, string>
    className: string
  }>
}

export type StyledProps = {
  className?: string
} & Record<string, string | number | boolean | undefined>

function resolveVariantClass(options: StyledOptions, props: StyledProps): string[] {
  const out: string[] = []
  const variants = options.variants ?? {}
  const defaults = options.defaultVariants ?? {}

  for (const [variantName, valueMap] of Object.entries(variants)) {
    const value = props[variantName] ?? defaults[variantName]
    if (value === undefined) continue

    const key = String(value)
    const cls = valueMap[key]
    if (cls) out.push(cls)
  }

  for (const compound of options.compoundVariants ?? []) {
    const matches = Object.entries(compound.variants).every(([k, expected]) => {
      const current = props[k] ?? defaults[k]
      return String(current) === expected
    })

    if (matches) out.push(compound.className)
  }

  return out
}

export function resolveStyledClassName(options: StyledOptions, props: StyledProps = {}): string {
  const parts = [options.base ?? "", ...resolveVariantClass(options, props), props.className ?? ""]
  return twMerge(...parts)
}

export function styled(options: StyledOptions) {
  return function getClassName(props: StyledProps = {}): string {
    return resolveStyledClassName(options, props)
  }
}
