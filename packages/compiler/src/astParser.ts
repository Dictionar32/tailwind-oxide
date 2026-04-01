/**
 * tailwind-styled-v4 — astParser
 *
 * Native-only: oxc-parser (Rust-based, via napi-rs) is required.
 * No JavaScript fallback — native Rust binding must be available.
 *
 * Keuntungan oxc-parser:
 *  - ~10x lebih cepat dari tokenizer TypeScript
 *  - Handles semua edge case TypeScript/JS secara native
 *  - Same parser yang dipakai Rolldown, Vite 6, Biome
 *  - Zero maintenance — battle-tested di ekosistem besar
 *
 * Compatibility: Next.js, Vite, Rspack — semua fully supported.
 * oxc-parser adalah native Node addon (napi-rs), tidak ada WASM overhead.
 */

import { createRequire } from "node:module"

export interface ParsedComponentConfig {
  base: string
  variants: Record<string, Record<string, string>>
  compounds: Array<{ class: string; [key: string]: unknown }>
  defaults: Record<string, string>
}

// ─────────────────────────────────────────────────────────────────────────────
// oxc-parser — Rust AST walker (native-only)
// ─────────────────────────────────────────────────────────────────────────────

const oxcKey = (node: unknown): string | null => {
  if (!node || typeof node !== "object") return null
  const n = node as { type?: string; name?: string; value?: unknown }
  if (n.type === "Identifier") return n.name ?? null
  if (n.type === "Literal" && typeof n.value === "string") return n.value
  return null
}

const oxcStringVal = (node: unknown): string | null => {
  if (!node || typeof node !== "object") return null
  const n = node as { type?: string; value?: unknown; quasis?: unknown[]; expressions?: unknown[] }
  if (n.type === "Literal" && typeof n.value === "string") return n.value
  if (n.type === "TemplateLiteral" && n.expressions?.length === 0) {
    return (n.quasis as Array<{ value?: { cooked?: string; raw?: string } }>)
      .map((q) => q.value?.cooked ?? q.value?.raw ?? "")
      .join("")
  }
  return null
}

const oxcWalkObject = (node: unknown): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  if (!node || typeof node !== "object") return result
  const n = node as { type?: string; properties?: unknown[] }
  if (n.type !== "ObjectExpression") return result

  for (const prop of n.properties ?? []) {
    if (!prop || typeof prop !== "object") continue
    const p = prop as { type?: string; key?: unknown; value?: unknown }
    if (p.type !== "Property") continue
    const key = oxcKey(p.key)
    if (!key) continue

    const val = p.value
    const strVal = oxcStringVal(val)

    if (strVal !== null) {
      result[key] = strVal
    } else if (val && typeof val === "object") {
      const v = val as { type?: string; elements?: unknown[] }
      if (v.type === "ObjectExpression") {
        result[key] = oxcWalkObject(val)
      } else if (v.type === "ArrayExpression") {
        result[key] = (v.elements as unknown[])
          .filter((el): el is object => el !== null && typeof el === "object")
          .map((el) => oxcWalkObject(el))
      }
    }
  }
  return result
}

const parseWithOxc = (objectStr: string): ParsedComponentConfig => {
  let parseSync: ((filename: string, source: string, options: { sourceType: string }) => { program: unknown; errors: unknown[] }) | null = null

  try {
    const _require = createRequire(import.meta.url)
    parseSync = _require("oxc-parser").parseSync
  } catch {
    throw new Error(
      "FATAL: oxc-parser is required but not available.\n" +
      "This package requires native Rust bindings.\n\n" +
      "Resolution steps:\n" +
      "1. Install oxc-parser: npm install oxc-parser\n" +
      "2. Or build native bindings: npm run build:rust"
    )
  }

  if (!parseSync) {
    throw new Error("FATAL: oxc-parser parseSync is not available.")
  }

  const source = `const __c = ${objectStr}`
  const result = parseSync("config.ts", source, { sourceType: "script" })
  const errors = (result as { errors?: unknown[] }).errors
  const program = (result as { program?: { body?: Array<{ type?: string; declarations?: Array<{ init?: unknown }> }> } }).program ?? result as { body?: Array<{ type?: string; declarations?: Array<{ init?: unknown }> }> }

  if ((errors?.length ?? 0) > 0 || !program.body?.[0]) {
    throw new Error(`Failed to parse component config with oxc-parser: ${JSON.stringify(errors)}`)
  }

  const varDecl = program.body[0]
  if (varDecl.type !== "VariableDeclaration") {
    throw new Error("Expected VariableDeclaration in parsed config")
  }

  const init = varDecl.declarations?.[0]?.init
  if ((init as { type?: string })?.type !== "ObjectExpression") {
    throw new Error("Expected ObjectExpression in parsed config")
  }

  const raw = oxcWalkObject(init)

  const base = typeof raw.base === "string" ? raw.base.trim() : ""

  const variants: Record<string, Record<string, string>> = {}
  const rawVariants = raw.variants
  if (rawVariants && typeof rawVariants === "object" && !Array.isArray(rawVariants)) {
    for (const [vName, vMap] of Object.entries(rawVariants)) {
      if (vMap && typeof vMap === "object" && !Array.isArray(vMap)) {
        variants[vName] = {}
        for (const [vVal, cls] of Object.entries(vMap as Record<string, unknown>)) {
          if (typeof cls === "string") variants[vName][vVal] = cls.trim()
        }
      }
    }
  }

  const compounds: Array<{ class: string; [key: string]: unknown }> = []
  const rawCompounds = raw.compoundVariants
  if (Array.isArray(rawCompounds)) {
    for (const item of rawCompounds) {
      if (item && typeof item.class === "string") {
        compounds.push(item as { class: string })
      }
    }
  }

  const defaults: Record<string, string> = {}
  const rawDefaults = raw.defaultVariants
  if (rawDefaults && typeof rawDefaults === "object" && !Array.isArray(rawDefaults)) {
    for (const [k, v] of Object.entries(rawDefaults)) {
      if (typeof v === "string") defaults[k] = v
    }
  }

  return { base, variants, compounds, defaults }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export const parseComponentConfig = (objectStr: string): ParsedComponentConfig => {
  return parseWithOxc(objectStr)
}
