/**
 * tailwind-styled-v4 — Oxc AST bridge untuk scanner.
 *
 * Mengekspos oxcExtractClasses sebagai pengganti astExtractClasses
 * yang berbasis regex. Lebih akurat karena pakai real AST parser.
 */

import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import type { AstExtractResult } from "./ast-native"

// ESM-compatible __dirname equivalent
function getDirname(): string {
  if (typeof __dirname !== "undefined") {
    return __dirname
  }
  // ESM fallback
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  // Final fallback
  return process.cwd()
}

interface NativeOxcBinding {
  oxcExtractClasses?: (
    source: string,
    filename: string
  ) => {
    classes: string[]
    componentNames: string[]
    hasTwUsage: boolean
    hasUseClient: boolean
    imports: string[]
    engine: string
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Native Oxc Binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const createOxcBindingLoader = () => {
  const _state = { binding: undefined as NativeOxcBinding | null | undefined }

  const getBinding = (): NativeOxcBinding | null => {
    if (_state.binding !== undefined) return _state.binding
    if (process.env.TWS_NO_NATIVE === "1") return (_state.binding = null)

    const req = typeof require === "function" ? require : createRequire(import.meta.url)
    const runtimeDir = getDirname()
    const candidates = [
      path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
      path.resolve(runtimeDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
    ]
    for (const c of candidates) {
      try {
        const mod = req(c) as NativeOxcBinding
        if (mod?.oxcExtractClasses) return (_state.binding = mod)
      } catch {
        /* next */
      }
    }
    return (_state.binding = null)
  }

  return {
    get: getBinding,
    reset: (): void => {
      _state.binding = undefined
    },
  }
}

const oxcBindingLoader = createOxcBindingLoader()

/**
 * Ekstrak kelas Tailwind menggunakan Oxc AST parser (Rust).
 * Lebih akurat dari regex — memahami JSX, TypeScript, template literals.
 *
 * Mengembalikan format yang sama dengan astExtractClasses untuk kompatibilitas.
 */
export function oxcExtractClasses(source: string, filename: string): AstExtractResult {
  const binding = oxcBindingLoader.get()

  if (binding?.oxcExtractClasses) {
    const r = binding.oxcExtractClasses(source, filename)
    return {
      classes: r.classes,
      componentNames: r.componentNames,
      hasTwUsage: r.hasTwUsage,
      hasUseClient: r.hasUseClient,
      imports: r.imports,
      engine: "oxc" as const,
    }
  }

  // Fallback ke regex-based ast-native
  const { astExtractClasses } = require("./ast-native")
  return astExtractClasses(source, filename)
}
