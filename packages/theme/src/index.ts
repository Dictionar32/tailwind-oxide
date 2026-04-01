/**
 * tailwind-styled-v5 — Multi-Theme Engine + Live Token Engine
 *
 * Enterprise-grade theming. Support light/dark/brand themes dengan
 * CSS variables. Zero runtime overhead — themes di-resolve via CSS.
 *
 * Live token engine provides runtime token state management with
 * CSS variable sync to document root.
 *
 * Fitur:
 *  - Multiple named themes (light, dark, brand, high-contrast)
 *  - CSS variable output (Tailwind v4 compatible)
 *  - Theme contract (TypeScript-safe — missing tokens = TS error)
 *  - Per-component theme override
 *  - White-label ready
 *  - Live token engine (runtime token state + CSS sync)
 *
 * @example
 *   // 1. Define contract
 *   const contract = defineThemeContract({
 *     colors: { bg: "", fg: "", primary: "", muted: "" },
 *     font:   { sans: "", mono: "" },
 *   })
 *
 *   // 2. Create themes
 *   const lightTheme = createTheme(contract, "light", {
 *     colors: { bg: "#ffffff", fg: "#09090b", primary: "#3b82f6", muted: "#71717a" },
 *     font:   { sans: "InterVariable, sans-serif", mono: "JetBrains Mono, monospace" },
 *   })
 *
 *   const darkTheme = createTheme(contract, "dark", {
 *     colors: { bg: "#09090b", fg: "#fafafa", primary: "#60a5fa", muted: "#a1a1aa" },
 *     font:   { sans: "InterVariable, sans-serif", mono: "JetBrains Mono, monospace" },
 *   })
 *
 *   // 3. Use tokens in components
 *   const Card = tw.div`bg-[var(--colors-bg)] text-[var(--colors-fg)] p-6`
 *
 *   // 4. Apply in layout
 *   // <html data-theme="dark"> or inject CSS
 */

// ─────────────────────────────────────────────────────────────────────────────
// Live Token Engine exports
// ─────────────────────────────────────────────────────────────────────────────

export type {
  LiveTokenEngineBridge,
  LiveTokenSet,
  TokenMap,
  TokenSubscriber,
} from "./liveTokenEngine"
export {
  applyTokenSet,
  createUseTokens,
  generateTokenCssString,
  getToken,
  getTokens,
  liveToken,
  liveTokenEngine,
  setToken,
  setTokens,
  subscribeTokens,
  tokenRef,
  tokenVar,
} from "./liveTokenEngine"

// ─────────────────────────────────────────────────────────────────────────────
// Theme types
// ─────────────────────────────────────────────────────────────────────────────

import { getNativeThemeBinding } from "./native-bridge"

// ThemeTokenMap untuk theming (grouped tokens seperti { colors: { bg: "#fff" } })
export type ThemeTokenMap = Record<string, Record<string, string>>

export interface ThemeContract<T extends ThemeTokenMap> {
  _contract: T
  _vars: ThemeVars<T>
}

export type ThemeVars<T extends ThemeTokenMap> = {
  [Group in keyof T]: {
    [Token in keyof T[Group]]: string // "var(--group-token)"
  }
}

export interface Theme<T extends ThemeTokenMap> {
  name: string
  contract: ThemeContract<T>
  values: T
  /** CSS string to inject (`:root` or `[data-theme="name"]`) */
  css: string
  /** CSS variables as a flat record */
  vars: Record<string, string>
  /** Apply this theme to an element via data attribute */
  selector: string
}

// ─────────────────────────────────────────────────────────────────────────────
// defineThemeContract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Define the shape of your theme. All themes must satisfy this contract.
 * Returns typed CSS variable references for use in tw components.
 *
 * @example
 * const contract = defineThemeContract({
 *   colors: { bg: "", fg: "", primary: "" },
 *   font: { sans: "" },
 * })
 *
 * // Use in components:
 * const Card = tw.div`bg-[${contract._vars.colors.bg}]`
 * // → tw.div`bg-[var(--colors-bg)]`
 */
export function defineThemeContract<T extends ThemeTokenMap>(shape: T): ThemeContract<T> {
  const buildVars = (): ThemeVars<T> => {
    const result: Record<string, Record<string, string>> = {}
    for (const group in shape) {
      result[group] = {}
      for (const token in shape[group]) {
        result[group][token] = `var(--${group}-${token})`
      }
    }
    return result as ThemeVars<T>
  }

  return { _contract: shape, _vars: buildVars() }
}

// ─────────────────────────────────────────────────────────────────────────────
// createTheme
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a typed theme that satisfies a contract.
 *
 * @param contract - Theme contract from defineThemeContract()
 * @param name - Theme name ("light", "dark", "brand", etc.)
 * @param values - Token values (TypeScript enforces completeness)
 * @param asRoot - If true, use :root selector. Default: false (uses [data-theme])
 */
export function createTheme<T extends ThemeTokenMap>(
  contract: ThemeContract<T>,
  name: string,
  values: T,
  asRoot = false
): Theme<T> {
  // ── Rust fast-path ─────────────────────────────────────────────────────────
  const native = getNativeThemeBinding()
  if (native?.compileTheme) {
    const result = native.compileTheme(JSON.stringify(values), asRoot ? "light" : name, "")
    if (result) {
      const flatVars: Record<string, string> = {}
      for (const token of result.tokens) {
        flatVars[token.cssVar] = token.value
      }
      return { name, contract, values, css: result.css, vars: flatVars, selector: result.selector }
    }
  }

  // ── JS fallback ────────────────────────────────────────────────────────────
  const flatVars: Record<string, string> = {}
  const cssLines: string[] = []

  for (const group in values) {
    for (const token in values[group]) {
      const varName = `--${group}-${token}`
      const value = values[group][token]
      flatVars[varName] = value
      cssLines.push(`  ${varName}: ${value};`)
    }
  }

  const selector = asRoot ? ":root" : `[data-theme="${name}"]`
  const css = `${selector} {\n${cssLines.join("\n")}\n}`

  return { name, contract, values, css, vars: flatVars, selector }
}

// ─────────────────────────────────────────────────────────────────────────────
// ThemeRegistry — manage multiple themes
// ─────────────────────────────────────────────────────────────────────────────

export class ThemeRegistry {
  private themes = new Map<string, Theme<ThemeTokenMap>>()
  private defaultTheme: string | null = null

  /** Register a theme */
  register<T extends ThemeTokenMap>(theme: Theme<T>, isDefault = false): this {
    this.themes.set(theme.name, theme)
    if (isDefault || !this.defaultTheme) {
      this.defaultTheme = theme.name
    }
    return this
  }

  /** Get a theme by name */
  get(name: string): Theme<ThemeTokenMap> | undefined {
    return this.themes.get(name)
  }

  /** Get all theme names */
  names(): string[] {
    return Array.from(this.themes.keys())
  }

  /**
   * Generate combined CSS for all themes.
   * Inject into <head> or a .css file.
   *
   * @example
   * // In globals.css or layout.tsx
   * const css = registry.generateCss()
   */
  generateCss(): string {
    return Array.from(this.themes.values())
      .map((t) => t.css)
      .join("\n\n")
  }

  /**
   * Get the CSS for a specific theme only.
   */
  getThemeCss(name: string): string | null {
    return this.themes.get(name)?.css ?? null
  }

  /**
   * Inject all theme CSS into document <head> (browser only).
   * Call once on app init.
   */
  inject(styleId = "__tw_themes"): void {
    if (typeof document === "undefined") return

    const style =
      (document.getElementById(styleId) as HTMLStyleElement | null) ??
      (() => {
        const el = document.createElement("style")
        el.id = styleId
        document.head.appendChild(el)
        return el
      })()
    style.textContent = this.generateCss()
  }

  /**
   * Switch active theme by setting data-theme on <html>.
   */
  apply(name: string, target: HTMLElement = document.documentElement): void {
    if (typeof document === "undefined") return
    if (!this.themes.has(name)) {
      console.warn(`[tailwind-styled-v4] Theme "${name}" not registered.`)
      return
    }
    target.dataset.theme = name
  }

  /**
   * Get current active theme name from data-theme attribute.
   */
  current(target: HTMLElement = document.documentElement): string | null {
    if (typeof document === "undefined") return this.defaultTheme
    return target.dataset.theme ?? this.defaultTheme
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: createMultiTheme — shorthand for common light/dark setup
// ─────────────────────────────────────────────────────────────────────────────

export interface MultiThemeConfig<T extends ThemeTokenMap> {
  contract: ThemeContract<T>
  light: T
  dark: T
  /** Additional named themes (brand, high-contrast, etc.) */
  extras?: Record<string, T>
}

/**
 * Create a ThemeRegistry with light/dark + optional extras in one call.
 *
 * @example
 * const { registry, vars } = createMultiTheme({
 *   contract: defineThemeContract({
 *     colors: { bg: "", fg: "", primary: "", border: "" }
 *   }),
 *   light: {
 *     colors: { bg: "#fff", fg: "#09090b", primary: "#3b82f6", border: "#e5e7eb" }
 *   },
 *   dark: {
 *     colors: { bg: "#09090b", fg: "#fafafa", primary: "#60a5fa", border: "#27272a" }
 *   },
 * })
 *
 * // Inject CSS:
 * registry.inject()
 *
 * // Use tokens in components:
 * const Card = tw.div`bg-[${vars.colors.bg}] text-[${vars.colors.fg}]`
 */
export function createMultiTheme<T extends ThemeTokenMap>(
  config: MultiThemeConfig<T>
): {
  registry: ThemeRegistry
  vars: ThemeVars<T>
  light: Theme<T>
  dark: Theme<T>
} {
  const registry = new ThemeRegistry()

  const light = createTheme(config.contract, "light", config.light, true) // :root
  const dark = createTheme(config.contract, "dark", config.dark, false)

  registry.register(light, true)
  registry.register(dark)

  for (const [name, values] of Object.entries(config.extras ?? {})) {
    registry.register(createTheme(config.contract, name, values as T))
  }

  return {
    registry,
    vars: config.contract._vars,
    light,
    dark,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Design Token Compiler — generate CSS vars from token object
// (Enterprise feature: sync with Figma variables)
// ─────────────────────────────────────────────────────────────────────────────

export interface DesignTokens {
  [path: string]: string | DesignTokens
}

/**
 * Flatten nested design token object into CSS variables.
 * Supports Figma-style nested tokens.
 *
 * @example
 * compileDesignTokens({
 *   color: {
 *     brand: { primary: "#3b82f6", secondary: "#6366f1" },
 *     neutral: { 50: "#fafafa", 900: "#09090b" }
 *   },
 *   spacing: { base: "4px", lg: "16px" }
 * })
 * →
 * :root {
 *   --color-brand-primary: #3b82f6;
 *   --color-brand-secondary: #6366f1;
 *   --color-neutral-50: #fafafa;
 *   --color-neutral-900: #09090b;
 *   --spacing-base: 4px;
 *   --spacing-lg: 16px;
 * }
 */
export function compileDesignTokens(tokens: DesignTokens, prefix = ""): string {
  // ── Rust fast-path ─────────────────────────────────────────────────────────
  const native = getNativeThemeBinding()
  if (native?.compileTheme) {
    const result = native.compileTheme(JSON.stringify(tokens), "default", prefix)
    if (result) return result.css
  }

  // ── JS fallback ────────────────────────────────────────────────────────────
  const vars: string[] = []

  function flatten(obj: DesignTokens, path: string) {
    for (const [key, value] of Object.entries(obj)) {
      const varPath = path ? `${path}-${key}` : key
      if (typeof value === "string") {
        vars.push(`  --${varPath}: ${value};`)
      } else {
        flatten(value as DesignTokens, varPath)
      }
    }
  }

  flatten(tokens, prefix)
  return `:root {\n${vars.join("\n")}\n}`
}

// Re-export schemas
export {
  type LiveTokenUpdateInput,
  LiveTokenUpdateSchema,
  parseLiveTokenUpdate,
  parseTokenConfig,
  type ThemeRegistrationInput,
  ThemeRegistrationSchema,
  type TokenConfigInput,
  TokenConfigSchema,
} from "./schemas"
