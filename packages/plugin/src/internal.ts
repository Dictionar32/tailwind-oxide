/**
 * tailwind-styled-v4 — Internal Helpers
 *
 * Fungsi internal untuk compiler dan engine.
 * TIDAK untuk penggunaan langsung oleh plugin consumers.
 */

import type { PluginRegistry } from "./index"

/**
 * Generate :root CSS variables from registered tokens.
 */
export function generateTokenCss(registry: PluginRegistry): string {
  if (registry.tokens.size === 0) return ""

  const vars = Array.from(registry.tokens.entries())
    .map(([name, value]) => `  --${name}: ${value};`)
    .join("\n")

  return `:root {\n${vars}\n}`
}

/**
 * Generate CSS for registered utilities.
 */
export function generateUtilityCss(registry: PluginRegistry): string {
  const lines: string[] = []

  for (const [name, styles] of registry.utilities.entries()) {
    const props = Object.entries(styles)
      .map(([p, v]) => `  ${p}: ${v};`)
      .join("\n")
    lines.push(`.${name} {\n${props}\n}`)
  }

  return lines.join("\n\n")
}

/**
 * Apply all CSS hooks to a CSS string.
 */
export function applyCssHooks(css: string, registry: PluginRegistry): string {
  return registry.cssHooks.reduce((acc, hook) => hook(acc), css)
}

/**
 * Run all build end hooks.
 */
export async function runBuildHooks(registry: PluginRegistry): Promise<void> {
  for (const hook of registry.buildHooks) {
    await hook()
  }
}
