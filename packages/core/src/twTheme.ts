/**
 * tailwind-styled-v4 v2 — twTheme
 *
 * UPGRADE #1: Tailwind v4 CSS Variables integration.
 *
 * Tailwind v4 uses @theme inline to expose design tokens as CSS custom properties:
 *   @theme inline {
 *     --color-background: var(--background);
 *     --color-foreground: var(--foreground);
 *     --font-sans: var(--font-geist-sans);
 *   }
 *
 * This module bridges tw() syntax with those CSS variables — zero config,
 * full IDE support, type-safe design tokens.
 *
 * @example
 * // Without twTheme (verbose, error-prone)
 * const Box = tw.div`bg-[var(--color-background)] text-[var(--color-foreground)]`
 *
 * // With twTheme (clean, type-safe)
 * const Box = tw.div`${t.bg("color-background")} ${t.text("color-foreground")}`
 *
 * // Or with createTheme for full project-level token map
 * const theme = createTheme({
 *   colors: { bg: "color-background", fg: "color-foreground", primary: "color-primary" },
 *   fonts:  { sans: "font-sans", mono: "font-mono" },
 * })
 * const Box = tw.div`bg-${theme.colors.bg} text-${theme.colors.fg}`
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core helper — CSS variable reference
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reference a CSS custom property in Tailwind v4 arbitrary value syntax.
 *
 * @example
 * cssVar("color-background")         → "var(--color-background)"
 * cssVar("color-primary", "#3b82f6") → "var(--color-primary, #3b82f6)"
 */
export function cssVar(varName: string, fallback?: string): string {
  const name = varName.startsWith("--") ? varName : `--${varName}`
  return fallback ? `var(${name}, ${fallback})` : `var(${name})`
}

/**
 * Generate a Tailwind v4 arbitrary value that references a CSS variable.
 *
 * @example
 * twVar("bg", "color-background")   → "bg-[var(--color-background)]"
 * twVar("text", "color-foreground") → "text-[var(--color-foreground)]"
 * twVar("border", "color-border", "#e5e7eb") → "border-[var(--color-border,#e5e7eb)]"
 */
export function twVar(property: string, varName: string, fallback?: string): string {
  const ref = fallback ? `var(--${varName},${fallback})` : `var(--${varName})`
  return `${property}-[${ref}]`
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience shorthand builders
// ─────────────────────────────────────────────────────────────────────────────

export const t = {
  /** Background color from CSS variable: t.bg("color-primary") → "bg-[var(--color-primary)]" */
  bg: (v: string, fb?: string) => twVar("bg", v, fb),
  /** Text color from CSS variable */
  text: (v: string, fb?: string) => twVar("text", v, fb),
  /** Border color from CSS variable */
  border: (v: string, fb?: string) => twVar("border", v, fb),
  /** Ring color from CSS variable */
  ring: (v: string, fb?: string) => twVar("ring", v, fb),
  /** Outline color from CSS variable */
  outline: (v: string, fb?: string) => twVar("outline", v, fb),
  /** Fill color from CSS variable (SVG) */
  fill: (v: string, fb?: string) => twVar("fill", v, fb),
  /** Stroke color from CSS variable (SVG) */
  stroke: (v: string, fb?: string) => twVar("stroke", v, fb),
  /** Font family from CSS variable */
  font: (v: string, fb?: string) => twVar("font", v, fb),
  /** Shadow from CSS variable */
  shadow: (v: string, fb?: string) => twVar("shadow", v, fb),
  /** Any arbitrary property from CSS variable */
  var: (property: string, v: string, fb?: string) => twVar(property, v, fb),
}

// ─────────────────────────────────────────────────────────────────────────────
// createTheme — project-level design token map
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeTokenMap {
  colors?: Record<string, string>
  fonts?: Record<string, string>
  spacing?: Record<string, string>
  [key: string]: Record<string, string> | undefined
}

export type ResolvedThemeTokens<T extends ThemeTokenMap> = {
  [Group in keyof T]: T[Group] extends Record<string, string>
    ? {
        [Token in keyof T[Group]]: string
      }
    : never
}

/**
 * Create a typed theme token map from your CSS variable names.
 * Returns helper functions that generate Tailwind v4 arbitrary values.
 *
 * @example
 * // Define your tokens (match your globals.css @theme block)
 * const theme = createTheme({
 *   colors: {
 *     bg:       "color-background",
 *     fg:       "color-foreground",
 *     primary:  "color-primary",
 *     muted:    "color-muted",
 *   },
 *   fonts: {
 *     sans: "font-sans",
 *     mono: "font-mono",
 *   },
 * })
 *
 * // Use in tw components
 * const Card = tw.div`
 *   bg-${theme.colors.bg}
 *   text-${theme.colors.fg}
 *   font-${theme.fonts.sans}
 * `
 * // → tw.div`bg-[var(--color-background)] text-[var(--color-foreground)] font-[var(--font-sans)]`
 *
 * // Use in cv()
 * const button = cv({
 *   base: `px-4 py-2 ${theme.colors.bg} ${theme.colors.fg}`,
 *   variants: { ... }
 * })
 */
export function createTheme<T extends ThemeTokenMap>(tokenMap: T): ResolvedThemeTokens<T> {
  const resolved: Record<string, Record<string, string>> = {}

  for (const group in tokenMap) {
    resolved[group] = {}
    const tokens = tokenMap[group]!
    for (const name in tokens) {
      const varName = tokens[name]
      const prefix = getGroupPrefix(group)
      resolved[group][name] = prefix ? twVar(prefix, varName) : cssVar(varName)
    }
  }

  return resolved as ResolvedThemeTokens<T>
}

function getGroupPrefix(group: string): string {
  const map: Record<string, string> = {
    colors: "bg", // default to bg; user can use t.text() for text colors
    fonts: "font",
    spacing: "p",
    shadows: "shadow",
  }
  return map[group] ?? ""
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard Tailwind v4 tokens
//
// Pre-built token references for the default next-app globals.css setup.
// These match what Tailwind v4's @theme inline generates.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-built references for standard Tailwind v4 CSS variable tokens.
 * Works out of the box with next-app-standar-config globals.css.
 *
 * @example
 * import { v4Tokens } from "tailwind-styled-v4"
 *
 * const Page = tw.div`${v4Tokens.bg} ${v4Tokens.text}`
 * // → tw.div`bg-[var(--color-background)] text-[var(--color-foreground)]`
 */
export const v4Tokens = {
  /** bg-[var(--color-background)] */
  bg: twVar("bg", "color-background"),
  /** text-[var(--color-foreground)] */
  text: twVar("text", "color-foreground"),
  /** font-[var(--font-sans)] */
  fontSans: twVar("font", "font-sans"),
  /** font-[var(--font-mono)] */
  fontMono: twVar("font", "font-mono"),
} as const
