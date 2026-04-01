/**
 * tailwind-styled-v4 — Static Variant Compiler
 *
 * Upgrade enterprise #3: Static variant compilation.
 * Semua kombinasi variant di-compile saat build → runtime = 0.
 *
 * BEFORE (runtime):
 *   <Button size="lg" intent="primary" />
 *   → runtime picks classes → [base, variants.size.lg, variants.intent.primary]
 *   → Runtime join + twMerge
 *   → className computed on every render
 *
 * AFTER (static):
 *   <Button size="lg" intent="primary" />
 *   → compiler already generated: "tw-btn-lg-primary" at build time
 *   → className is a direct lookup: O(1), pure string
 *   → Runtime = 0
 *
 * For a Button with 3 sizes × 4 intents = 12 combinations — all pre-compiled.
 *
 * @example
 * const compiled = compileAllVariantCombinations({
 *   componentId: "Button",
 *   base: "px-4 py-2 font-medium rounded",
 *   variants: {
 *     size:   { sm: "h-8 text-sm", md: "h-10 text-base", lg: "h-12 text-lg" },
 *     intent: { primary: "bg-blue-500 text-white", ghost: "border text-current" },
 *   },
 *   defaultVariants: { size: "md", intent: "primary" },
 * })
 *
 * // Generates:
 * // compiled["sm|primary"] = "px-4 py-2 font-medium rounded h-8 text-sm bg-blue-500 text-white"
 * // compiled["md|primary"] = "px-4 py-2 font-medium rounded h-10 text-base bg-blue-500 text-white"
 * // ...all 6 combinations
 */

import { twMerge } from "tailwind-merge"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CompoundCondition = Record<string, string>

export interface StaticVariantConfig {
  componentId: string
  base: string
  variants: Record<string, Record<string, string>>
  compoundVariants?: Array<{ class: string } & CompoundCondition>
  defaultVariants?: Record<string, string>
}

export interface CompiledVariantTable {
  /** componentId */
  id: string
  /** Combination key → final merged className */
  table: Record<string, string>
  /** Ordered variant keys (determines key format) */
  keys: string[]
  /** Default variant combination key */
  defaultKey: string
  /** Stats */
  combinations: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Combination key format
// key = "variant1Value|variant2Value|..." (sorted by variant key name)
// ─────────────────────────────────────────────────────────────────────────────

export function makeCombinationKey(values: Record<string, string>, sortedKeys: string[]): string {
  return sortedKeys.map((k) => values[k] ?? "").join("|")
}

// ─────────────────────────────────────────────────────────────────────────────
// Cartesian product — generate all variant combinations
// ─────────────────────────────────────────────────────────────────────────────

function cartesian(variants: Record<string, string[]>): Record<string, string>[] {
  const keys = Object.keys(variants).sort()
  if (keys.length === 0) return [{}]

  return keys.reduce(
    (combinations, key) => {
      const values = variants[key]
      return combinations.flatMap((combo) => values.map((val) => ({ ...combo, [key]: val })))
    },
    [{}] as Record<string, string>[]
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Compound variant resolution
// ─────────────────────────────────────────────────────────────────────────────

function resolveCompound(
  compounds: Array<{ class: string } & CompoundCondition>,
  combination: Record<string, string>
): string {
  const classes: string[] = []
  for (const compound of compounds) {
    const { class: cls, ...conditions } = compound
    const match = Object.entries(conditions).every(([k, v]) => combination[k] === v)
    if (match) classes.push(cls)
  }
  return classes.join(" ")
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: compile all combinations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-compile all variant combinations into a static lookup table.
 *
 * Called at build time by the compiler.
 * Output is injected as a const into the transformed file.
 */
export function compileAllVariantCombinations(config: StaticVariantConfig): CompiledVariantTable {
  const { componentId, base, variants, compoundVariants = [], defaultVariants = {} } = config

  const variantValueSets: Record<string, string[]> = {}
  for (const [key, values] of Object.entries(variants)) {
    variantValueSets[key] = Object.keys(values)
  }

  const sortedKeys = Object.keys(variantValueSets).sort()
  const combinations = cartesian(variantValueSets)
  const table: Record<string, string> = {}

  for (const combo of combinations) {
    const key = makeCombinationKey(combo, sortedKeys)

    const variantClasses = sortedKeys.map((k) => variants[k][combo[k]] ?? "").filter(Boolean)

    const compoundClasses = resolveCompound(compoundVariants, combo)

    const finalClass = twMerge(base, ...variantClasses, compoundClasses || "").trim()

    table[key] = finalClass
  }

  const defaultValues = sortedKeys.reduce<Record<string, string>>((acc, k) => {
    acc[k] = defaultVariants[k] ?? variantValueSets[k][0] ?? ""
    return acc
  }, {})
  const defaultKey = makeCombinationKey(defaultValues, sortedKeys)

  return {
    id: componentId,
    table,
    keys: sortedKeys,
    defaultKey,
    combinations: combinations.length,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Code generation — emit static table as TypeScript const
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate the JavaScript code for a compiled variant table.
 * This code is injected into the transformed file by the AST compiler.
 *
 * @example Output:
 * const __svt_Button = {"sm|primary":"px-4 py-2 h-8 text-sm bg-blue-500 text-white",...}
 * const __svt_Button_keys = ["intent","size"]
 * const __svt_Button_default = "md|primary"
 */
export function generateStaticVariantCode(compiled: CompiledVariantTable): string {
  const { id, table, keys, defaultKey } = compiled

  return [
    `/* @tw-static-variants: ${id} — ${compiled.combinations} combinations */`,
    `const __svt_${id} = ${JSON.stringify(table)};`,
    `const __svt_${id}_keys = ${JSON.stringify(keys)};`,
    `const __svt_${id}_default = ${JSON.stringify(defaultKey)};`,
  ].join("\n")
}

/**
 * Generate the runtime lookup function for a statically compiled variant table.
 * This replaces the variant resolver in the component.
 *
 * Runtime code is minimal — just a string lookup from a pre-compiled table.
 */
export function generateStaticVariantLookup(id: string): string {
  return `function __svt_${id}_lookup(props) {
  var key = __svt_${id}_keys.map(function(k){ return props[k] || ""; }).join("|");
  return __svt_${id}[key] || __svt_${id}[__svt_${id}_default] || "";
}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime: StaticVariantResolver
// Used by createComponent when compiler is NOT running (dev mode)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runtime fallback for static variant compilation.
 * Creates a lookup table on first use, caches for subsequent renders.
 *
 * In production (with compiler), the component never calls this —
 * it uses the pre-compiled __svt_* table directly.
 */
export class StaticVariantResolver {
  private cache: Map<string, string>
  private compiled: CompiledVariantTable

  constructor(config: StaticVariantConfig) {
    this.compiled = compileAllVariantCombinations(config)
    this.cache = new Map(Object.entries(this.compiled.table))
  }

  resolve(props: Record<string, string>): string {
    const key = makeCombinationKey(
      this.compiled.keys.reduce<Record<string, string>>((acc, k) => {
        acc[k] = String(props[k] ?? "")
        return acc
      }, {}),
      this.compiled.keys
    )
    return this.cache.get(key) ?? this.cache.get(this.compiled.defaultKey) ?? ""
  }

  get stats() {
    return {
      id: this.compiled.id,
      combinations: this.compiled.combinations,
      keys: this.compiled.keys,
    }
  }
}
