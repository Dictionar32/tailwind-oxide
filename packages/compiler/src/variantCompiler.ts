/**
 * tailwind-styled-v4 — variantCompiler
 *
 * FIXES:
 *  #01 — Don't pre-merge base into variant table values (double-merge bug)
 *  #06 — Use proper AST parser instead of fragile regex
 *
 * BEFORE (double-merge):
 *   compileVariants: table["size"]["sm"] = "px-4 py-2 text-sm"  ← base included
 *   astTransform:    [base, table["size"][...]]                   ← base AGAIN → DUPE
 *
 * AFTER (correct):
 *   compileVariants: table["size"]["sm"] = "text-sm"             ← variant only
 *   astTransform:    [base, table["size"][...], className]        ← base once, correct
 *
 * Input:
 *   { base: "px-4 py-2", variants: { size: { sm: "text-sm" } } }
 *
 * Output code:
 *   const __vt_abc123 = { size: { sm: "text-sm" } }
 *   // className = [base, table[variant]] → no duplication
 */

import { type ParsedComponentConfig, parseComponentConfig } from "./astParser"
import { normalizeClasses } from "./classMerger"
import type { CompoundCondition } from "@tailwind-styled/shared"

export type { CompoundCondition }

export interface CompiledVariants {
  base: string
  table: Record<string, Record<string, string>>
  compounds: Array<{ class: string } & CompoundCondition>
  defaults: Record<string, string>
}

/**
 * Compile variant config into lookup table.
 *
 * FIX #01: Do NOT pre-merge base into table values.
 * Table contains variant-specific classes only.
 * Base is always injected separately in the component className array.
 */

export function compileVariants(
  base: string,
  variants: Record<string, Record<string, string>>,
  compounds: Array<{ class: string } & CompoundCondition> = [],
  defaults: Record<string, string> = {}
): CompiledVariants {
  const table: Record<string, Record<string, string>> = {}

  for (const key in variants) {
    table[key] = {}
    for (const val in variants[key]) {
      // FIX #01: variant classes only — NOT merged with base
      // Base is injected separately in renderVariantComponent
      table[key][val] = normalizeClasses(variants[key][val])
    }
  }

  return { base, table, compounds, defaults }
}

export function generateVariantCode(id: string, compiled: CompiledVariants): string {
  const { table, compounds, defaults } = compiled

  const tableJson = JSON.stringify(table, null, 2)
  const compoundsJson = JSON.stringify(compounds, null, 2)
  const defaultsJson = JSON.stringify(defaults, null, 2)

  return `const __vt_${id} = ${tableJson};
const __vc_${id} = ${compoundsJson};
const __vd_${id} = ${defaultsJson};`
}

/**
 * Parse object config string.
 * UPGRADE #4: Uses proper AST parser — handles all edge cases.
 *
 * FIX #02 (indirect): classExtractor no longer needs .slice(0, -1) workaround
 * since TEMPLATE_RE trailing space is fixed in twDetector.ts
 */
export function parseObjectConfig(objectStr: string): ParsedComponentConfig {
  return parseComponentConfig(objectStr)
}
