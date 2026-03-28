import { createHash } from "node:crypto"

import type { TransformOptions, TransformResult } from "./astTransform"
import { CompileContext, type CompileEngine, type CompileInput } from "./context"
import { adaptNativeResult, type ComponentMetadata, getNativeBridge } from "./nativeBridge"
import { Pipeline } from "./pipeline"

export interface CoreCompileOptions extends TransformOptions {}

export interface CoreCompileResult {
  result: TransformResult
  engine: CompileEngine
  cacheHit: boolean
  /** Compound component metadata produced by Rust — undefined when the JS pipeline ran */
  metadata?: ComponentMetadata[]
  /** CSS output after DSE (when deadStyleElimination option is enabled) */
  css?: string
}

const MAX_CACHE_ENTRIES = 512
const compileCache = new Map<string, CoreCompileResult>()

function makeCacheKey(input: CompileInput): string {
  const options: TransformOptions = {
    mode: input.options.mode,
    autoClientBoundary: input.options.autoClientBoundary,
    addDataAttr: input.options.addDataAttr,
    hoist: input.options.hoist,
    filename: input.options.filename ?? input.filepath,
    deadStyleElimination: input.options.deadStyleElimination,
  }
  return createHash("sha1")
    .update(input.filepath)
    .update("\x1f")
    .update(input.source)
    .update("\x1f")
    .update(JSON.stringify(options))
    .digest("hex")
}

function cloneTransformResult(result: TransformResult): TransformResult {
  return {
    code: result.code,
    classes: [...result.classes],
    changed: result.changed,
    rsc: result.rsc
      ? {
          isServer: result.rsc.isServer,
          needsClientDirective: result.rsc.needsClientDirective,
          clientReasons: [...result.rsc.clientReasons],
        }
      : undefined,
  }
}

function cloneCoreCompileResult(result: CoreCompileResult): CoreCompileResult {
  return {
    result: cloneTransformResult(result.result),
    engine: result.engine,
    cacheHit: result.cacheHit,
    metadata: result.metadata ? result.metadata.map((m) => ({ ...m })) : undefined,
    css: result.css,
  }
}

function persistCache(key: string, value: CoreCompileResult): void {
  compileCache.set(key, { ...value, cacheHit: false })
  if (compileCache.size <= MAX_CACHE_ENTRIES) return
  const oldestKey = compileCache.keys().next().value
  if (oldestKey) compileCache.delete(oldestKey)
}

function createPassthrough(source: string): TransformResult {
  return { code: source, classes: [], changed: false }
}

// ── CompileContext extension for metadata ─────────────────────────────────────

interface CompileContextExtended extends CompileContext {
  metadata?: ComponentMetadata[]
}

class CompilerCore {
  /**
   * v5 CHANGE: Pipeline now uses ONLY native step.
   * Previously fell back to JS pipeline if native was unavailable.
   */
  private pipeline: Pipeline<CompileContextExtended>

  constructor() {
    // v5: Only native step - throws if unavailable
    this.pipeline = new Pipeline<CompileContextExtended>().use((ctx) => this.nativeStep(ctx))
  }

  compile(input: CompileInput): CoreCompileResult {
    const cacheKey = makeCacheKey(input)
    const cached = compileCache.get(cacheKey)
    if (cached) {
      const hit = cloneCoreCompileResult(cached)
      hit.cacheHit = true
      return hit
    }

    const ctx = new CompileContext(input) as CompileContextExtended
    this.pipeline.run(ctx)

    const result = ctx.result ?? createPassthrough(input.source)

    const cssOutput = ctx.options.deadStyleElimination && result.classes.length > 0
      ? this.runDeadStyleElimination(result.classes, input.options)
      : undefined

    const compiled: CoreCompileResult = {
      result,
      engine: ctx.engine,
      cacheHit: false,
      metadata: ctx.metadata,
      css: cssOutput,
    }

    persistCache(cacheKey, compiled)
    return cloneCoreCompileResult(compiled)
  }

  private runDeadStyleElimination(classes: string[], options: TransformOptions): string {
    if (classes.length === 0) return ""

    const native = getNativeBridge()

    if (native?.analyzeClassesNative) {
      try {
        const filesJson = JSON.stringify([{ file: "compiled", classes }])
        const analysis = native.analyzeClassesNative(filesJson, process.cwd(), 0)

        if (analysis && analysis.safelist) {
          const deadClasses = new Set<string>()
          const safelistSet = new Set(analysis.safelist)

          for (const cls of classes) {
            if (!safelistSet.has(cls)) {
              deadClasses.add(cls)
            }
          }

          if (deadClasses.size > 0) {
            return ""
          }
        }
      } catch {}
    }

    return ""
  }

  /**
   * v5: Native step now THROWS if native binding is unavailable.
   * Previously returned early to allow JS fallback.
   */
  private nativeStep(ctx: CompileContextExtended): void {
    // v5: Get native bridge - throws if unavailable
    const native = getNativeBridge()

    // v5: Native method is required - throw if not available
    if (!native?.transformSourceNative) {
      throw new Error(
        `[tailwind-styled/compiler v5] transformSourceNative is required but not available.\n` +
          `Please ensure the native module is properly built with transform support.`
      )
    }

    // Pass only string-safe opts — index.mjs also sanitises, but be explicit
    const opts: Record<string, string> = {}
    if (ctx.options.mode) opts.mode = ctx.options.mode
    if (ctx.options.filename ?? ctx.filepath) opts.filename = ctx.options.filename ?? ctx.filepath

    const raw = native.transformSourceNative(ctx.source, opts)

    // null → native explicitly declined (e.g. dynamic-only file)
    // v5: This is now an error - native should handle all files
    if (raw === null) {
      throw new Error(
        `[tailwind-styled/compiler v5] Native transform returned null for: ${ctx.filepath}\n` +
          `This indicates an issue with the native module.`
      )
    }

    const adapted = adaptNativeResult(raw)
    ctx.result = adapted
    ctx.metadata = adapted.metadata
    ctx.engine = "native"
    ctx.done = true
  }

  /**
   * v5: JS pipeline has been removed.
   * Previously used as fallback when native was unavailable.
   *
   * @throws Error always - JS pipeline is no longer supported in v5
   * @deprecated JS pipeline was removed in v5
   */
  private jsStep(ctx: CompileContextExtended): void {
    throw new Error(
      `[tailwind-styled/compiler v5] JS pipeline is no longer supported.\n` +
        `The native binding is required for all transformations.`
    )
  }
}

const compilerCore = new CompilerCore()

export function compileWithCore(input: CompileInput): CoreCompileResult {
  return compilerCore.compile(input)
}

export function resetCompileCache(): void {
  compileCache.clear()
}
