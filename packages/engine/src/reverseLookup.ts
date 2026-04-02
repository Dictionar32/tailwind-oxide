import type { RuleIR, SourceLocation } from "./ir"

export interface ClassUsage {
  className: string
  source: SourceLocation
  specificity: number
  isOverride: boolean
  variants: string[]
}

export interface ReverseLookupResult {
  property: string
  value: string
  usedInClasses: ClassUsage[]
}

interface ParsedRule {
  className: string
  property: string
  value: string
  specificity: number
  source: SourceLocation
  isImportant: boolean
  variants: string[]
  isOverride: boolean
}

export class ReverseLookup {
  private parsedCache: Map<string, ParsedRule[]> = new Map()
  private static readonly MAX_CACHE_SIZE = 1000

  private parseCSS(css: string): ParsedRule[] {
    const cached = this.parsedCache.get(css)
    if (cached) {
      return cached
    }

    const rules: ParsedRule[] = []
    const classMap = new Map<string, Map<string, ParsedRule>>()

    const selectorRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g
    const propertyRegex = /([a-zA-Z-]+)\s*:\s*([^;]+)/g
    const importantRegex = /!important\s*;?\s*$/

    const lines = css.split("\n")
    const columnState = { offset: 0 }

    for (const [i, line] of lines.entries()) {
      const _lineStart = columnState.offset
      const lineEnd = columnState.offset + line.length + 1

      // Use for...of + matchAll instead of while loop with let match
      for (const match of line.matchAll(selectorRegex)) {
        const className = match[1]
        const selectorStart = match.index
        const lineColumn = selectorStart + 1

        if (!classMap.has(className)) {
          classMap.set(className, new Map())
        }

        const braceMatch = css.indexOf("{", lineEnd - 1)
        if (braceMatch !== -1) {
          const closingBraceMatch = this.findClosingBrace(css, braceMatch)
          const ruleContent = css.substring(braceMatch + 1, closingBraceMatch)

          const variants: string[] = []
          const variantMatch = className.match(/^(.+?)(?::([a-zA-Z0-9_-]+))?$/)
          if (variantMatch?.[2]) {
            variants.push(variantMatch[2])
          }

          const specificity = this.calculateSpecificity(className)
          const source: SourceLocation = {
            file: "inline",
            line: i + 1,
            column: lineColumn,
          }

          // Use for...of + matchAll instead of while loop with let propMatch
          for (const propMatch of ruleContent.matchAll(propertyRegex)) {
            const property = propMatch[1].trim()
            const rawValue = propMatch[2].trim()
            const isImportant = importantRegex.test(rawValue)
            const value = isImportant ? rawValue.replace(importantRegex, "").trim() : rawValue

            const rule: ParsedRule = {
              className,
              property,
              value,
              specificity,
              source,
              isImportant,
              variants,
              isOverride: false,
            }

            rules.push(rule)

            const classRules = classMap.get(className)!
            const existingProp = classRules.get(property)
            if (existingProp) {
              rule.isOverride = true
            }
            classRules.set(property, rule)
          }
        }

      }

      columnState.offset = lineEnd
    }

    // Evict oldest entry if cache is full
    if (this.parsedCache.size >= ReverseLookup.MAX_CACHE_SIZE) {
      const firstKey = this.parsedCache.keys().next().value
      if (firstKey !== undefined) this.parsedCache.delete(firstKey)
    }

    this.parsedCache.set(css, rules)
    return rules
  }

  private findClosingBrace(css: string, start: number): number {
    let depth = 1
    for (let pos = start + 1; pos < css.length; pos++) {
      const char = css[pos]
      if (char === "{") depth++
      else if (char === "}") {
        depth--
        if (depth === 0) return pos
      }
    }
    return css.length
  }

  private calculateSpecificity(className: string): number {
    const pseudoClasses = className.match(/:[a-zA-Z-]+/g) || []
    const attributes = className.match(/\[[^\]]+\]/g) || []
    const pseudoElements = className.match(/::[a-zA-Z-]+/g) || []
    return 1 + pseudoClasses.length * 10 + attributes.length * 10 + pseudoElements.length * 100
  }

  fromCSS(cssProperty: string, cssValue: string, css: string): ReverseLookupResult[] {
    if (!css || !cssProperty) {
      return []
    }

    const rules = this.parseCSS(css)
    const normalizedProperty = cssProperty.toLowerCase()
    const normalizedValue = cssValue.toLowerCase().trim()
    const usages: ClassUsage[] = []

    for (const rule of rules) {
      if (rule.property.toLowerCase() !== normalizedProperty) {
        continue
      }

      const ruleValueLower = rule.value.toLowerCase().trim()
      if (ruleValueLower !== normalizedValue && !ruleValueLower.includes(normalizedValue)) {
        continue
      }

      usages.push({
        className: rule.className,
        source: rule.source,
        specificity: rule.specificity,
        isOverride: rule.isOverride || false,
        variants: rule.variants,
      })
    }

    if (usages.length === 0) {
      return []
    }

    return [{ property: normalizedProperty, value: cssValue, usedInClasses: usages }]
  }

  fromBundle(className: string, css: string): RuleIR[] {
    if (!css || !className) {
      return []
    }

    const rules = this.parseCSS(css)
    const results: RuleIR[] = []

    for (const rule of rules) {
      if (rule.className === className || rule.className.startsWith(`${className}:`)) {
        const ruleIR: RuleIR = {
          id: { value: results.length },
          selector: { value: 0 },
          variantChain: { value: 0 },
          property: { value: 0 },
          value: { value: 0 },
          origin: 2,
          importance: rule.isImportant ? 1 : 0,
          layer: null,
          layerOrder: 0,
          specificity: rule.specificity,
          condition: null,
          conditionResult: 0,
          insertionOrder: results.length,
          fingerprint: "",
          source: rule.source,
        }
        results.push(ruleIR)
      }
    }

    return results
  }

  findDependents(className: string, css: string): string[] {
    if (!css || !className) {
      return []
    }

    const rules = this.parseCSS(css)
    const dependents = new Set<string>()

    const classParts = className.split(":")
    const baseClass = classParts[0]

    for (const rule of rules) {
      const ruleBaseClass = rule.className.split(":")[0]

      if (ruleBaseClass === baseClass && rule.className !== className) {
        dependents.add(rule.className)
      }

      if (rule.className.includes(baseClass) && rule.className !== className) {
        const isVariant = rule.className.includes(":")
        if (isVariant && !rule.className.startsWith(`${className}:`)) {
          dependents.add(rule.className)
        }
      }
    }

    return Array.from(dependents)
  }

  findByProperty(property: string, css: string): ReverseLookupResult[] {
    if (!css || !property) {
      return []
    }

    const rules = this.parseCSS(css)
    const normalizedProperty = property.toLowerCase()

    const valueMap = new Map<string, ClassUsage[]>()

    for (const rule of rules) {
      if (rule.property.toLowerCase() !== normalizedProperty) {
        continue
      }

      const classUsage: ClassUsage = {
        className: rule.className,
        source: rule.source,
        specificity: rule.specificity,
        isOverride: rule.isOverride || false,
        variants: rule.variants,
      }

      let usages = valueMap.get(rule.value)
      if (!usages) {
        usages = []
        valueMap.set(rule.value, usages)
      }
      usages.push(classUsage)
    }

    const results: ReverseLookupResult[] = []
    for (const [value, usedInClasses] of valueMap) {
      results.push({ property: normalizedProperty, value, usedInClasses })
    }

    return results
  }
}
