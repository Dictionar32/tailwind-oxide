/**
 * Rust-backed CSS compiler and AST extractor bridge.
 */

import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const getDirname = (): string => {
  if (typeof __dirname !== "undefined") return __dirname
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

interface NativeCompilerBinding {
  compileCss?: (
    classes: string[],
    prefix: string | null
  ) => {
    css: string
    resolvedClasses: string[]
    unknownClasses: string[]
    sizeBytes: number
  }
  astExtractClasses?: (
    source: string,
    filename: string
  ) => {
    classes: string[]
    componentNames: string[]
    hasTwUsage: boolean
    hasUseClient: boolean
    imports: string[]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Native binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────────

const createCompilerBindingLoader = () => {
  const bindingState: { current: NativeCompilerBinding | null | undefined } = {
    current: undefined,
  }

  const loadBinding = (): NativeCompilerBinding => {
    if (bindingState.current !== undefined) {
      if (bindingState.current === null) {
        throw new Error(
          `[tailwind-styled/compiler v5] Native CSS binding is required but not available.\n` +
            `Please ensure the native module is properly built.`
        )
      }
      return bindingState.current
    }

    if (process.env.TWS_NO_NATIVE === "1") {
      bindingState.current = null
      throw new Error(
        `[tailwind-styled/compiler v5] Native binding is required.\n` +
          `The TWS_NO_NATIVE environment variable is set, which disables native binding.`
      )
    }

    const req = typeof require === "function" ? require : createRequire(import.meta.url)
    const currentDir = getDirname()
    const candidates = [
      path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
      path.resolve(currentDir, "..", "..", "..", "native", "tailwind_styled_parser.node"),
      path.resolve(currentDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
    ]

    for (const candidate of candidates) {
      try {
        const mod = req(candidate) as NativeCompilerBinding
        if (mod?.compileCss) {
          bindingState.current = mod
          return bindingState.current
        }
      } catch {
        /* try next */
      }
    }

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

const compilerBindingLoader = createCompilerBindingLoader()

// ── Public API ───────────────────────────────────────────────────────────────

export interface CssCompileResult {
  css: string
  resolvedClasses: string[]
  unknownClasses: string[]
  sizeBytes: number
  engine: "rust" | "fallback"
}

export interface AstExtractResult {
  classes: string[]
  componentNames: string[]
  hasTwUsage: boolean
  hasUseClient: boolean
  imports: string[]
  engine: "rust" | "fallback"
}

export const compileCssNative = (
  classes: string[],
  prefix: string | null = null
): CssCompileResult => {
  const binding = compilerBindingLoader.get()
  const r = binding.compileCss!(classes, prefix)
  return { ...r, engine: "rust" }
}

export const astExtractClassesNative = (source: string, filename: string): AstExtractResult => {
  const binding = compilerBindingLoader.get()
  const r = binding.astExtractClasses!(source, filename)
  return { ...r, engine: "rust" }
}
