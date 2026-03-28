/**
 * tailwind-styled-v4 — Style Bucket System
 */

import type { StyleNode } from "./incrementalEngine"

export type StyleBucket =
  | "reset"
  | "layout"
  | "spacing"
  | "sizing"
  | "typography"
  | "visual"
  | "interaction"
  | "responsive"
  | "unknown"

const BUCKET_ORDER: StyleBucket[] = [
  "reset",
  "layout",
  "spacing",
  "sizing",
  "typography",
  "visual",
  "interaction",
  "responsive",
  "unknown",
]

const PROPERTY_BUCKET_MAP: Record<string, StyleBucket> = {
  display: "layout",
  position: "layout",
  flex: "layout",
  "flex-direction": "layout",
  "flex-wrap": "layout",
  "flex-grow": "layout",
  "flex-shrink": "layout",
  "flex-basis": "layout",
  grid: "layout",
  "grid-template": "layout",
  "grid-column": "layout",
  "grid-row": "layout",
  "align-items": "layout",
  "align-self": "layout",
  "align-content": "layout",
  "justify-content": "layout",
  "justify-items": "layout",
  "justify-self": "layout",
  "place-items": "layout",
  "place-content": "layout",
  overflow: "layout",
  "overflow-x": "layout",
  "overflow-y": "layout",
  "z-index": "layout",
  float: "layout",
  clear: "layout",
  visibility: "layout",
  padding: "spacing",
  "padding-top": "spacing",
  "padding-bottom": "spacing",
  "padding-left": "spacing",
  "padding-right": "spacing",
  "padding-inline": "spacing",
  "padding-block": "spacing",
  margin: "spacing",
  "margin-top": "spacing",
  "margin-bottom": "spacing",
  "margin-left": "spacing",
  "margin-right": "spacing",
  "margin-inline": "spacing",
  "margin-block": "spacing",
  gap: "spacing",
  "column-gap": "spacing",
  "row-gap": "spacing",
  inset: "spacing",
  "inset-inline": "spacing",
  "inset-block": "spacing",
  top: "spacing",
  bottom: "spacing",
  left: "spacing",
  right: "spacing",
  width: "sizing",
  height: "sizing",
  "max-width": "sizing",
  "min-width": "sizing",
  "max-height": "sizing",
  "min-height": "sizing",
  "aspect-ratio": "sizing",
  "font-size": "typography",
  "font-weight": "typography",
  "font-family": "typography",
  "font-style": "typography",
  "line-height": "typography",
  "letter-spacing": "typography",
  "text-align": "typography",
  "text-decoration": "typography",
  "text-transform": "typography",
  "text-overflow": "typography",
  "white-space": "typography",
  "word-break": "typography",
  "word-wrap": "typography",
  "vertical-align": "typography",
  color: "visual",
  background: "visual",
  "background-color": "visual",
  "background-image": "visual",
  "background-size": "visual",
  "background-position": "visual",
  "background-repeat": "visual",
  border: "visual",
  "border-top": "visual",
  "border-bottom": "visual",
  "border-left": "visual",
  "border-right": "visual",
  "border-inline": "visual",
  "border-block": "visual",
  "border-color": "visual",
  "border-width": "visual",
  "border-style": "visual",
  "border-radius": "visual",
  "box-shadow": "visual",
  opacity: "visual",
  outline: "visual",
  "outline-color": "visual",
  "outline-width": "visual",
  fill: "visual",
  stroke: "visual",
  "text-shadow": "visual",
  "mix-blend-mode": "visual",
  "object-fit": "visual",
  "object-position": "visual",
  cursor: "interaction",
  "pointer-events": "interaction",
  "user-select": "interaction",
  transition: "interaction",
  "transition-property": "interaction",
  "transition-duration": "interaction",
  "transition-timing-function": "interaction",
  "transition-delay": "interaction",
  transform: "interaction",
  translate: "interaction",
  rotate: "interaction",
  scale: "interaction",
  animation: "interaction",
  "will-change": "interaction",
  "scroll-behavior": "interaction",
  "scroll-snap-type": "interaction",
  "box-sizing": "reset",
  appearance: "reset",
  all: "reset",
}

export const classifyNode = (node: StyleNode): StyleBucket => {
  if (node.modifier?.startsWith("@")) return "responsive"

  const declarations = node.declaration
    .split(";")
    .map((d: string) => d.trim())
    .filter(Boolean)
  const firstProp = declarations[0]?.split(":")[0]?.trim()

  if (!firstProp) return "unknown"

  if (PROPERTY_BUCKET_MAP[firstProp]) return PROPERTY_BUCKET_MAP[firstProp]

  for (const [prefix, bucket] of Object.entries(PROPERTY_BUCKET_MAP)) {
    if (firstProp.startsWith(prefix)) return bucket
  }

  return "unknown"
}

export interface BucketStats {
  totalNodes: number
  perBucket: Record<StyleBucket, number>
}

export class BucketEngine {
  private buckets: Map<StyleBucket, Map<string, StyleNode>>

  constructor() {
    this.buckets = new Map()
    for (const b of BUCKET_ORDER) {
      this.buckets.set(b, new Map())
    }
  }

  add(node: StyleNode): void {
    const bucket = classifyNode(node)
    this.buckets.get(bucket)!.set(node.atomicClass, node)
  }

  remove(atomicClass: string): void {
    for (const bucket of this.buckets.values()) {
      if (bucket.delete(atomicClass)) break
    }
  }

  applyDiff(diff: { added: StyleNode[]; removed: string[] }): void {
    for (const node of diff.added) this.add(node)
    for (const cls of diff.removed) this.remove(cls)
  }

  emit(comments = true): string {
    const sections: string[] = []

    for (const bucketName of BUCKET_ORDER) {
      const nodes = this.buckets.get(bucketName)!
      if (nodes.size === 0) continue

      const rules = Array.from(nodes.values()).map(nodeToCSS)

      if (rules.length === 0) continue

      if (comments) {
        sections.push(`/* ── ${bucketName} ── */`)
      }
      sections.push(...rules)
    }

    return sections.join("\n")
  }

  emitLayered(): string {
    const layerNames = BUCKET_ORDER.filter(
      (b) => b !== "unknown" && this.buckets.get(b)!.size > 0
    ).map((b) => `tw-${b}`)

    if (layerNames.length === 0) return ""

    const parts: string[] = [`@layer ${layerNames.join(", ")};`, ""]

    for (const bucketName of BUCKET_ORDER) {
      const nodes = this.buckets.get(bucketName)!
      if (nodes.size === 0) continue

      const rules = Array.from(nodes.values()).map(nodeToCSS).join("\n  ")
      parts.push(`@layer tw-${bucketName} {\n  ${rules}\n}`)
    }

    return parts.join("\n")
  }

  allNodes(): StyleNode[] {
    const all: StyleNode[] = []
    for (const bucket of this.buckets.values()) {
      for (const node of bucket.values()) {
        all.push(node)
      }
    }
    return all
  }

  stats(): BucketStats {
    // Use reduce instead of mutable let total
    const perBucket = Array.from(this.buckets.entries()).reduce(
      (acc, [name, nodes]) => {
        acc[name] = nodes.size
        return acc
      },
      {} as Record<StyleBucket, number>
    )
    const totalNodes = Object.values(perBucket).reduce((sum, count) => sum + count, 0)
    return { totalNodes, perBucket }
  }

  clear(): void {
    for (const bucket of this.buckets.values()) {
      bucket.clear()
    }
  }
}

const nodeToCSS = (node: StyleNode): string => {
  const { atomicClass, declaration, modifier } = node

  if (!modifier) return `.${atomicClass}{${declaration}}`
  if (modifier.startsWith("@")) return `${modifier}{.${atomicClass}{${declaration}}}`
  return `.${atomicClass}${modifier}{${declaration}}`
}

export const bucketSort = (nodes: StyleNode[]): StyleNode[] => {
  const bucketIndex = Object.fromEntries(BUCKET_ORDER.map((b, i) => [b, i])) as Record<
    StyleBucket,
    number
  >

  return [...nodes].sort((a, b) => {
    const ai = bucketIndex[classifyNode(a)]
    const bi = bucketIndex[classifyNode(b)]
    return ai - bi
  })
}

export interface ConflictWarning {
  property: string
  classes: string[]
  bucket: StyleBucket
  message: string
}

export const detectConflicts = (nodes: StyleNode[]): ConflictWarning[] => {
  const seen = new Map<string, StyleNode>()
  const warnings: ConflictWarning[] = []

  for (const node of nodes) {
    if (node.modifier?.startsWith("@")) continue

    const firstProp = node.declaration.split(":")[0]?.trim()
    if (!firstProp) continue

    const key = `${firstProp}::${node.modifier ?? ""}`
    const prev = seen.get(key)

    if (prev) {
      warnings.push({
        property: firstProp,
        classes: [prev.twClass, node.twClass],
        bucket: classifyNode(node),
        message: `Possible conflict: "${prev.twClass}" and "${node.twClass}" both set "${firstProp}"`,
      })
    } else {
      seen.set(key, node)
    }
  }

  return warnings
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────────

const createBucketEngine = () => {
  const bucketEngineState: { current: BucketEngine | null } = {
    current: null,
  }

  return {
    get: (): BucketEngine => {
      if (!bucketEngineState.current) bucketEngineState.current = new BucketEngine()
      return bucketEngineState.current
    },
    reset: (): void => {
      bucketEngineState.current = null
    },
  }
}

// Module-level singleton via factory
const bucketEngineFactory = createBucketEngine()

export const getBucketEngine = bucketEngineFactory.get
export const resetBucketEngine = bucketEngineFactory.reset
