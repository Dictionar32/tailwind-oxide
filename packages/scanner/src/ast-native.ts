/**
 * tailwind-styled-v4 — AST-native class extractor (Rust-backed)
 *
 * Replaces ast-parser.ts with Rust implementation.
 * Uses ast_extract_classes() N-API function.
 */

import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

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

  const getBinding = (): NativeAstBinding | null => {
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
        const mod = req(c) as NativeAstBinding
        if (mod?.astExtractClasses) return (_state.binding = mod)
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

const astBindingLoader = createAstBindingLoader()

// ── Public API ────────────────────────────────────────────────────────────────

export interface AstExtractResult {
  classes: string[]
  componentNames: string[]
  hasTwUsage: boolean
  hasUseClient: boolean
  imports: string[]
  engine: "rust" | "fallback" | "oxc"
}

/**
 * Extract Tailwind classes using AST-level analysis.
 * More accurate than pure regex — handles JSX, template literals, object configs.
 *
 * Uses Rust engine when native binary is available.
 */
export function astExtractClasses(source: string, filename: string): AstExtractResult {
  const binding = astBindingLoader.get()

  if (binding?.astExtractClasses) {
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

  // JS fallback — basic regex extraction
  const classes = new Set<string>()
  const componentNames: string[] = []

  // tw.tag`classes`
  for (const [, , cls] of source.matchAll(/\btw(?:\.server)?\.(\w+)`([^`]*)`/g)) {
    if (!cls.includes("${")) {
      cls
        .split(/\s+/)
        .filter(Boolean)
        .forEach((c) => classes.add(c))
    }
  }

  // base: "..."
  for (const [, cls] of source.matchAll(/base\s*:\s*["'`]([^"'`]+)["'`]/g)) {
    cls
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c) => classes.add(c))
  }

  // className="..."
  for (const [, cls] of source.matchAll(/className=["']([^"']+)["']/g)) {
    cls
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c) => classes.add(c))
  }

  // component names
  for (const [, name] of source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*tw/g)) {
    componentNames.push(name)
  }

  // imports
  const imports: string[] = []
  for (const [, imp] of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    imports.push(imp)
  }

  return {
    classes: Array.from(classes).filter(
      (c) => c.includes("-") || c.includes(":") || c.includes("[")
    ),
    componentNames,
    hasTwUsage: source.includes("tw.") || source.includes('from "tailwind-styled'),
    hasUseClient: source.includes('"use client"') || source.includes("'use client'"),
    imports,
    engine: "fallback",
  }
}
