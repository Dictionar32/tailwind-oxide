/**
 * tailwind-styled-v4 — AST-native class extractor (Rust-backed)
 *
 * Native-only: Rust AST binding is required.
 * No JavaScript fallback — native Rust binding must be available.
 *
 * Uses ast_extract_classes() N-API function.
 */

import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

// ESM-compatible __dirname equivalent
function getDirname(): string {
  if (typeof __dirname !== "undefined") {
    return __dirname
  }
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

// ── Native binding ────────────────────────────────────────────────────────────

interface NativeAstBinding {
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

// ─────────────────────────────────────────────────────────────────────────
// Native AST Binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const createAstBindingLoader = () => {
  const _state = { binding: undefined as NativeAstBinding | null | undefined }

  const getBinding = (): NativeAstBinding => {
    if (_state.binding !== undefined) {
      if (_state.binding === null) {
        throw new Error(
          "FATAL: Native AST binding not found.\n" +
          "This package requires native Rust bindings.\n\n" +
          "Resolution steps:\n" +
          "1. Build the native Rust module: npm run build:rust"
        )
      }
      return _state.binding
    }

    const req = createRequire(import.meta.url)
    const runtimeDir = getDirname()
    const candidates = [
      path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
      path.resolve(runtimeDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
    ]
    for (const c of candidates) {
      try {
        const mod = req(c) as NativeAstBinding
        if (mod?.astExtractClasses) {
          _state.binding = mod
          return mod
        }
      } catch {
        /* next */
      }
    }
    _state.binding = null
    throw new Error(
      "FATAL: Native AST binding not found in any candidate path.\n" +
      "This package requires native Rust bindings.\n\n" +
      "Candidates checked:\n" +
      candidates.map((p) => `  - ${p}`).join("\n") +
      "\n\nResolution steps:\n" +
      "1. Build the native Rust module: npm run build:rust"
    )
  }

  return {
    get: getBinding,
    reset: (): void => {
      _state.binding = undefined
    },
  }
}

const astBindingLoader = createAstBindingLoader()

// ── Public API ────────────────────────────────────────────────────────────────

export interface AstExtractResult {
  classes: string[]
  componentNames: string[]
  hasTwUsage: boolean
  hasUseClient: boolean
  imports: string[]
  engine: "rust" | "oxc"
}

/**
 * Extract Tailwind classes using AST-level analysis.
 * More accurate than pure regex — handles JSX, template literals, object configs.
 *
 * Uses Rust engine — native binding is required.
 */
export function astExtractClasses(source: string, filename: string): AstExtractResult {
  const binding = astBindingLoader.get()

  if (!binding.astExtractClasses) {
    throw new Error(
      "FATAL: Native binding 'astExtractClasses' is required but not available.\n" +
      "This package requires native Rust bindings."
    )
  }

  const r = binding.astExtractClasses(source, filename)
  return {
    classes: r.classes,
    componentNames: r.componentNames,
    hasTwUsage: r.hasTwUsage,
    hasUseClient: r.hasUseClient,
    imports: r.imports,
    engine: "rust",
  }
}
