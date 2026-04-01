import { classToCss } from "@tailwind-styled/analyzer"
import { formatErrorMessage, LRUCache } from "@tailwind-styled/shared"

import { getAnimateBinding } from "./binding"
import type {
  AnimateOptions,
  AnimationRegistryOptions,
  CompiledAnimation,
  KeyframesDefinition,
} from "./types"

const DEFAULT_DURATION = 300
const DEFAULT_EASING = "ease-out"
const DEFAULT_DELAY = 0
const DEFAULT_FILL = "both"
const DEFAULT_ITERATIONS = 1
const DEFAULT_DIRECTION = "normal"
const DEFAULT_CACHE_LIMIT = 512

function normalizeNumber(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(0, Math.trunc(value as number))
}

function normalizeCacheLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_CACHE_LIMIT
  return Math.max(1, Math.trunc(value as number))
}

function normalizeIterations(value: AnimateOptions["iterations"]): string {
  if (value === "infinite") return "infinite"
  if (!Number.isFinite(value)) return String(DEFAULT_ITERATIONS)
  return String(Math.max(0, Math.trunc(value as number)))
}

function stableKeyframesEntries(
  stops: KeyframesDefinition
): Array<{ offset: string; classes: string }> {
  return Object.entries(stops)
    .map(([offset, classes]) => ({ offset, classes }))
    .sort((left, right) => left.offset.localeCompare(right.offset))
}

function animationCacheKey(opts: AnimateOptions): string {
  const normalized = {
    from: opts.from.trim(),
    to: opts.to.trim(),
    duration: normalizeNumber(opts.duration, DEFAULT_DURATION),
    easing: (opts.easing ?? DEFAULT_EASING).trim(),
    delay: normalizeNumber(opts.delay, DEFAULT_DELAY),
    fill: opts.fill ?? DEFAULT_FILL,
    iterations: normalizeIterations(opts.iterations),
    direction: opts.direction ?? DEFAULT_DIRECTION,
    name: opts.name ?? "",
  }
  return JSON.stringify(normalized)
}

function keyframesCacheKey(name: string, stops: KeyframesDefinition): string {
  return `${name}::${JSON.stringify(stableKeyframesEntries(stops))}`
}

function splitClasses(classList: string): string[] {
  return classList
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

async function validateTailwindClasses(
  entries: Array<{ classList: string; context: string }>
): Promise<void> {
  const binding = await getAnimateBinding()
  const unknownByContext = new Map<string, Set<string>>()
  const failures: string[] = []

  for (const entry of entries) {
    const classes = splitClasses(entry.classList)
    if (classes.length === 0) continue

    try {
      if (typeof binding.compileCss === "function") {
        const compiled = binding.compileCss(classes, null)
        if (!compiled) {
          failures.push(
            `Animation ${entry.context} failed validation: native compileCss returned no result.`
          )
          continue
        }
        if (compiled.unknownClasses.length > 0) {
          const bucket = unknownByContext.get(entry.context) ?? new Set<string>()
          for (const className of compiled.unknownClasses) bucket.add(className)
          unknownByContext.set(entry.context, bucket)
        }
        continue
      }

      const checked = await classToCss(classes, { strict: false })
      if (checked.unknownClasses.length > 0) {
        const bucket = unknownByContext.get(entry.context) ?? new Set<string>()
        for (const className of checked.unknownClasses) bucket.add(className)
        unknownByContext.set(entry.context, bucket)
      }
    } catch (error) {
      failures.push(`Animation ${entry.context} failed validation: ${formatErrorMessage(error)}`)
    }
  }

  const issues: string[] = []
  for (const [context, classes] of unknownByContext.entries()) {
    issues.push(
      `Animation ${context} contains unknown Tailwind classes: ${Array.from(classes).join(", ")}`
    )
  }
  issues.push(...failures)

  if (issues.length > 0) {
    throw new Error(issues.join("\n"))
  }
}

export class AnimationRegistry {
  private readonly animations: LRUCache<string, CompiledAnimation>
  private readonly animationBySignature: LRUCache<string, string>
  private readonly keyframesBySignature: LRUCache<string, string>

  constructor(options: AnimationRegistryOptions = {}) {
    const cacheLimit = normalizeCacheLimit(options.cacheLimit)
    this.animations = new LRUCache(cacheLimit)
    this.animationBySignature = new LRUCache(cacheLimit)
    this.keyframesBySignature = new LRUCache(cacheLimit)
  }

  async compileAnimation(opts: AnimateOptions): Promise<CompiledAnimation> {
    const signature = animationCacheKey(opts)
    const existingClassName = this.animationBySignature.get(signature)
    if (existingClassName) {
      const cached = this.animations.get(existingClassName)
      if (cached) return cached
      this.animationBySignature.delete(signature)
    }

    await validateTailwindClasses([
      { classList: opts.from, context: `"from" in ${opts.name ?? "anonymous animation"}` },
      { classList: opts.to, context: `"to" in ${opts.name ?? "anonymous animation"}` },
    ])

    const binding = await getAnimateBinding()
    const duration = normalizeNumber(opts.duration, DEFAULT_DURATION)
    const easing = opts.easing ?? DEFAULT_EASING
    const delay = normalizeNumber(opts.delay, DEFAULT_DELAY)
    const fill = opts.fill ?? DEFAULT_FILL
    const iterations = normalizeIterations(opts.iterations)
    const direction = opts.direction ?? DEFAULT_DIRECTION

    const compiled = binding.compileAnimation?.(
      opts.from,
      opts.to,
      opts.name ?? null,
      duration,
      easing,
      delay,
      fill,
      iterations,
      direction
    )

    if (!compiled) {
      throw new Error(
        `Native animate backend failed to compile animation "${opts.name ?? "anonymous animation"}".`
      )
    }

    const result: CompiledAnimation = {
      className: compiled.className,
      keyframesCss: compiled.keyframesCss,
      animationCss: compiled.animationCss,
    }

    this.animations.set(result.className, result)
    this.animationBySignature.set(signature, result.className)
    return result
  }

  async compileKeyframes(name: string, stops: KeyframesDefinition): Promise<CompiledAnimation> {
    const signature = keyframesCacheKey(name, stops)
    const existingClassName = this.keyframesBySignature.get(signature)
    if (existingClassName) {
      const cached = this.animations.get(existingClassName)
      if (cached) return cached
      this.keyframesBySignature.delete(signature)
    }

    await validateTailwindClasses(
      Object.entries(stops).map(([offset, classes]) => ({
        classList: classes,
        context: `"${offset}" stop in keyframes "${name}"`,
      }))
    )

    const binding = await getAnimateBinding()
    const stopsJson = JSON.stringify(stableKeyframesEntries(stops))
    const compiled = binding.compileKeyframes?.(name, stopsJson)

    if (!compiled) {
      throw new Error(`Native animate backend failed to compile keyframes "${name}".`)
    }

    const result: CompiledAnimation = {
      className: compiled.className,
      keyframesCss: compiled.keyframesCss,
      animationCss: compiled.animationCss,
    }

    this.animations.set(result.className, result)
    this.keyframesBySignature.set(signature, result.className)
    return result
  }

  extractCss(): string {
    const lines: string[] = []
    for (const [, compiled] of this.animations.entries()) {
      lines.push(compiled.keyframesCss)
      lines.push(`.${compiled.className} { ${compiled.animationCss} }`)
    }
    return lines.join("\n\n")
  }

  reset(): void {
    this.animations.clear()
    this.animationBySignature.clear()
    this.keyframesBySignature.clear()
  }

  has(className: string): boolean {
    return this.animations.has(className)
  }
}

export function createAnimationRegistry(options: AnimationRegistryOptions = {}): AnimationRegistry {
  return new AnimationRegistry(options)
}
