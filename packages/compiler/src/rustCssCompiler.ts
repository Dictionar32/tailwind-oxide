/**
 * Rust-backed CSS compiler and AST extractor bridge.
 */

import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { TwError } from "@tailwind-styled/shared"
import { CssCompileResultSchema } from "./schemas"

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
      throw new TwError(
        "rust",
        "NATIVE_CSS_BINDING_UNAVAILABLE",
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
    const lines = [
      "[tailwind-styled/compiler v5] Native CSS binding not found.",
      "",
      "Tried loading from:",
      ...candidates.map((c) => `  - ${c}`),
      "",
      "Please build the native module.",
    ]

    throw new TwError("rust", "NATIVE_CSS_BINDING_NOT_FOUND", lines.join("\n"))
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
  engine: "rust"
}

export interface AstExtractResult {
  classes: string[]
  componentNames: string[]
  hasTwUsage: boolean
  hasUseClient: boolean
  imports: string[]
  engine: "rust"
}

export const compileCssNative = (
  classes: string[],
  prefix: string | null = null
): CssCompileResult => {
  const binding = compilerBindingLoader.get()
  const raw = binding.compileCss!(classes, prefix)

  // ── Boundary validation: validate native binding response with Zod ──
  const parsed = CssCompileResultSchema.safeParse({ ...raw, engine: "rust" })
  if (!parsed.success) {
    throw TwError.fromRust({
      code: "NATIVE_COMPILE_RESULT_INVALID",
      message: `Native compileCss returned invalid result: ${parsed.error.issues.map(i => i.message).join("; ")}`,
    })
  }
  return parsed.data
}

export const astExtractClassesNative = (source: string, filename: string): AstExtractResult => {
  const binding = compilerBindingLoader.get()
  const raw = binding.astExtractClasses!(source, filename)

  // ── Boundary validation: validate native binding response ──
  if (!raw || !Array.isArray(raw.classes)) {
    throw TwError.fromRust({
      code: "NATIVE_EXTRACT_RESULT_INVALID",
      message: `Native astExtractClasses returned invalid result for ${filename}`,
    })
  }
  return { ...raw, engine: "rust" }
}
