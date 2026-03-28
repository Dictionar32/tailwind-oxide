/**
 * tailwind-styled-v4 — Official Plugins
 *
 * 3 plugin resmi sebagai reference implementasi ecosystem.
 * Bisa dipakai langsung atau dijadikan template buat community plugins.
 *
 * Usage:
 *   import { pluginAnimation, pluginTokens, pluginTypography } from "tailwind-styled-v4/plugins"
 *
 *   withTailwindStyled({
 *     plugins: [
 *       pluginAnimation(),
 *       pluginTokens({ primary: "#3b82f6", secondary: "#6366f1" }),
 *       pluginTypography(),
 *     ]
 *   })(nextConfig)
 *
 * Atau standalone:
 *   import { use } from "tailwind-styled-v4/plugin"
 *   use(pluginAnimation())
 */

import type { TwContext, TwPlugin } from "@tailwind-styled/plugin-api"

// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN 1: tw-plugin-animation
//
// Menambahkan:
//   - Preset animation variants (enter, exit, slide-*, fade-*, scale-*)
//   - tw.animate() DSL support via compiler transform hook
//   - CSS @keyframes injection
// ─────────────────────────────────────────────────────────────────────────────

export interface AnimationPluginOptions {
  /** Prefix untuk generated animation classes. Default: "tw-anim" */
  prefix?: string
  /** Tambahkan reduced-motion safe variants. Default: true */
  reducedMotion?: boolean
}

/**
 * Official animation plugin.
 *
 * Adds:
 *   - `enter` variant → apply on mount animation
 *   - `exit` variant → apply on unmount animation
 *   - `motion-safe:` → only animate if prefers-reduced-motion: no-preference
 *   - Preset utility classes: `animate-fade-in`, `animate-slide-up`, etc.
 *
 * @example
 * use(pluginAnimation())
 *
 * const Card = tw.div`p-4 animate-fade-in`
 * const Modal = tw.div`animate-scale-in fixed inset-0`
 */
export function pluginAnimation(opts: AnimationPluginOptions = {}): TwPlugin {
  const { prefix = "tw-anim", reducedMotion = true } = opts

  return {
    name: "tw-plugin-animation",

    setup(ctx: TwContext) {
      // Variant: motion-safe — only animate if user hasn't requested reduced motion
      if (reducedMotion) {
        ctx.addVariant(
          "motion-safe",
          (sel: string) => `@media (prefers-reduced-motion: no-preference) { ${sel} }`
        )
        ctx.addVariant(
          "motion-reduce",
          (sel: string) => `@media (prefers-reduced-motion: reduce) { ${sel} }`
        )
      }

      // ── Preset @keyframes injected via CSS hook ─────────────────────────
      ctx.onGenerateCSS((css: string) => {
        const keyframes = `
/* tw-plugin-animation: preset keyframes */
@keyframes ${prefix}-fade-in    { from{opacity:0}                              to{opacity:1} }
@keyframes ${prefix}-fade-out   { from{opacity:1}                              to{opacity:0} }
@keyframes ${prefix}-slide-up   { from{opacity:0;transform:translateY(0.5rem)} to{opacity:1;transform:translateY(0)} }
@keyframes ${prefix}-slide-down { from{opacity:0;transform:translateY(-0.5rem)}to{opacity:1;transform:translateY(0)} }
@keyframes ${prefix}-slide-left { from{opacity:0;transform:translateX(0.5rem)} to{opacity:1;transform:translateX(0)} }
@keyframes ${prefix}-scale-in   { from{opacity:0;transform:scale(0.95)}        to{opacity:1;transform:scale(1)} }
@keyframes ${prefix}-scale-out  { from{opacity:1;transform:scale(1)}           to{opacity:0;transform:scale(0.95)} }
@keyframes ${prefix}-spin       { from{transform:rotate(0deg)}                 to{transform:rotate(360deg)} }
@keyframes ${prefix}-ping       { 0%,100%{opacity:1;transform:scale(1)}        75%{opacity:0;transform:scale(2)} }
@keyframes ${prefix}-pulse      { 0%,100%{opacity:1}                           50%{opacity:0.5} }
@keyframes ${prefix}-bounce     { 0%,100%{transform:translateY(-25%);animation-timing-function:cubic-bezier(.8,0,1,1)} 50%{transform:translateY(0);animation-timing-function:cubic-bezier(0,0,.2,1)} }
`
        return keyframes + css
      })

      // ── Preset animation utility classes ─────────────────────────────────
      const dur = "300ms"
      const ease = "cubic-bezier(0.16,1,0.3,1)"

      ctx.addUtility(`animate-fade-in`, { animation: `${prefix}-fade-in    ${dur} ${ease} both` })
      ctx.addUtility(`animate-fade-out`, { animation: `${prefix}-fade-out   ${dur} ${ease} both` })
      ctx.addUtility(`animate-slide-up`, { animation: `${prefix}-slide-up   ${dur} ${ease} both` })
      ctx.addUtility(`animate-slide-down`, {
        animation: `${prefix}-slide-down ${dur} ${ease} both`,
      })
      ctx.addUtility(`animate-slide-left`, {
        animation: `${prefix}-slide-left ${dur} ${ease} both`,
      })
      ctx.addUtility(`animate-scale-in`, { animation: `${prefix}-scale-in   200ms ease-out both` })
      ctx.addUtility(`animate-scale-out`, { animation: `${prefix}-scale-out  150ms ease-in  both` })
      ctx.addUtility(`animate-spin`, { animation: `${prefix}-spin 1s linear infinite` })
      ctx.addUtility(`animate-ping`, {
        animation: `${prefix}-ping 1s cubic-bezier(0,0,.2,1) infinite`,
      })
      ctx.addUtility(`animate-pulse`, {
        animation: `${prefix}-pulse 2s cubic-bezier(.4,0,.6,1) infinite`,
      })
      ctx.addUtility(`animate-bounce`, { animation: `${prefix}-bounce 1s infinite` })
      ctx.addUtility(`animate-none`, { animation: "none" })

      // ── Object-config transform hook (Sprint 4) ──────────────────────────
      // Keep this as a no-op so existing animation preset behavior stays stable.
      // Custom plugins can now modify tw.tag({ ... }) configs through this hook.
      ctx.addTransform((config) => config)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN 2: tw-plugin-tokens
//
// Menambahkan:
//   - Design tokens sebagai CSS custom properties
//   - Token-aware utility classes (bg-primary, text-primary, etc.)
//   - Tailwind v4 @theme compatible output
// ─────────────────────────────────────────────────────────────────────────────

export interface TokensPluginOptions {
  /** Color tokens */
  colors?: Record<string, string>
  /** Spacing tokens (mapped to --spacing-*) */
  spacing?: Record<string, string>
  /** Typography tokens */
  fonts?: Record<string, string>
  /** Border radius tokens */
  radii?: Record<string, string>
  /** Shadow tokens */
  shadows?: Record<string, string>
  /** Custom tokens (any group) */
  custom?: Record<string, Record<string, string>>
  /** Generate utility classes. Default: true */
  generateUtilities?: boolean
}

/**
 * Official design token plugin.
 *
 * Generates CSS variables from your token map + optional utility classes.
 *
 * @example
 * use(pluginTokens({
 *   colors: {
 *     primary:   "#3b82f6",
 *     secondary: "#6366f1",
 *     danger:    "#ef4444",
 *   },
 *   fonts: {
 *     sans: "InterVariable, system-ui, sans-serif",
 *   },
 * }))
 *
 * // Then use in components:
 * const Button = tw.button`bg-primary text-white hover:bg-primary-hover`
 * // → bg-[var(--color-primary)] etc.
 */
export function pluginTokens(opts: TokensPluginOptions = {}): TwPlugin {
  const { generateUtilities = true } = opts

  return {
    name: "tw-plugin-tokens",

    setup(ctx: TwContext) {
      const scopedVarRef = (scope: string, name: string, fallback?: string): string => {
        return fallback ? `var(--${scope}-${name}, ${fallback})` : `var(--${scope}-${name})`
      }

      const colorVarRef = (name: string): string =>
        `var(--color-${name}, var(--tw-token-color-${name}, var(--tw-token-${name})))`
      const hoverColorVarRef = (name: string): string =>
        `var(--color-${name}-hover, var(--tw-token-color-${name}-hover, var(--tw-token-${name}-hover)))`

      const resolveLiveToken = (
        canonicalName: string,
        legacyName: string,
        fallbackValue: string
      ): string => ctx.getToken(canonicalName) ?? ctx.getToken(legacyName) ?? fallbackValue

      // Register color tokens
      for (const [name, value] of Object.entries(opts.colors ?? {})) {
        const colorToken = resolveLiveToken(`color-${name}`, name, value)
        ctx.addToken(`color-${name}`, colorToken)

        const liveHoverToken = ctx.getToken(`color-${name}-hover`) ?? ctx.getToken(`${name}-hover`)
        const liveActiveToken =
          ctx.getToken(`color-${name}-active`) ?? ctx.getToken(`${name}-active`)

        if (typeof liveHoverToken === "string") {
          ctx.addToken(`color-${name}-hover`, liveHoverToken)
        } else if (!colorToken.startsWith("var(")) {
          ctx.addToken(`color-${name}-hover`, darken(colorToken, 0.1))
        }

        if (typeof liveActiveToken === "string") {
          ctx.addToken(`color-${name}-active`, liveActiveToken)
        } else if (!colorToken.startsWith("var(")) {
          ctx.addToken(`color-${name}-active`, darken(colorToken, 0.2))
        }

        if (generateUtilities) {
          ctx.addUtility(`bg-${name}`, { "background-color": colorVarRef(name) })
          ctx.addUtility(`text-${name}`, { color: colorVarRef(name) })
          ctx.addUtility(`border-${name}`, { "border-color": colorVarRef(name) })
          ctx.addUtility(`ring-${name}`, { "--tw-ring-color": colorVarRef(name) })
          ctx.addUtility(`hover-bg-${name}:hover`, {
            "background-color": hoverColorVarRef(name),
          })
        }
      }

      for (const [name, value] of Object.entries(opts.spacing ?? {})) {
        ctx.addToken(`spacing-${name}`, resolveLiveToken(`spacing-${name}`, name, value))
      }

      for (const [name, value] of Object.entries(opts.fonts ?? {})) {
        ctx.addToken(`font-${name}`, resolveLiveToken(`font-${name}`, name, value))
        if (generateUtilities) {
          ctx.addUtility(`font-${name}`, {
            "font-family": scopedVarRef("font", name, `var(--tw-token-font-${name})`),
          })
        }
      }

      for (const [name, value] of Object.entries(opts.radii ?? {})) {
        ctx.addToken(`radius-${name}`, resolveLiveToken(`radius-${name}`, name, value))
        if (generateUtilities) {
          ctx.addUtility(`rounded-${name}`, {
            "border-radius": scopedVarRef("radius", name, `var(--tw-token-radius-${name})`),
          })
        }
      }

      for (const [name, value] of Object.entries(opts.shadows ?? {})) {
        ctx.addToken(`shadow-${name}`, resolveLiveToken(`shadow-${name}`, name, value))
        if (generateUtilities) {
          ctx.addUtility(`shadow-${name}`, {
            "box-shadow": scopedVarRef("shadow", name, `var(--tw-token-shadow-${name})`),
          })
        }
      }

      for (const [group, tokens] of Object.entries(opts.custom ?? {})) {
        for (const [name, value] of Object.entries(tokens)) {
          ctx.addToken(`${group}-${name}`, resolveLiveToken(`${group}-${name}`, name, value))
        }
      }

      ctx.subscribeTokens((tokens) => {
        for (const [name, fallback] of Object.entries(opts.colors ?? {})) {
          const nextColor = tokens[`color-${name}`] ?? tokens[name]
          if (typeof nextColor === "string") {
            ctx.addToken(`color-${name}`, nextColor)
          }

          const nextHover = tokens[`color-${name}-hover`] ?? tokens[`${name}-hover`]
          if (typeof nextHover === "string") {
            ctx.addToken(`color-${name}-hover`, nextHover)
          } else if (typeof nextColor !== "string" && !fallback.startsWith("var(")) {
            ctx.addToken(`color-${name}-hover`, darken(fallback, 0.1))
          }

          const nextActive = tokens[`color-${name}-active`] ?? tokens[`${name}-active`]
          if (typeof nextActive === "string") {
            ctx.addToken(`color-${name}-active`, nextActive)
          } else if (typeof nextColor !== "string" && !fallback.startsWith("var(")) {
            ctx.addToken(`color-${name}-active`, darken(fallback, 0.2))
          }
        }

        for (const [name, fallback] of Object.entries(opts.spacing ?? {})) {
          const nextValue = tokens[`spacing-${name}`] ?? tokens[name]
          ctx.addToken(`spacing-${name}`, typeof nextValue === "string" ? nextValue : fallback)
        }

        for (const [name, fallback] of Object.entries(opts.fonts ?? {})) {
          const nextValue = tokens[`font-${name}`] ?? tokens[name]
          ctx.addToken(`font-${name}`, typeof nextValue === "string" ? nextValue : fallback)
        }

        for (const [name, fallback] of Object.entries(opts.radii ?? {})) {
          const nextValue = tokens[`radius-${name}`] ?? tokens[name]
          ctx.addToken(`radius-${name}`, typeof nextValue === "string" ? nextValue : fallback)
        }

        for (const [name, fallback] of Object.entries(opts.shadows ?? {})) {
          const nextValue = tokens[`shadow-${name}`] ?? tokens[name]
          ctx.addToken(`shadow-${name}`, typeof nextValue === "string" ? nextValue : fallback)
        }

        for (const [group, groupTokens] of Object.entries(opts.custom ?? {})) {
          for (const [name, fallback] of Object.entries(groupTokens)) {
            const key = `${group}-${name}`
            const nextValue = tokens[key] ?? tokens[name]
            ctx.addToken(key, typeof nextValue === "string" ? nextValue : fallback)
          }
        }
      })
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN 3: tw-plugin-typography
//
// Menambahkan:
//   - Prose utility class (rich text styling)
//   - Typography scale utilities
//   - Font feature utilities (ligatures, kerning, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export interface TypographyPluginOptions {
  /** Default prose text color. Default: "inherit" */
  color?: string
  /** Default prose font family. Default: "inherit" */
  fontFamily?: string
  /** Max width for prose container. Default: "65ch" */
  maxWidth?: string
}

/**
 * Official typography plugin.
 *
 * Adds `prose` utility class for rich text content (like @tailwindcss/typography).
 * Zero external dependency.
 *
 * @example
 * use(pluginTypography())
 *
 * const Article = tw.article`prose prose-invert max-w-3xl mx-auto`
 */
export function pluginTypography(opts: TypographyPluginOptions = {}): TwPlugin {
  const { color = "inherit", fontFamily = "inherit", maxWidth = "65ch" } = opts

  return {
    name: "tw-plugin-typography",

    setup(ctx: TwContext) {
      // ── Base prose ───────────────────────────────────────────────────────
      ctx.addUtility("prose", {
        color: color,
        "font-family": fontFamily,
        "max-width": maxWidth,
        "line-height": "1.75",
        "font-size": "1rem",
      })

      // ── Font feature utilities ────────────────────────────────────────────
      ctx.addUtility("font-ligatures", { "font-variant-ligatures": "common-ligatures" })
      ctx.addUtility("font-no-ligatures", { "font-variant-ligatures": "none" })
      ctx.addUtility("font-numeric", { "font-variant-numeric": "tabular-nums" })
      ctx.addUtility("font-oldstyle-nums", { "font-variant-numeric": "oldstyle-nums" })
      ctx.addUtility("font-kerning", { "font-kerning": "auto" })
      ctx.addUtility("font-optical-sizing", { "font-optical-sizing": "auto" })
      ctx.addUtility("text-balance", { "text-wrap": "balance" })
      ctx.addUtility("text-pretty", { "text-wrap": "pretty" })
      ctx.addUtility("text-stable", { "text-wrap": "stable" })

      // ── Heading scale ─────────────────────────────────────────────────────
      ctx.addUtility("prose-h1", {
        "font-size": "2.25rem",
        "font-weight": "800",
        "line-height": "1.25",
        "margin-bottom": "0.5em",
      })
      ctx.addUtility("prose-h2", {
        "font-size": "1.5rem",
        "font-weight": "700",
        "line-height": "1.33",
        "margin-bottom": "0.5em",
      })
      ctx.addUtility("prose-h3", {
        "font-size": "1.25rem",
        "font-weight": "600",
        "line-height": "1.4",
        "margin-bottom": "0.5em",
      })
      ctx.addUtility("prose-h4", {
        "font-size": "1.125rem",
        "font-weight": "600",
        "line-height": "1.5",
        "margin-bottom": "0.5em",
      })

      // ── Dark mode prose ───────────────────────────────────────────────────
      ctx.addVariant("prose-invert", (sel: string) => `.dark ${sel}, [data-theme="dark"] ${sel}`)

      // ── CSS hooks ─────────────────────────────────────────────────────────
      ctx.onGenerateCSS((css: string) => {
        const proseCss = `
/* tw-plugin-typography: prose content styles */
.prose > * + * { margin-top: 1.25em }
.prose p  { line-height: 1.75 }
.prose h1,.prose h2,.prose h3,.prose h4 { font-weight: 700; line-height: 1.3 }
.prose a  { color: var(--color-primary, #3b82f6); text-decoration: underline; text-underline-offset: 2px }
.prose a:hover { opacity: 0.8 }
.prose strong,.prose b { font-weight: 700 }
.prose em,.prose i { font-style: italic }
.prose code { background: rgba(127,127,127,.15); padding: 0.15em 0.35em; border-radius: 3px; font-size: 0.875em }
.prose pre  { background: #09090b; padding: 1.25em; border-radius: 8px; overflow-x: auto }
.prose pre code { background: none; padding: 0; font-size: 0.875em }
.prose ul   { list-style: disc; padding-left: 1.5em }
.prose ol   { list-style: decimal; padding-left: 1.5em }
.prose li   { margin-top: 0.25em; margin-bottom: 0.25em }
.prose blockquote { border-left: 4px solid var(--color-primary, #3b82f6); padding-left: 1em; font-style: italic; opacity: 0.8 }
.prose hr   { border-color: rgba(127,127,127,.2); margin: 2em 0 }
.prose img  { border-radius: 8px; max-width: 100% }
.prose table { width: 100%; border-collapse: collapse }
.prose th,.prose td { padding: 0.5em 1em; border: 1px solid rgba(127,127,127,.2); text-align: left }
.prose th  { font-weight: 600; background: rgba(127,127,127,.05) }
`
        return proseCss + css
      })
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: darken hex color by percentage
// ─────────────────────────────────────────────────────────────────────────────

function darken(hex: string, amount: number): string {
  try {
    const n = parseInt(hex.replace("#", ""), 16)
    const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amount)) | 0
    const g = Math.max(0, ((n >> 8) & 0xff) * (1 - amount)) | 0
    const b = Math.max(0, (n & 0xff) * (1 - amount)) | 0
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
  } catch {
    return hex
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export plugin primitives for community plugin development
// ─────────────────────────────────────────────────────────────────────────────

export type { PluginRegistry, TwContext, TwPlugin } from "@tailwind-styled/plugin-api"
export {
  createTw,
  presetScrollbar,
  presetTokens,
  presetVariants,
  use,
} from "@tailwind-styled/plugin-api"
