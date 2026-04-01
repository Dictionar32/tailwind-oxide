/**
 * tailwind-styled-v4 — Dead Style Eliminator
 *
 * Build-time analysis yang scan component usage dan hapus variant + class
 * yang tidak pernah dipakai. Hasilnya: CSS output yang sangat kecil.
 *
 * Pipeline:
 *   scan all .tsx/.ts files
 *     ↓ extract component usage (JSX props)
 *     ↓ compare dengan registered variants
 *     ↓ mark unused variants as dead
 *     ↓ remove from CSS output
 */

import fs from "node:fs"
import path from "node:path"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VariantUsage {
  /** Component name */
  component: string
  /** Which variant props were used with which values */
  usedValues: Record<string, Set<string>>
  /** Files where component is used */
  usedInFiles: string[]
}

export interface EliminationReport {
  /** Total unused variant values found */
  unusedCount: number
  /** Estimated bytes saved */
  bytesSaved: number
  /** Details per component */
  components: Record<
    string,
    {
      usedVariants: Record<string, string[]>
      unusedVariants: Record<string, string[]>
    }
  >
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Scan files for component usage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract all JSX component usages from source.
 * Finds: <ComponentName prop="value" /> patterns.
 */
export const extractComponentUsage = (
  source: string
): Record<string, Record<string, Set<string>>> => {
  const usage: Record<string, Record<string, Set<string>>> = {}

  // Match JSX elements: <ComponentName ...props...>
  // Only match PascalCase (components, not HTML tags)
  const jsxRe = /<([A-Z][A-Za-z0-9]*)\s([^>]*?)(?:\/?>)/g
  const matches = [...source.matchAll(jsxRe)]

  for (const match of matches) {
    const compName = match[1]
    const propsStr = match[2]

    if (!usage[compName]) usage[compName] = {}

    // Extract static prop="value" patterns
    const propRe = /(\w+)=["']([^"']+)["']/g
    const propMatches = [...propsStr.matchAll(propRe)]

    for (const propMatch of propMatches) {
      const [, propName, propValue] = propMatch
      // Skip non-variant props
      if (["className", "style", "id", "href", "src", "alt", "type"].includes(propName)) continue

      if (!usage[compName][propName]) {
        usage[compName][propName] = new Set()
      }
      usage[compName][propName].add(propValue)
    }
  }

  return usage
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Scan directory for all usages
// ─────────────────────────────────────────────────────────────────────────────

const SCAN_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"]
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".git", "out"])

const scanFiles = (dir: string): string[] => {
  const files: string[] = []

  const walk = (current: string) => {
    if (!fs.existsSync(current)) return
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath)
      }
    }
  }

  walk(dir)
  return files
}

/**
 * Scan entire project for component usage.
 *
 * @param dirs - Directories to scan (e.g. ["src"])
 * @param cwd - Project root
 */
export const scanProjectUsage = (
  dirs: string[],
  cwd = process.cwd()
): Record<string, Record<string, Set<string>>> => {
  const combined: Record<string, Record<string, Set<string>>> = {}

  for (const dir of dirs) {
    const absDir = path.isAbsolute(dir) ? dir : path.resolve(cwd, dir)
    const files = scanFiles(absDir)

    for (const file of files) {
      try {
        const source = fs.readFileSync(file, "utf-8")
        const usage = extractComponentUsage(source)

        for (const [comp, props] of Object.entries(usage)) {
          if (!combined[comp]) combined[comp] = {}
          for (const [prop, values] of Object.entries(props)) {
            if (!combined[comp][prop]) combined[comp][prop] = new Set()
            values.forEach((v) => combined[comp][prop].add(v))
          }
        }
      } catch {
        // skip unreadable
      }
    }
  }

  return combined
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Compare with registered variant configs
// ─────────────────────────────────────────────────────────────────────────────

export interface RegisteredComponent {
  name: string
  variants: Record<string, Record<string, string>> // { size: { sm: "text-sm", lg: "text-lg" } }
}

/**
 * Find unused variant values by comparing registered components with actual usage.
 */
export const findDeadVariants = (
  registered: RegisteredComponent[],
  projectUsage: Record<string, Record<string, Set<string>>>
): EliminationReport => {
  const report: EliminationReport = {
    unusedCount: 0,
    bytesSaved: 0,
    components: {},
  }

  for (const component of registered) {
    const usage = projectUsage[component.name] ?? {}
    const usedVariants: Record<string, string[]> = {}
    const unusedVariants: Record<string, string[]> = {}

    for (const [variantKey, variantValues] of Object.entries(component.variants)) {
      usedVariants[variantKey] = []
      unusedVariants[variantKey] = []

      const usedValueSet = usage[variantKey] ?? new Set()

      for (const [valueName, classes] of Object.entries(variantValues)) {
        if (usedValueSet.has(valueName)) {
          usedVariants[variantKey].push(valueName)
        } else {
          unusedVariants[variantKey].push(valueName)
          report.unusedCount++
          // Rough estimate: avg 20 bytes per class, avg 3 classes per variant
          report.bytesSaved += classes.split(/\s+/).length * 20
        }
      }
    }

    if (report.unusedCount > 0) {
      report.components[component.name] = { usedVariants, unusedVariants }
    }
  }

  return report
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Eliminate dead CSS from compiled output
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter a CSS string to remove selectors for unused classes.
 *
 * @param css - Full CSS string
 * @param deadClasses - Set of class names to remove
 */
export const eliminateDeadCss = (css: string, deadClasses: Set<string>): string => {
  if (deadClasses.size === 0) return css

  // Immutable state interface
  interface ParserState {
    inBlock: boolean
    removeBlock: boolean
    depth: number
    kept: string[]
  }

  // Initial state
  const initialState: ParserState = {
    inBlock: false,
    removeBlock: false,
    depth: 0,
    kept: [],
  }

  // Pure function to process a single line
  const processLine = (state: ParserState, line: string): ParserState => {
    if (!state.inBlock) {
      // Check if this selector matches a dead class
      const isDead = Array.from(deadClasses).some((cls) => {
        const escaped = cls.replace(/[:/[\].!%]/g, "\\$&")
        return line.includes(`.${escaped}`) || line.includes(`.${cls}`)
      })

      if (isDead && line.includes("{")) {
        return {
          inBlock: true,
          removeBlock: true,
          depth: 1,
          kept: state.kept,
        }
      }
      if (line.includes("{") && !line.trim().startsWith("@")) {
        return {
          inBlock: true,
          removeBlock: false,
          depth: 1,
          kept: state.kept,
        }
      }
      return { ...state, kept: [...state.kept, line] }
    }

    // Inside a block
    const newDepth = state.depth + (line.includes("{") ? 1 : 0) - (line.includes("}") ? 1 : 0)
    const isClosed = newDepth <= 0

    if (isClosed && state.removeBlock) {
      return {
        inBlock: false,
        removeBlock: false,
        depth: 0,
        kept: state.kept,
      }
    }

    if (state.removeBlock) {
      return { ...state, depth: Math.max(0, newDepth) }
    }

    return {
      inBlock: !isClosed,
      removeBlock: state.removeBlock,
      depth: Math.max(0, newDepth),
      kept: [...state.kept, line],
    }
  }

  // Use reduce - no mutable state!
  const finalState = css.split("\n").reduce(processLine, initialState)
  return finalState.kept.join("\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS Performance Optimizer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge duplicate CSS rules and deduplicate media queries.
 * Reduces final CSS size for atomic outputs.
 *
 * @example
 * optimizeCss(".tw-a1{padding:16px} .tw-b1{padding:16px}")
 * → ".tw-a1,.tw-b1{padding:16px}"
 */
export const optimizeCss = (css: string): string => {
  // Parse rules into { declaration: selector[] }
  const ruleMap = new Map<string, Set<string>>()
  const mediaBlocks: string[] = []

  // Simple rule parser (handles single-line rules)
  const ruleRe = /^(\.[\w-]+)\s*\{([^}]+)\}$/gm
  const mediaRe = /@media[^{]+\{[\s\S]*?\}\s*\}/g

  // Extract @media blocks first (preserve order)
  const mediaMatches = [...css.matchAll(mediaRe)]
  for (const mediaMatch of mediaMatches) {
    mediaBlocks.push(mediaMatch[0])
  }
  const remaining = css.replace(mediaRe, "")

  // Process regular rules
  const ruleMatches = [...remaining.matchAll(ruleRe)]
  for (const match of ruleMatches) {
    const selector = match[1].trim()
    const declaration = match[2].trim()

    if (!ruleMap.has(declaration)) {
      ruleMap.set(declaration, new Set())
    }
    ruleMap.get(declaration)!.add(selector)
  }

  // Build optimized CSS
  const lines = Array.from(ruleMap.entries()).map(
    ([declaration, selectors]) => `${Array.from(selectors).join(",")} { ${declaration} }`
  )

  // Re-append @media blocks
  lines.push(...mediaBlocks)

  return lines.join("\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// Main: runElimination — full pipeline
// ─────────────────────────────────────────────────────────────────────────────

export interface EliminationOptions {
  dirs?: string[]
  cwd?: string
  registered?: RegisteredComponent[]
  inputCss: string
  verbose?: boolean
}

/**
 * Run full dead style elimination pipeline.
 *
 * @example
 * const result = await runElimination({
 *   dirs: ["src"],
 *   inputCss: fs.readFileSync("dist/styles.css", "utf-8"),
 *   registered: [...componentConfigs],
 * })
 * fs.writeFileSync("dist/styles.min.css", result.css)
 * console.log(result.report)
 */
export const runElimination = (
  opts: EliminationOptions
): {
  css: string
  report: EliminationReport
} => {
  const { dirs = ["src"], cwd = process.cwd(), registered = [], inputCss, verbose = false } = opts

  // Step 1: Scan project
  const usage = scanProjectUsage(dirs, cwd)

  // Step 2: Find dead variants
  const report = findDeadVariants(registered, usage)

  // Step 3: Collect dead classes
  const deadClasses = new Set<string>()
  for (const [, { unusedVariants }] of Object.entries(report.components)) {
    for (const values of Object.values(unusedVariants)) {
      values.forEach((v) => deadClasses.add(v))
    }
  }

  // Step 4: Eliminate + optimize (Zero Let!)
  const css = optimizeCss(eliminateDeadCss(inputCss, deadClasses))

  if (verbose) {
    const saved = (report.bytesSaved / 1024).toFixed(1)
    console.log(`[tailwind-styled-v4] Dead style elimination:`)
    console.log(`  Unused variants: ${report.unusedCount}`)
    console.log(`  Estimated savings: ~${saved}KB`)

    for (const [comp, { unusedVariants }] of Object.entries(report.components)) {
      for (const [variant, values] of Object.entries(unusedVariants)) {
        if (values.length > 0) {
          console.log(`  ${comp}.${variant}: ${values.join(", ")} (unused)`)
        }
      }
    }
  }

  return { css, report }
}
