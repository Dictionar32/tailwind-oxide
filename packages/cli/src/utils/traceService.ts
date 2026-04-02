import { type CssCompileResult, compileCssFromClasses } from "@tailwind-styled/compiler/internal"
import {
  ConditionId,
  ConditionResult,
  createFingerprint,
  Importance,
  LayerId,
  Origin,
  PropertyId,
  RuleId,
  type RuleIR,
  type SourceLocation,
  ValueId,
  VariantChainId,
} from "@tailwind-styled/engine/internal"
import { scanWorkspace } from "@tailwind-styled/scanner"
import { TwError, wrapUnknownError } from "@tailwind-styled/shared"

interface EngineTraceResult {
  class: string
  definedAt: SourceLocation
  variants: Array<{ name: string; value: string; source: SourceLocation }>
  rules: Array<{
    property: string
    value: string
    applied: boolean
    reason: string | null
    source: SourceLocation
    specificity: number
  }>
  conflicts: Array<{
    property: string
    winner: string
    loser: string
    stage: string
    causes: string[]
  }>
  finalStyle: Array<{ property: string; value: string }>
}

interface ParsedSelector {
  className: string
  variants: string[]
  pseudoClasses: string[]
  mediaQuery: string | null
}

interface ParsedRule {
  selector: ParsedSelector
  property: string
  value: string
  important: boolean
}

interface RuleTrace {
  property: string
  value: string
  applied: boolean
  reason: string | null
  source: SourceLocation
  specificity: number
}

interface ConflictTrace {
  property: string
  winner: string
  loser: string
  stage: string
  causes: string[]
}

interface EngineVariantTrace {
  name: unknown
  value: unknown
  source: SourceLocation
}

interface EngineRuleTrace {
  property: unknown
  value: unknown
  applied: unknown
  reason: unknown
  source: SourceLocation | undefined
  specificity: unknown
}

interface EngineConflictTrace {
  property: unknown
  winner: unknown
  loser: unknown
  stage: unknown
  causes: unknown[]
}

interface EngineFinalStyleTrace {
  property: unknown
  value: unknown
}

// ─────────────────────────────────────────────────────────────────────────
// ID Generator - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const createIdGenerator = () => {
  const _counters = {
    ruleId: 0,
    selectorId: 0,
    propertyId: 0,
    valueId: 0,
    layerId: 0,
    conditionId: 0,
    insertionOrder: 0,
  }

  const generateRuleId = (): RuleId => new RuleId(_counters.ruleId++)
  const generateSelectorId = (): RuleId => new RuleId(_counters.selectorId++)
  const generatePropertyId = (propertyName: string): PropertyId =>
    new PropertyId(_counters.propertyId++, propertyName)
  const generateValueId = (valueName: string): ValueId =>
    new ValueId(_counters.valueId++, valueName)
  const generateLayerId = (): LayerId => new LayerId(_counters.layerId++)
  const generateConditionId = (): ConditionId => new ConditionId(_counters.conditionId++)
  const getNextInsertionOrder = (): number => _counters.insertionOrder++

  const reset = (): void => {
    _counters.ruleId = 0
    _counters.selectorId = 0
    _counters.propertyId = 0
    _counters.valueId = 0
    _counters.layerId = 0
    _counters.conditionId = 0
    _counters.insertionOrder = 0
  }

  return {
    generateRuleId,
    generateSelectorId,
    generatePropertyId,
    generateValueId,
    generateLayerId,
    generateConditionId,
    getNextInsertionOrder,
    reset,
  }
}

const idGenerator = createIdGenerator()

const layerMap: Map<string, LayerId> = new Map()
const layerOrderMap: Map<string, number> = new Map()

const LAYER_ORDER: Record<string, number> = {
  base: 0,
  components: 1,
  utilities: 2,
  tailwind: 3,
}

function getOrCreateLayerId(layerName: string): LayerId | null {
  const existing = layerMap.get(layerName)
  if (existing) return existing

  const order = LAYER_ORDER[layerName] ?? 4
  const layerId = idGenerator.generateLayerId()
  layerMap.set(layerName, layerId)
  layerOrderMap.set(layerName, order)
  return layerId
}

function calculateSpecificity(selector: ParsedSelector): number {
  const classCount = selector.className.split(":").length * 10
  const pseudoCount = selector.pseudoClasses.length * 10
  const mediaCount = selector.mediaQuery ? 1000 : 0
  return classCount + pseudoCount + mediaCount
}

function parseSelector(selectorText: string): ParsedSelector {
  const mediaMatch = selectorText.match(/^@media[^{]+\{(.+)$/)
  const mediaQuery = mediaMatch ? mediaMatch[0] : null
  const baseClass = (mediaMatch ? mediaMatch[1].trim() : selectorText).startsWith(".")
    ? (mediaMatch ? mediaMatch[1].trim() : selectorText).slice(1)
    : mediaMatch
      ? mediaMatch[1].trim()
      : selectorText

  const escapedColon = /\\:/g
  const baseClassClean = baseClass.startsWith(".") ? baseClass.slice(1) : baseClass
  const baseClassFinal = baseClassClean
    .replace(escapedColon, "\u200B")
    .split(":")[0]
    .replace(/\u200B/g, ":")

  const variantRegex =
    /^(hover|focus|active|visited|checked|disabled|required|optional|first|last|odd|even|before|after|placeholder|file|selection|backdrop|group|peer)/i
  const pseudoRegex = /^:([a-zA-Z-]+)$/

  const parts = baseClassFinal.split(":").slice(1)
  const { variants, pseudoClasses } = parts.reduce(
    (acc, part) => {
      const normalized = `:${part}`
      if (variantRegex.test(part)) {
        acc.variants.push(part)
      } else if (pseudoRegex.test(normalized)) {
        acc.pseudoClasses.push(normalized)
      } else {
        acc.variants.push(part)
      }
      return acc
    },
    { variants: [] as string[], pseudoClasses: [] as string[] }
  )

  return {
    className: baseClassFinal,
    variants,
    pseudoClasses,
    mediaQuery,
  }
}

function parseDeclaration(
  block: string
): Array<{ property: string; value: string; important: boolean }> {
  const declarations: Array<{ property: string; value: string; important: boolean }> = []

  for (const match of block.matchAll(/([a-zA-Z-]+)\s*:\s*([^;!]+)(!important)?/g)) {
    const property = match[1].trim()
    const value = match[2].trim()
    const important = match[3] !== undefined

    declarations.push({ property, value, important })
  }

  return declarations
}

function parseRules(css: string): ParsedRule[] {
  const rules: ParsedRule[] = []

  for (const match of css.matchAll(/([^{}]+)\s*\{([^{}]*)\}/g)) {
    const selectorText = match[1].trim()
    const declarationBlock = match[2].trim()

    if (selectorText.startsWith("@")) {
      continue
    }

    const parsedSelector = parseSelector(selectorText)
    const declarations = parseDeclaration(declarationBlock)

    for (const decl of declarations) {
      rules.push({
        selector: parsedSelector,
        property: decl.property,
        value: decl.value,
        important: decl.important,
      })
    }
  }

  return rules
}

function detectLayerFromSelector(className: string): string | null {
  const layerPrefixes = ["tw-", "tailwind-"]

  for (const prefix of layerPrefixes) {
    if (className.startsWith(prefix)) {
      return "tailwind"
    }
  }

  return null
}

function parseCssToIr(
  css: string,
  prefix: string = ""
): { rules: RuleIR[]; classToRuleIds: Map<string, RuleId[]> } {
  idGenerator.reset()

  layerMap.clear()
  layerOrderMap.clear()

  const rules: RuleIR[] = []
  const classToRuleIds: Map<string, RuleId[]> = new Map()

  const parsedRules = parseRules(css)

  for (const parsedRule of parsedRules) {
    const className = prefix + parsedRule.selector.className
    const specificity = calculateSpecificity(parsedRule.selector)

    const layerName = detectLayerFromSelector(className)
    const layer = layerName ? getOrCreateLayerId(layerName) : null
    const layerOrder = layerName ? (layerOrderMap.get(layerName) ?? 4) : 4

    const selectorId = idGenerator.generateSelectorId()
    const propertyId = idGenerator.generatePropertyId(parsedRule.property)
    const valueId = idGenerator.generateValueId(parsedRule.value)

    const conditionId = parsedRule.selector.mediaQuery ? idGenerator.generateConditionId() : null
    const conditionResult = parsedRule.selector.mediaQuery
      ? ConditionResult.Unknown
      : ConditionResult.Unknown

    const fingerprint = createFingerprint([className, parsedRule.property, parsedRule.value])

    const ruleId = idGenerator.generateRuleId()

    const rule: RuleIR = {
      id: ruleId,
      selector: selectorId,
      variantChain: new VariantChainId(0),
      property: propertyId,
      value: valueId,
      origin: Origin.AuthorNormal,
      importance: parsedRule.important ? Importance.Important : Importance.Normal,
      layer,
      layerOrder,
      specificity,
      condition: conditionId,
      conditionResult,
      insertionOrder: idGenerator.getNextInsertionOrder(),
      fingerprint,
      source: {
        file: "",
        line: 1,
        column: 1,
      },
    }

    rules.push(rule)

    const existingRuleIds = classToRuleIds.get(className) || []
    existingRuleIds.push(ruleId)
    classToRuleIds.set(className, existingRuleIds)
  }

  return { rules, classToRuleIds }
}

interface PropertyBucket {
  property: PropertyId
  rules: RuleId[]
}

interface ResolutionEntry {
  winner: RuleId
}

class CascadeResolver {
  private propertyBuckets: Map<PropertyId, PropertyBucket> = new Map()
  private rules: Map<RuleId, RuleIR> = new Map()
  private classRules: Map<string, RuleId[]> = new Map()

  addRule(rule: RuleIR): void {
    this.rules.set(rule.id, rule)

    const property = rule.property
    const existingBucket = this.propertyBuckets.get(property)

    if (!existingBucket) {
      this.propertyBuckets.set(property, {
        property,
        rules: [rule.id],
      })
    } else {
      this.propertyBuckets.set(property, {
        ...existingBucket,
        rules: [...existingBucket.rules, rule.id],
      })
    }
  }

  addRules(rules: RuleIR[]): void {
    for (const rule of rules) {
      this.addRule(rule)
    }
  }

  getRule(ruleId: RuleId): RuleIR | undefined {
    return this.rules.get(ruleId)
  }

  registerClass(className: string, ruleIds: RuleId[]): void {
    this.classRules.set(className, ruleIds)
  }

  getClassRules(className: string): RuleId[] | undefined {
    return this.classRules.get(className)
  }

  resolveByClassName(
    className: string
  ): { resolvedProperties: Map<PropertyId, ResolutionEntry> } | null {
    const ruleIds = this.classRules.get(className)
    if (!ruleIds) {
      return null
    }

    const classRules: RuleIR[] = []
    for (const ruleId of ruleIds) {
      const rule = this.rules.get(ruleId)
      if (rule) {
        classRules.push(rule)
      }
    }

    const propertyMap = new Map<PropertyId, RuleIR[]>()
    for (const rule of classRules) {
      const existing = propertyMap.get(rule.property) || []
      existing.push(rule)
      propertyMap.set(rule.property, existing)
    }

    const resolved = new Map<PropertyId, ResolutionEntry>()
    for (const [property, rules] of propertyMap) {
      if (rules.length > 0) {
        const activeRules = rules.filter((r) => r.conditionResult !== ConditionResult.Inactive)
        if (activeRules.length > 0) {
          activeRules.sort((a, b) => {
            const originDiff = b.origin - a.origin
            if (originDiff !== 0) return originDiff
            const layerDiff = b.layerOrder - a.layerOrder
            if (layerDiff !== 0) return layerDiff
            const importanceDiff = b.importance - a.importance
            if (importanceDiff !== 0) return importanceDiff
            const specificityDiff = b.specificity - a.specificity
            if (specificityDiff !== 0) return specificityDiff
            return b.insertionOrder - a.insertionOrder
          })

          const winner = activeRules[0]
          resolved.set(property, { winner: winner.id })
        }
      }
    }

    return { resolvedProperties: resolved }
  }
}

function trace(className: string, resolver: CascadeResolver): EngineTraceResult {
  const provenance = {
    className,
    source: { file: "", line: 0, column: 0 } as SourceLocation,
    variants: new Map(),
    rules: new Map(),
  }

  const classRuleIds = resolver.getClassRules(className)
  const allRules: RuleIR[] = []

  if (classRuleIds) {
    for (const ruleId of classRuleIds) {
      const rule = resolver.getRule(ruleId)
      if (rule) {
        allRules.push(rule)
      }
    }
  }

  for (const rules of provenance.rules.values()) {
    allRules.push(...rules)
  }

  const rulesByProperty = new Map<string, RuleIR[]>()
  for (const rule of allRules) {
    const propKey = rule.property.toString()
    if (!rulesByProperty.has(propKey)) {
      rulesByProperty.set(propKey, [])
    }
    rulesByProperty.get(propKey)!.push(rule)
  }

  const ruleTraces: RuleTrace[] = []
  const conflictTraces: ConflictTrace[] = []

  for (const [property, rules] of rulesByProperty) {
    if (rules.length === 0) continue

    const activeRules = rules.filter((r) => r.conditionResult !== ConditionResult.Inactive)
    if (activeRules.length === 0) continue

    activeRules.sort((a, b) => {
      const originDiff = b.origin - a.origin
      if (originDiff !== 0) return originDiff
      const layerDiff = b.layerOrder - a.layerOrder
      if (layerDiff !== 0) return layerDiff
      const importanceDiff = b.importance - a.importance
      if (importanceDiff !== 0) return importanceDiff
      const specificityDiff = b.specificity - a.specificity
      if (specificityDiff !== 0) return specificityDiff
      return b.insertionOrder - a.insertionOrder
    })

    const winnerRule = activeRules[0]
    const losers = activeRules.slice(1)

    ruleTraces.push({
      property: property,
      value: winnerRule.value.toString(),
      applied: true,
      reason: null,
      source: winnerRule.source,
      specificity: winnerRule.specificity,
    })

    for (const loserRule of losers) {
      ruleTraces.push({
        property: property,
        value: loserRule.value.toString(),
        applied: false,
        reason: "lower specificity",
        source: loserRule.source,
        specificity: loserRule.specificity,
      })

      conflictTraces.push({
        property: property,
        winner: winnerRule.value.toString(),
        loser: loserRule.value.toString(),
        stage: "Specificity",
        causes: ["lower specificity"],
      })
    }
  }

  const resolved = resolver.resolveByClassName(className)
  const finalStyle: Array<{ property: string; value: string }> = []

  if (resolved) {
    for (const [propId, resolution] of resolved.resolvedProperties) {
      const winnerRule = allRules.find((r) => r.id.value === resolution.winner.value)
      finalStyle.push({
        property: propId.toString(),
        value: winnerRule?.value.toString() ?? "",
      })
    }
  }

  return {
    class: className,
    definedAt: provenance.source,
    variants: Array.from(provenance.variants.values()),
    rules: ruleTraces,
    conflicts: conflictTraces,
    finalStyle,
  }
}

export interface TraceResult {
  class: string
  definedAt: { file: string; line: number; column: number }
  variants: Array<{ name: string; value: string; source: { file: string; line: number } }>
  rules: Array<{
    property: string
    value: string
    applied: boolean
    reason: string | null
    source: { file: string; line: number }
    specificity: number
  }>
  conflicts: Array<{
    property: string
    winner: string
    loser: string
    stage: string
    causes: string[]
  }>
  finalStyle: Array<{ property: string; value: string }>
}

export interface TraceOptions {
  root?: string
}

export async function traceClass(className: string, options?: TraceOptions): Promise<TraceResult> {
  const root = options?.root ?? process.cwd()

  const scanResult = await scanWorkspace(root, {
    includeExtensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
    ignoreDirectories: ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"],
    useCache: false,
  })

  if (!scanResult.uniqueClasses.includes(className)) {
    throw TwError.fromCompile(
      "TRACE_CLASS_NOT_FOUND",
      `Class "${className}" not found in workspace scan. Make sure the class is used in your source files.`
    )
  }

  const cssResult: CssCompileResult = (() => {
    try {
      return compileCssFromClasses([className], {})
    } catch (error) {
      throw wrapUnknownError(
        "compile",
        "TRACE_COMPILE_FAILED",
        `Failed to compile CSS for class "${className}": ${error instanceof Error ? error.message : String(error)}`
      )
    }
  })()

  if (!cssResult.css || cssResult.css.trim() === "") {
    throw TwError.fromCompile(
      "TRACE_NO_CSS_RULES",
      `Class "${className}" has no CSS rules. The class may not be a valid Tailwind class.`
    )
  }

  const { rules, classToRuleIds } = parseCssToIr(cssResult.css)

  const ruleIds = classToRuleIds.get(className)
  if (!ruleIds || ruleIds.length === 0) {
    throw TwError.fromCompile("TRACE_NO_RULES_FOUND", `No rules found for class "${className}" after parsing CSS.`)
  }

  const resolver = new CascadeResolver()
  resolver.addRules(rules)
  resolver.registerClass(className, ruleIds)

  const engineTraceResult = trace(className, resolver)

  return convertTraceResult(engineTraceResult)
}

// Helper function to safely convert any value to string
// Handles PropertyId, ValueId, RuleId, etc. that have a .value property
function _toString(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return String(value)

  // For ID objects like PropertyId, ValueId, etc. - they have a .value property
  if (typeof value === "object" && value !== null) {
    const idValue = (value as { value?: unknown }).value
    if (idValue !== undefined) {
      return String(idValue)
    }
    const toStrFn = (value as { toString?: () => string }).toString
    if (typeof toStrFn === "function") {
      const result = toStrFn.call(value)
      if (typeof result === "string") return result
    }
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

// Helper function to safely convert any value to string
function safeToString(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return String(value)
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return String(value)

  // For any object - try various methods
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>
    const name = obj.name
    if (typeof name === "string" && name.length > 0) {
      return name
    }

    const objValue = obj.value
    if (objValue !== undefined) {
      return String(objValue)
    }

    const objValueOf = obj.valueOf
    if (typeof objValueOf === "function") {
      try {
        const vo = objValueOf.call(value)
        if (vo !== value) return String(vo)
      } catch {}
    }

    const toStr = obj.toString
    if (typeof toStr === "function") {
      try {
        const result = toStr.call(value)
        if (typeof result === "string" && result !== "[object Object]") {
          return result
        }
      } catch {}
    }

    return "?"
  }

  return String(value)
}

function convertTraceResult(engineResult: EngineTraceResult): TraceResult {
  return {
    class: safeToString(engineResult.class),
    definedAt: {
      file: safeToString(engineResult.definedAt.file),
      line: Number(engineResult.definedAt.line) || 0,
      column: Number(engineResult.definedAt.column) || 0,
    },
    variants: engineResult.variants.map((v: EngineVariantTrace) => ({
      name: safeToString(v.name),
      value: safeToString(v.value),
      source: {
        file: safeToString(v.source?.file ?? ""),
        line: Number(v.source?.line ?? 0),
      },
    })),
    rules: engineResult.rules.map((r: EngineRuleTrace) => ({
      property: safeToString(r.property),
      value: safeToString(r.value),
      applied: Boolean(r.applied),
      reason: r.reason ? safeToString(r.reason) : null,
      source: {
        file: safeToString(r.source?.file ?? ""),
        line: Number(r.source?.line ?? 0),
      },
      specificity: Number(r.specificity ?? 0),
    })),
    conflicts: engineResult.conflicts.map((c: EngineConflictTrace) => ({
      property: safeToString(c.property),
      winner: safeToString(c.winner),
      loser: safeToString(c.loser),
      stage: safeToString(c.stage),
      causes: c.causes?.map(safeToString) ?? [],
    })),
    finalStyle: engineResult.finalStyle.map((f: EngineFinalStyleTrace) => ({
      property: safeToString(f.property),
      value: safeToString(f.value),
    })),
  }
}
