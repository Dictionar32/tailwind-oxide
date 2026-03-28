const REGISTRY = new Map<string, AtomicRule>()

export interface AtomicRule {
  twClass: string
  atomicName: string
  property: string
  value: string
  modifier?: string
}

const TW_PROPERTY_MAP: Record<string, { prop: string; transform?: (val: string) => string }> = {
  p: { prop: "padding", transform: (v) => `${Number(v) * 0.25}rem` },
  px: { prop: "padding-inline", transform: (v) => `${Number(v) * 0.25}rem` },
  py: { prop: "padding-block", transform: (v) => `${Number(v) * 0.25}rem` },
  pt: { prop: "padding-top", transform: (v) => `${Number(v) * 0.25}rem` },
  pb: { prop: "padding-bottom", transform: (v) => `${Number(v) * 0.25}rem` },
  pl: { prop: "padding-left", transform: (v) => `${Number(v) * 0.25}rem` },
  pr: { prop: "padding-right", transform: (v) => `${Number(v) * 0.25}rem` },
  m: { prop: "margin", transform: (v) => `${Number(v) * 0.25}rem` },
  mx: { prop: "margin-inline", transform: (v) => `${Number(v) * 0.25}rem` },
  my: { prop: "margin-block", transform: (v) => `${Number(v) * 0.25}rem` },
  mt: { prop: "margin-top", transform: (v) => `${Number(v) * 0.25}rem` },
  mb: { prop: "margin-bottom", transform: (v) => `${Number(v) * 0.25}rem` },
  ml: { prop: "margin-left", transform: (v) => `${Number(v) * 0.25}rem` },
  mr: { prop: "margin-right", transform: (v) => `${Number(v) * 0.25}rem` },
  gap: { prop: "gap", transform: (v) => `${Number(v) * 0.25}rem` },
  w: { prop: "width", transform: sizeValue },
  h: { prop: "height", transform: sizeValue },
  text: { prop: "font-size", transform: textSize },
  font: { prop: "font-weight", transform: fontWeight },
  leading: { prop: "line-height", transform: leadingValue },
  opacity: { prop: "opacity", transform: (v) => String(Number(v) / 100) },
  z: { prop: "z-index" },
  rounded: { prop: "border-radius", transform: (v) => roundedValue(v) },
}

function sizeValue(v: string): string {
  const num = Number(v)
  if (!Number.isNaN(num)) return `${num * 0.25}rem`
  const special: Record<string, string> = {
    full: "100%",
    screen: "100vw",
    auto: "auto",
    min: "min-content",
    max: "max-content",
    fit: "fit-content",
    svw: "100svw",
    svh: "100svh",
  }
  return special[v] ?? v
}

function textSize(v: string): string {
  const map: Record<string, string> = {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
    "7xl": "4.5rem",
    "8xl": "6rem",
    "9xl": "8rem",
  }
  return map[v] ?? v
}

function fontWeight(v: string): string {
  const map: Record<string, string> = {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  }
  return map[v] ?? v
}

function leadingValue(v: string): string {
  const map: Record<string, string> = {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  }
  return map[v] ?? v
}

function roundedValue(v: string): string {
  const map: Record<string, string> = {
    "": "0.25rem",
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
    none: "0",
  }
  return map[v] ?? `${v}rem`
}

function sanitizeClassName(cls: string): string {
  return cls.replace(/[/:[\].!%]/g, "_")
}

export function parseAtomicClass(twClass: string): AtomicRule | null {
  if (REGISTRY.has(twClass)) return REGISTRY.get(twClass)!

  const colonIdx = twClass.lastIndexOf(":")
  const modifier = colonIdx > -1 ? twClass.slice(0, colonIdx) : undefined
  const base = colonIdx > -1 ? twClass.slice(colonIdx + 1) : twClass

  const dashIdx = base.indexOf("-")
  if (dashIdx === -1) return null

  const prefix = base.slice(0, dashIdx)
  const value = base.slice(dashIdx + 1)

  const mapping = TW_PROPERTY_MAP[prefix]
  if (!mapping) return null

  const cssValue = mapping.transform ? mapping.transform(value) : value
  const atomicName = `_tw_${sanitizeClassName(twClass)}`

  const rule: AtomicRule = {
    twClass,
    atomicName,
    property: mapping.prop,
    value: cssValue,
    modifier,
  }

  REGISTRY.set(twClass, rule)
  return rule
}

export function generateAtomicCss(rules: AtomicRule[]): string {
  const lines: string[] = []

  for (const rule of rules) {
    const selector = `.${rule.atomicName}`

    if (rule.modifier) {
      const breakpoints: Record<string, string> = {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      }
      if (breakpoints[rule.modifier]) {
        lines.push(
          `@media (min-width: ${breakpoints[rule.modifier]}) {`,
          `  ${selector} { ${rule.property}: ${rule.value}; }`,
          `}`
        )
        continue
      }
      lines.push(`${selector}:${rule.modifier} { ${rule.property}: ${rule.value}; }`)
    } else {
      lines.push(`${selector} { ${rule.property}: ${rule.value}; }`)
    }
  }

  return lines.join("\n")
}

export function toAtomicClasses(twClasses: string): {
  atomicClasses: string
  rules: AtomicRule[]
  unknownClasses: string[]
} {
  const parts = twClasses.split(/\s+/).filter(Boolean)
  const atomicNames: string[] = []
  const rules: AtomicRule[] = []
  const unknownClasses: string[] = []

  for (const cls of parts) {
    const rule = parseAtomicClass(cls)
    if (rule) {
      atomicNames.push(rule.atomicName)
      rules.push(rule)
    } else {
      unknownClasses.push(cls)
      atomicNames.push(cls)
    }
  }

  return {
    atomicClasses: atomicNames.join(" "),
    rules,
    unknownClasses,
  }
}

export function getAtomicRegistry(): Map<string, AtomicRule> {
  return REGISTRY
}

export function clearAtomicRegistry(): void {
  REGISTRY.clear()
}
