/**
 * tailwind-styled-v4 — Style Registry
 */

export type CssLayer = "tokens" | "base" | "components" | "variants" | "utilities"

export interface StyleEntry {
  twClass: string
  atomicClass: string
  declaration: string
  modifier?: string
  layer: CssLayer
  refCount: number
}

export interface RegistryStats {
  totalEntries: number
  totalRefCount: number
  layerCounts: Record<CssLayer, number>
  estimatedCssKb: number
}

const _BASE36_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz"

const fnv1a = (str: string): number => {
  return str
    .split("")
    .reduce((hash, char) => ((hash ^ char.charCodeAt(0)) * 16777619) >>> 0, 2166136261)
}

const toBase36 = (n: number, length = 4): string => {
  return n.toString(36).padStart(length, "0").slice(-length)
}

export const generateAtomicClass = (declaration: string, modifier?: string): string => {
  const key = modifier ? `${declaration}::${modifier}` : declaration
  return `tw-${toBase36(fnv1a(key))}`
}

export class StyleRegistry {
  private entries = new Map<string, StyleEntry>()
  private twClassMap = new Map<string, string>()
  private atomicToEntry = new Map<string, StyleEntry>()

  register(
    twClass: string,
    declaration: string,
    modifier?: string,
    layer: CssLayer = "utilities"
  ): string {
    const key = modifier ? `${declaration}::${modifier}` : declaration

    if (this.entries.has(key)) {
      const entry = this.entries.get(key)!
      entry.refCount++
      return entry.atomicClass
    }

    const atomicClass = generateAtomicClass(declaration, modifier)
    const entry: StyleEntry = {
      twClass,
      atomicClass,
      declaration,
      modifier,
      layer,
      refCount: 1,
    }

    this.entries.set(key, entry)
    this.twClassMap.set(twClass, atomicClass)
    this.atomicToEntry.set(atomicClass, entry)

    return atomicClass
  }

  registerClasses(twClasses: string, layer: CssLayer = "utilities"): string {
    const parts = twClasses.split(/\s+/).filter(Boolean)
    const atomicClasses = parts.map((cls) => {
      const colonIdx = cls.lastIndexOf(":")
      if (colonIdx > 0) {
        const mod = cls.slice(0, colonIdx)
        const base = cls.slice(colonIdx + 1)
        const decl = this.twToDeclaration(base)
        if (decl) {
          return this.register(cls, decl, this.modifierToSelector(mod), layer)
        }
        return cls
      }
      const decl = this.twToDeclaration(cls)
      if (decl) return this.register(cls, decl, undefined, layer)
      return cls
    })

    return atomicClasses.join(" ")
  }

  generateCss(opts: { minify?: boolean; includeComments?: boolean } = {}): string {
    const { minify = false, includeComments = !minify } = opts

    const layerOrder: CssLayer[] = ["tokens", "base", "components", "variants", "utilities"]
    const sections: string[] = []

    for (const layer of layerOrder) {
      const layerEntries = Array.from(this.entries.values()).filter((e) => e.layer === layer)

      if (layerEntries.length === 0) continue

      if (includeComments) {
        sections.push(`/* ── ${layer} ── */`)
      }

      const regular = layerEntries.filter((e) => !e.modifier || !e.modifier.startsWith("@"))
      const atRules = layerEntries.filter((e) => e.modifier?.startsWith("@"))
      const pseudo = layerEntries.filter((e) => e.modifier && !e.modifier.startsWith("@"))

      for (const entry of regular) {
        sections.push(this.entryToCss(entry, minify))
      }

      for (const entry of pseudo) {
        sections.push(this.entryToCss(entry, minify))
      }

      const mediaGroups = new Map<string, StyleEntry[]>()
      for (const entry of atRules) {
        const key = entry.modifier!
        if (!mediaGroups.has(key)) mediaGroups.set(key, [])
        mediaGroups.get(key)!.push(entry)
      }

      for (const [query, entries] of mediaGroups) {
        const inner = entries.map((e) => this.entryToCss(e, minify, "  ")).join(minify ? "" : "\n")
        sections.push(`${query} {\n${inner}\n}`)
      }
    }

    return sections.join(minify ? "" : "\n\n")
  }

  private entryToCss(entry: StyleEntry, minify: boolean, indent = ""): string {
    const selector =
      entry.modifier && !entry.modifier.startsWith("@")
        ? `.${entry.atomicClass}${entry.modifier}`
        : `.${entry.atomicClass}`

    if (minify) return `${selector}{${entry.declaration}}`
    return `${indent}${selector} { ${entry.declaration} }`
  }

  getAtomicClass(twClass: string): string | undefined {
    return this.twClassMap.get(twClass)
  }

  getEntry(atomicClass: string): StyleEntry | undefined {
    return this.atomicToEntry.get(atomicClass)
  }

  getAllEntries(): StyleEntry[] {
    return Array.from(this.entries.values())
  }

  stats(): RegistryStats {
    const counts: Record<CssLayer, number> = {
      tokens: 0,
      base: 0,
      components: 0,
      variants: 0,
      utilities: 0,
    }
    const entriesArray = Array.from(this.entries.values())
    const totalRef = entriesArray.reduce((sum, e) => sum + e.refCount, 0)
    for (const e of entriesArray) {
      counts[e.layer]++
    }
    return {
      totalEntries: this.entries.size,
      totalRefCount: totalRef,
      layerCounts: counts,
      estimatedCssKb: this.entries.size * 0.04,
    }
  }

  clear(): void {
    this.entries.clear()
    this.twClassMap.clear()
    this.atomicToEntry.clear()
  }

  private modifierToSelector(mod: string): string {
    const pseudo: Record<string, string> = {
      hover: ":hover",
      focus: ":focus",
      "focus-visible": ":focus-visible",
      active: ":active",
      disabled: ":disabled",
      visited: ":visited",
      checked: ":checked",
      placeholder: "::placeholder",
      before: "::before",
      after: "::after",
      first: ":first-child",
      last: ":last-child",
      odd: ":nth-child(odd)",
      even: ":nth-child(even)",
    }

    const responsive: Record<string, string> = {
      sm: "@media (min-width: 640px)",
      md: "@media (min-width: 768px)",
      lg: "@media (min-width: 1024px)",
      xl: "@media (min-width: 1280px)",
      "2xl": "@media (min-width: 1536px)",
    }

    return pseudo[mod] ?? responsive[mod] ?? `:${mod}`
  }

  private twToDeclaration(cls: string): string | null {
    // Spacing
    const spacingRe = /^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-(\d+(?:\.\d+)?)$/
    const sMatch = cls.match(spacingRe)
    if (sMatch) {
      const [, prefix, val] = sMatch
      const props: Record<string, string> = {
        p: "padding",
        px: "padding-inline",
        py: "padding-block",
        pt: "padding-top",
        pb: "padding-bottom",
        pl: "padding-left",
        pr: "padding-right",
        m: "margin",
        mx: "margin-inline",
        my: "margin-block",
        mt: "margin-top",
        mb: "margin-bottom",
        ml: "margin-left",
        mr: "margin-right",
        gap: "gap",
      }
      return `${props[prefix]}: ${parseFloat(val) * 0.25}rem`
    }

    // Opacity
    const opacityMatch = cls.match(/^opacity-(\d+)$/)
    if (opacityMatch) return `opacity: ${parseInt(opacityMatch[1], 10) / 100}`

    // Z-index
    const zMatch = cls.match(/^z-(\d+)$/)
    if (zMatch) return `z-index: ${zMatch[1]}`

    // Display
    const display: Record<string, string> = {
      block: "display: block",
      "inline-block": "display: inline-block",
      flex: "display: flex",
      "inline-flex": "display: inline-flex",
      grid: "display: grid",
      hidden: "display: none",
      table: "display: table",
    }
    if (display[cls]) return display[cls]

    // Flex
    const flex: Record<string, string> = {
      "flex-row": "flex-direction: row",
      "flex-col": "flex-direction: column",
      "flex-wrap": "flex-wrap: wrap",
      "flex-nowrap": "flex-wrap: nowrap",
      "flex-1": "flex: 1 1 0%",
      "flex-auto": "flex: 1 1 auto",
      "flex-none": "flex: none",
      "items-center": "align-items: center",
      "items-start": "align-items: flex-start",
      "items-end": "align-items: flex-end",
      "items-stretch": "align-items: stretch",
      "justify-center": "justify-content: center",
      "justify-start": "justify-content: flex-start",
      "justify-end": "justify-content: flex-end",
      "justify-between": "justify-content: space-between",
      "justify-around": "justify-content: space-around",
      "justify-evenly": "justify-content: space-evenly",
    }
    if (flex[cls]) return flex[cls]

    // Position
    const pos: Record<string, string> = {
      relative: "position: relative",
      absolute: "position: absolute",
      fixed: "position: fixed",
      sticky: "position: sticky",
      static: "position: static",
      "inset-0": "inset: 0",
      "inset-x-0": "inset-inline: 0",
      "inset-y-0": "inset-block: 0",
    }
    if (pos[cls]) return pos[cls]

    // Width/Height
    const wMatch = cls.match(/^w-(.+)$/)
    if (wMatch) return `width: ${sizeVal(wMatch[1])}`
    const hMatch = cls.match(/^h-(.+)$/)
    if (hMatch) return `height: ${sizeVal(hMatch[1])}`

    // Border radius
    const rrMap: Record<string, string> = {
      "rounded-none": "border-radius: 0",
      "rounded-sm": "border-radius: 0.125rem",
      rounded: "border-radius: 0.25rem",
      "rounded-md": "border-radius: 0.375rem",
      "rounded-lg": "border-radius: 0.5rem",
      "rounded-xl": "border-radius: 0.75rem",
      "rounded-2xl": "border-radius: 1rem",
      "rounded-3xl": "border-radius: 1.5rem",
      "rounded-full": "border-radius: 9999px",
    }
    if (rrMap[cls]) return rrMap[cls]

    return null
  }
}

const sizeVal = (v: string): string => {
  const num = parseFloat(v)
  if (!Number.isNaN(num)) return `${num * 0.25}rem`
  const special: Record<string, string> = {
    full: "100%",
    screen: "100vw",
    svh: "100svh",
    svw: "100svw",
    auto: "auto",
    min: "min-content",
    max: "max-content",
    fit: "fit-content",
  }
  return special[v] ?? v
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────────

const createStyleRegistry = () => {
  const registryState: { current: StyleRegistry | null } = {
    current: null,
  }

  return {
    get: (): StyleRegistry => {
      if (!registryState.current) registryState.current = new StyleRegistry()
      return registryState.current
    },
    reset: (): void => {
      registryState.current = new StyleRegistry()
    },
  }
}

// Module-level singleton via factory
const registryFactory = createStyleRegistry()

export const getStyleRegistry = registryFactory.get
export const resetStyleRegistry = registryFactory.reset
