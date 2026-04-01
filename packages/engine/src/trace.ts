import {
  CascadeResolutionId,
  type CascadeResolutionIR,
  CascadeStage,
  type PropertyId,
  type ResolutionCause,
  type RuleIR,
  type SourceLocation,
} from "./ir"
import type { CascadeResolver } from "./resolver"

export interface VariantTrace {
  name: string
  value: string
  source: SourceLocation
}

export interface RuleTrace {
  property: string
  value: string
  applied: boolean
  reason: string | null
  source: SourceLocation
  specificity: number
}

export interface ConflictTrace {
  property: string
  winner: string
  loser: string
  stage: string
  causes: string[]
}

export interface FinalStyleProperty {
  property: string
  value: string
}

export interface TraceResult {
  class: string
  definedAt: SourceLocation
  variants: VariantTrace[]
  rules: RuleTrace[]
  conflicts: ConflictTrace[]
  finalStyle: FinalStyleProperty[]
}

export interface ProvenanceData {
  className: string
  source: SourceLocation
  variants: Map<string, VariantTrace>
  rules: Map<string, RuleIR[]>
}

export function buildProvenanceChain(className: string): ProvenanceData {
  return {
    className,
    source: { file: "", line: 0, column: 0 },
    variants: new Map(),
    rules: new Map(),
  }
}

export function trace(className: string, resolver: CascadeResolver): TraceResult {
  const provenance = buildProvenanceChain(className)

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

    const resolution = (() => {
      try {
        return resolvePropertyTraced(rules)
      } catch {
        return null
      }
    })()

    if (!resolution) continue

    const winnerRule = rules.find((r) => r.id.value === resolution.winner.value)
    if (winnerRule) {
      ruleTraces.push({
        property: property,
        value: winnerRule.value.toString(),
        applied: true,
        reason: null,
        source: winnerRule.source,
        specificity: winnerRule.specificity,
      })
    }

    for (const loserId of resolution.losers) {
      const loserRule = rules.find((r) => r.id.value === loserId.value)
      if (loserRule) {
        ruleTraces.push({
          property: property,
          value: loserRule.value.toString(),
          applied: false,
          reason: resolution.reason.finalDecision,
          source: loserRule.source,
          specificity: loserRule.specificity,
        })

        conflictTraces.push({
          property: property,
          winner: winnerRule?.value.toString() ?? "",
          loser: loserRule.value.toString(),
          stage: CascadeStage[resolution.stage],
          causes: resolution.reason.causes.map((c) => formatCause(c)),
        })
      }
    }
  }

  const resolved = resolveByClassNameTraced(className, resolver)
  const finalStyle: FinalStyleProperty[] = []

  if (resolved) {
    for (const [propId, resolution] of resolved.resolvedProperties) {
      if (resolution) {
        const winnerRule = allRules.find((r) => r.id.value === resolution.winner.value)
        finalStyle.push({
          property: propId.toString(),
          value: winnerRule?.value.toString() ?? "",
        })
      }
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

function formatCause(c: ResolutionCause): string {
  switch (c.type) {
    case "LowerOrigin":
      return `lower origin`
    case "LowerLayer":
      return `lower layer`
    case "LowerImportance":
      return `lower importance`
    case "LowerSpecificity":
      return `specificity ${c.delta}`
    case "EarlierOrder":
      return `earlier order ${c.delta}`
    case "InactiveCondition":
      return `inactive condition`
  }
}

function resolvePropertyTraced(rules: RuleIR[]): CascadeResolutionIR {
  const activeRules = rules.filter((r) => r.conditionResult !== 1)

  if (activeRules.length === 0) {
    throw new Error("No active rules for property")
  }

  activeRules.sort(compareCascadeTraced)

  const winner = activeRules[0]
  const losers = activeRules.slice(1)

  const stage = determineCascadeStageTraced(winner, losers[0])

  return {
    id: new CascadeResolutionId(0),
    property: winner.property,
    winner: winner.id,
    losers: losers.map((r) => r.id),
    reason: buildResolutionReasonTraced(winner, losers[0]),
    stage,
  }
}

function compareCascadeTraced(a: RuleIR, b: RuleIR): number {
  const originDiff = b.origin - a.origin
  if (originDiff !== 0) return originDiff

  const layerDiff = b.layerOrder - a.layerOrder
  if (layerDiff !== 0) return layerDiff

  const importanceDiff = b.importance - a.importance
  if (importanceDiff !== 0) return importanceDiff

  const specificityDiff = b.specificity - a.specificity
  if (specificityDiff !== 0) return specificityDiff

  return b.insertionOrder - a.insertionOrder
}

function buildResolutionReasonTraced(
  winner: RuleIR,
  loser: RuleIR
): { causes: readonly ResolutionCause[]; finalDecision: string } {
  const causes: ResolutionCause[] = []

  if (winner.origin !== loser.origin) {
    causes.push({
      type: "LowerOrigin",
      winnerOrigin: winner.origin,
      loserOrigin: loser.origin,
    })
  }

  if (winner.layerOrder !== loser.layerOrder) {
    causes.push({
      type: "LowerLayer",
      winnerLayer: winner.layer?.toString() ?? "none",
      loserLayer: loser.layer?.toString() ?? "none",
    })
  }

  if (winner.importance !== loser.importance) {
    causes.push({ type: "LowerImportance" })
  }

  if (winner.specificity !== loser.specificity) {
    causes.push({
      type: "LowerSpecificity",
      delta: winner.specificity - loser.specificity,
    })
  }

  if (winner.insertionOrder !== loser.insertionOrder) {
    causes.push({
      type: "EarlierOrder",
      delta: winner.insertionOrder - loser.insertionOrder,
    })
  }

  if (winner.conditionResult === 1) {
    causes.push({ type: "InactiveCondition", condition: "..." })
  }

  const finalDecision = causes.map((c) => formatCause(c)).join(", ")

  return { causes, finalDecision }
}

function determineCascadeStageTraced(winner: RuleIR, loser: RuleIR | undefined): CascadeStage {
  if (!loser) return CascadeStage.Order

  if (winner.origin !== loser.origin) return CascadeStage.Origin
  if (winner.layerOrder !== loser.layerOrder) return CascadeStage.Layer
  if (winner.importance !== loser.importance) return CascadeStage.Importance
  if (winner.specificity !== loser.specificity) return CascadeStage.Specificity
  return CascadeStage.Order
}

function resolveByClassNameTraced(
  className: string,
  resolver: CascadeResolver
): { resolvedProperties: Map<PropertyId, CascadeResolutionIR> } | null {
  return resolver.resolveByClassName(className)
}
