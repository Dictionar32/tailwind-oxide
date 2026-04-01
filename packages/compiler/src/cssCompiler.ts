/**
 * tailwind-styled-v4 — CSS Compiler (Rust-backed LightningCSS-style)
 *
 * v5 CHANGE: Now requires native binding. Previously fell back to JS implementation.
 *
 * Compiles Tailwind class lists to atomic CSS using Rust native engine.
 */

import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

// ESM-compatible __dirname
const getDirname = (): string => {
  if (typeof __dirname !== "undefined") {
    return __dirname
  }
  // ESM fallback - handle case where import.meta is converted to empty object in CJS
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  // Final fallback: use process.cwd()
  return process.cwd()
}

// ── Native binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────────

interface NativeCssBinding {
  compileCss?: (
    classes: string[],
    prefix: string | null
  ) => {
    css: string
    resolvedClasses: string[]
    unknownClasses: string[]
    sizeBytes: number
  }
}

const createBindingLoader = () => {
  const bindingState: { current: NativeCssBinding | null | undefined } = {
    current: undefined,
  }

  const loadBinding = (): NativeCssBinding => {
    if (bindingState.current !== undefined) {
      if (bindingState.current === null) {
        throw new Error(
          `[tailwind-styled/compiler v5] Native CSS binding is required but not available.\n` +
            `Please ensure the native module is properly built.`
        )
      }
      return bindingState.current
    }

    const req = createRequire(import.meta.url)
    const currentDir = getDirname()
    const candidates = [
      path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
      path.resolve(currentDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
    ]
    for (const c of candidates) {
      try {
        const mod = req(c) as NativeCssBinding
        if (mod?.compileCss) {
          bindingState.current = mod
          return bindingState.current
        }
      } catch {
        /* next */
      }
    }

    // v5: Throw error instead of returning null
    bindingState.current = null
    throw new Error(
      `[tailwind-styled/compiler v5] Native CSS binding not found.\n` +
        `Tried loading from:\n` +
        candidates.map((c) => `  - ${c}`).join("\n") +
        `\n` +
        `Please build the native module.`
    )
  }

  return {
    get: loadBinding,
    reset: (): void => {
      bindingState.current = undefined
    },
  }
}

const bindingLoader = createBindingLoader()

// ── Public API ────────────────────────────────────────────────────────────────

export interface CssCompileResult {
  /** Generated atomic CSS */
  css: string
  /** Classes successfully resolved to native CSS */
  resolvedClasses: string[]
  /** Classes with no native mapping */
  unknownClasses: string[]
  /** Byte size of generated CSS */
  sizeBytes: number
  /** Which engine produced this output */
  engine: "rust"
}

/**
 * Compile a list of Tailwind classes into atomic CSS.
 *
 * v5 CHANGE: Now THROWS if native binding is unavailable.
 * Previously fell back to JS implementation.
 *
 * Uses Rust LightningCSS-style engine when native binary is available.
 *
 * @example
 * const { css } = compileCssFromClasses(['flex', 'items-center', 'hover:bg-blue-600'])
 * // → ".flex { display: flex } .items-center { align-items: center } ..."
 *
 * @throws Error if native binding is not available
 */
export function compileCssFromClasses(
  classes: string[],
  options: { prefix?: string } = {}
): CssCompileResult {
  const binding = bindingLoader.get() // throws if unavailable
  const prefix = options.prefix ?? null

  // v5: Binding is guaranteed to have compileCss after getBinding() returns
  const r = binding.compileCss!(classes, prefix)
  return {
    css: r.css,
    resolvedClasses: r.resolvedClasses,
    unknownClasses: r.unknownClasses,
    sizeBytes: r.sizeBytes,
    engine: "rust",
  }
}

/**
 * Compile CSS for a set of classes and inject as a <style> block (SSR helper).
 */
export function buildStyleTag(classes: string[]): string {
  const { css } = compileCssFromClasses(classes)
  return css ? `<style data-tailwind-styled>${css}</style>` : ""
}
