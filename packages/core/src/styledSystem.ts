/**
 * tailwind-styled-v4 — createStyledSystem()
 *
 * Design System Factory — Mode 3 API.
 *
 * Level 1 — utility:      tw.div`p-4`
 * Level 2 — styled:       tw(Button)`px-4`
 * Level 3 — design system: ui.button({ variant: "primary" })
 *
 * Usage:
 *   const ui = createStyledSystem({
 *     tokens: {
 *       colors: { primary: "#6366f1", muted: "#71717a" },
 *       radius: { base: "0.5rem", full: "9999px" },
 *     },
 *     components: {
 *       button: {
 *         base: "inline-flex items-center font-medium transition-colors",
 *         variants: {
 *           variant: {
 *             primary: "bg-[var(--sys-color-primary)] text-white",
 *             ghost:   "bg-transparent border border-current",
 *             danger:  "bg-red-500 text-white",
 *           },
 *           size: {
 *             sm: "h-8 px-3 text-sm",
 *             md: "h-10 px-4 text-base",
 *             lg: "h-12 px-6 text-lg",
 *           },
 *         },
 *         defaultVariants: { variant: "primary", size: "md" },
 *       },
 *     },
 *   })
 *
 *   const Button = ui.button()
 *   // → <Button variant="primary" size="lg" />
 *
 *   // Token access
 *   ui.token("colors.primary")       // → "var(--sys-color-primary)"
 *   ui.cssVar("colors.primary")      // → "#6366f1"
 */

import type React from "react"

import { createComponent } from "./createComponent"
import type { ComponentConfig, TwStyledComponent } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// System token types
// ─────────────────────────────────────────────────────────────────────────────

export type SystemTokenMap = Record<string, Record<string, string>>

export interface SystemComponentConfig extends ComponentConfig {
  /** Extra class applied only when used from the system (e.g. system-level resets) */
  systemBase?: string
  /** HTML tag for the component */
  tag?: string
}

export interface StyledSystemConfig<
  T extends SystemTokenMap = SystemTokenMap,
  C extends Record<string, SystemComponentConfig> = Record<string, SystemComponentConfig>,
> {
  /** Design tokens — injected as CSS custom properties under --sys-{group}-{name} */
  tokens?: T
  /** Component presets */
  components?: C
  /** CSS variable prefix. Default: "sys" → --sys-color-primary */
  prefix?: string
  /** If true, auto-inject token CSS vars into :root on init. Default: true */
  injectTokens?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Token → CSS var helpers
// ─────────────────────────────────────────────────────────────────────────────

function tokenVarName(prefix: string, group: string, name: string): string {
  return `--${prefix}-${group}-${name}`
}

function tokenVarRef(prefix: string, group: string, name: string): string {
  return `var(${tokenVarName(prefix, group, name)})`
}

function resolveTokenRef(tokens: SystemTokenMap, prefix: string, value: string): string {
  // If value is "token:colors.primary" → resolve to var(--sys-colors-primary)
  if (value.startsWith("token:")) {
    const path = value.slice(6)
    const [group, name] = path.split(".")
    if (group && name && tokens[group]?.[name] !== undefined) {
      return tokenVarRef(prefix, group, name)
    }
  }
  return value
}

function injectTokensToRoot(tokens: SystemTokenMap, prefix: string): void {
  if (typeof document === "undefined") return

  const styleId = `__tw-sys-tokens-${prefix}`
  if (document.getElementById(styleId)) return

  const lines: string[] = [":root {"]
  for (const [group, map] of Object.entries(tokens)) {
    for (const [name, value] of Object.entries(map)) {
      lines.push(`  ${tokenVarName(prefix, group, name)}: ${value};`)
    }
  }
  lines.push("}")

  const style = document.createElement("style")
  style.id = styleId
  style.textContent = lines.join("\n")
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────────────────────────────────────
// Variant class resolver — replaces "token:*" references inside variant values
// ─────────────────────────────────────────────────────────────────────────────

function resolveComponentConfig(
  config: SystemComponentConfig,
  tokens: SystemTokenMap,
  prefix: string
): ComponentConfig {
  const resolveStr = (s: string) => resolveTokenRef(tokens, prefix, s)

  const base = resolveStr(config.base ?? "")
  const systemBase = resolveStr(config.systemBase ?? "")
  const mergedBase = [systemBase, base].filter(Boolean).join(" ")

  const variants: Record<string, Record<string, string>> = {}
  for (const [variantKey, variantMap] of Object.entries(config.variants ?? {})) {
    variants[variantKey] = {}
    for (const [optKey, classes] of Object.entries(variantMap)) {
      variants[variantKey][optKey] = classes.split(" ").map(resolveStr).join(" ")
    }
  }

  const compoundVariants = (config.compoundVariants ?? []).map((cv) => {
    const { class: cls, ...rest } = cv
    return { class: resolveStr(cls), ...rest }
  })

  return {
    base: mergedBase,
    variants,
    compoundVariants,
    defaultVariants: config.defaultVariants ?? {},
    state: config.state,
    container: config.container,
    containerName: config.containerName,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StyledSystem instance type
// ─────────────────────────────────────────────────────────────────────────────

export type SystemComponentFactory<C extends SystemComponentConfig> = (
  overrides?: Partial<C>
) => TwStyledComponent<Record<string, unknown>>

export type StyledSystemInstance<
  T extends SystemTokenMap,
  C extends Record<string, SystemComponentConfig>,
> = {
  [K in keyof C]: SystemComponentFactory<C[K]>
} & {
  /**
   * Get the CSS variable reference for a token.
   * @example ui.token("colors.primary") → "var(--sys-colors-primary)"
   */
  token(path: string): string
  /**
   * Get the raw value of a token.
   * @example ui.rawToken("colors.primary") → "#6366f1"
   */
  rawToken(path: string): string | undefined
  /**
   * Update token values at runtime (re-injects into :root).
   */
  setTokens(updates: Partial<{ [G in keyof T]: Partial<T[G]> }>): void
  /**
   * Access the resolved component config for a registered component.
   */
  getConfig(name: keyof C): ComponentConfig | undefined
  /**
   * The tokens object (for reference).
   */
  tokens: T
}

// ─────────────────────────────────────────────────────────────────────────────
// createStyledSystem
// ─────────────────────────────────────────────────────────────────────────────

export function createStyledSystem<
  T extends SystemTokenMap = SystemTokenMap,
  C extends Record<string, SystemComponentConfig> = Record<string, SystemComponentConfig>,
>(config: StyledSystemConfig<T, C>): StyledSystemInstance<T, C> {
  const prefix = config.prefix ?? "sys"
  const tokens = (config.tokens ?? {}) as T
  const componentDefs = config.components ?? ({} as C)
  const shouldInject = config.injectTokens !== false

  // Inject tokens into :root on first call (client only)
  if (shouldInject && typeof window !== "undefined") {
    injectTokensToRoot(tokens as SystemTokenMap, prefix)
  }

  // Cache resolved component configs
  const resolvedConfigs = new Map<string, ComponentConfig>()

  for (const [name, compCfg] of Object.entries(componentDefs)) {
    resolvedConfigs.set(
      name,
      resolveComponentConfig(compCfg, tokens as SystemTokenMap, prefix)
    )
  }

  // Build component factories
  const factories: Record<string, SystemComponentFactory<SystemComponentConfig>> = {}

  for (const [name, compCfg] of Object.entries(componentDefs)) {
    const tag = compCfg.tag ?? "div"

    factories[name] = (overrides?: Partial<SystemComponentConfig>) => {
      const baseResolved = resolvedConfigs.get(name)!
      const runtimeTag = tag as React.ElementType

      if (!overrides || Object.keys(overrides).length === 0) {
        return createComponent(runtimeTag, baseResolved)
      }

      // Merge overrides into resolved config
      const overrideResolved = resolveComponentConfig(
        overrides as SystemComponentConfig,
        tokens as SystemTokenMap,
        prefix
      )

      const merged: ComponentConfig = {
        base: [baseResolved.base, overrideResolved.base].filter(Boolean).join(" "),
        variants: {
          ...(baseResolved.variants ?? undefined),
          ...(overrideResolved.variants ?? undefined),
        },
        compoundVariants: [
          ...(baseResolved.compoundVariants ?? []),
          ...(overrideResolved.compoundVariants ?? []),
        ],
        defaultVariants: {
          ...(baseResolved.defaultVariants ?? undefined),
          ...(overrideResolved.defaultVariants ?? undefined),
        },
        state: overrideResolved.state ?? baseResolved.state,
        container: overrideResolved.container ?? baseResolved.container,
        containerName: overrideResolved.containerName ?? baseResolved.containerName,
      }

      return createComponent(runtimeTag, merged)
    }
  }

  // Token utilities
  function token(path: string): string {
    const [group, name] = path.split(".")
    if (!group || !name) return path
    return tokenVarRef(prefix, group, name)
  }

  function rawToken(path: string): string | undefined {
    const [group, name] = path.split(".")
    if (!group || !name) return undefined
    return (tokens as SystemTokenMap)[group]?.[name]
  }

  function setTokens(updates: Partial<{ [G in keyof T]: Partial<T[G]> }>): void {
    if (typeof document === "undefined") return

    // Find or create the :root style element
    const styleId = `__tw-sys-tokens-${prefix}`
    const style =
      (document.getElementById(styleId) as HTMLStyleElement | null) ??
      (() => {
        const el = document.createElement("style")
        el.id = styleId
        document.head.appendChild(el)
        return el
      })()

    // Merge updates into tokens and re-generate
    for (const [group, map] of Object.entries(updates)) {
      if (!tokens[group as keyof T]) continue
      for (const [name, value] of Object.entries(map as Record<string, string>)) {
        ;(tokens as SystemTokenMap)[group][name] = value
      }
    }

    const lines: string[] = [":root {"]
    for (const [group, map] of Object.entries(tokens as SystemTokenMap)) {
      for (const [name, value] of Object.entries(map)) {
        lines.push(`  ${tokenVarName(prefix, group, name)}: ${value};`)
      }
    }
    lines.push("}")
    style.textContent = lines.join("\n")
  }

  function getConfig(name: keyof C): ComponentConfig | undefined {
    return resolvedConfigs.get(name as string)
  }

  return Object.assign(factories, {
    token,
    rawToken,
    setTokens,
    getConfig,
    tokens,
  }) as StyledSystemInstance<T, C>
}
