import {
  CascadeResolutionId,
  type CascadeResolutionIR,
  CascadeStage,
  ConditionResult,
  type PropertyBucketIR,
  type PropertyId,
  type ResolutionCause,
  type ResolutionReason,
  type RuleId,
  type RuleIR,
  type StyleGraphIR,
} from "./ir"

// ─────────────────────────────────────────────────────────────────────────
// ID Generator - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const resolutionIdState = {
  counter: 0,
}

const generateResolutionId = (): CascadeResolutionId => {
  const id = new CascadeResolutionId(resolutionIdState.counter++)
  return id
}

const _resetResolutionIdGenerator = (): void => {
  resolutionIdState.counter = 0
}

export function compareCascade(a: RuleIR, b: RuleIR): number {
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

export function buildResolutionReason(winner: RuleIR, loser: RuleIR): ResolutionReason {
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

  if (winner.conditionResult === ConditionResult.Inactive) {
    causes.push({ type: "InactiveCondition", condition: "..." })
  }

  const finalDecision = causes
    .map((c) => {
      switch (c.type) {
        case "LowerOrigin":
          return `lower origin (${c.loserOrigin} < ${c.winnerOrigin})`
        case "LowerLayer":
          return `lower layer (${c.loserLayer} < ${c.winnerLayer})`
        case "LowerImportance":
          return "lower importance"
        case "LowerSpecificity":
          return `lower specificity (${c.delta})`
        case "EarlierOrder":
          return `earlier order (${c.delta})`
        case "InactiveCondition":
          return "inactive condition"
      }
    })
    .join(", ")

  return { causes, finalDecision }
}

export function determineCascadeStage(winner: RuleIR, loser: RuleIR | undefined): CascadeStage {
  if (!loser) return CascadeStage.Order

  if (winner.origin !== loser.origin) return CascadeStage.Origin
  if (winner.layerOrder !== loser.layerOrder) return CascadeStage.Layer
  if (winner.importance !== loser.importance) return CascadeStage.Importance
  if (winner.specificity !== loser.specificity) return CascadeStage.Specificity
  return CascadeStage.Order
}

export function resolveProperty(rules: RuleIR[]): CascadeResolutionIR {
  const activeRules = rules.filter((r) => r.conditionResult !== ConditionResult.Inactive)

  if (activeRules.length === 0) {
    throw new Error("No active rules for property")
  }

  activeRules.sort(compareCascade)

  const winner = activeRules[0]
  const losers = activeRules.slice(1)

  const _resolutionReasons = losers.map((loser) => ({
    loser,
    reason: buildResolutionReason(winner, loser),
  }))

  const stage = determineCascadeStage(winner, losers[0])

  return {
    id: generateResolutionId(),
    property: winner.property,
    winner: winner.id,
    losers: losers.map((r) => r.id),
    reason: buildResolutionReason(winner, losers[0]),
    stage,
  }
}

// biome-ignore lint: kept for documentation
interface RuleWithProperty {
  rule: RuleIR
  propertyId: PropertyId
}

export class CascadeResolver {
  private propertyBuckets: Map<PropertyId, PropertyBucketIR> = new Map()
  private rules: Map<RuleId, RuleIR> = new Map()
  private styleGraph: StyleGraphIR = {
    ruleConflicts: new Map(),
  }
  private resolutions: Map<number, CascadeResolutionIR> = new Map()
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

  resolveProperty(property: PropertyId): CascadeResolutionIR | null {
    const bucket = this.propertyBuckets.get(property)
    if (!bucket || bucket.rules.length === 0) {
      return null
    }

    const rules = bucket.rules
      .map((id) => this.rules.get(id))
      .filter((r): r is RuleIR => r !== undefined)

    if (rules.length === 0) {
      return null
    }

    const resolution = resolveProperty(rules)
    this.resolutions.set(resolution.id.value, resolution)

    this.addConflictEdge(resolution.winner, resolution.losers)

    return resolution
  }

  resolveAllProperties(): Map<PropertyId, CascadeResolutionIR> {
    const resolutions = new Map<PropertyId, CascadeResolutionIR>()

    for (const [property, _bucket] of this.propertyBuckets) {
      const resolution = this.resolveProperty(property)
      if (resolution) {
        resolutions.set(property, resolution)
      }
    }

    return resolutions
  }

  resolveForClass(classRuleIds: RuleId[]): Map<PropertyId, CascadeResolutionIR> {
    const classRules: RuleIR[] = []

    for (const ruleId of classRuleIds) {
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

    const resolutions = new Map<PropertyId, CascadeResolutionIR>()

    for (const [property, rules] of propertyMap) {
      if (rules.length > 0) {
        const resolution = resolveProperty(rules)
        this.resolutions.set(resolution.id.value, resolution)
        resolutions.set(property, resolution)
        this.addConflictEdge(resolution.winner, resolution.losers)
      }
    }

    return resolutions
  }

  getStyleGraph(): StyleGraphIR {
    return this.styleGraph
  }

  getRule(ruleId: RuleId): RuleIR | undefined {
    return this.rules.get(ruleId)
  }

  getBucket(property: PropertyId): PropertyBucketIR | undefined {
    return this.propertyBuckets.get(property)
  }

  getAllBuckets(): Map<PropertyId, PropertyBucketIR> {
    return this.propertyBuckets
  }

  getResolution(id: CascadeResolutionId): CascadeResolutionIR | undefined {
    return this.resolutions.get(id.value)
  }

  registerClass(className: string, ruleIds: RuleId[]): void {
    this.classRules.set(className, ruleIds)
  }

  getClassRules(className: string): RuleId[] | undefined {
    return this.classRules.get(className)
  }

  resolveByClassName(
    className: string
  ): { resolvedProperties: Map<PropertyId, CascadeResolutionIR> } | null {
    const ruleIds = this.classRules.get(className)
    if (!ruleIds) {
      return null
    }

    const resolutions = this.resolveForClass(ruleIds)
    return { resolvedProperties: resolutions }
  }

  private addConflictEdge(winner: RuleId, losers: readonly RuleId[]): void {
    for (const loser of losers) {
      const existing = this.styleGraph.ruleConflicts.get(winner) || []
      if (!existing.includes(loser)) {
        this.styleGraph.ruleConflicts.set(winner, [...existing, loser])
      }
    }
  }
}
