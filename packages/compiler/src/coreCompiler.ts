import { createHash } from "node:crypto"

import { TwError } from "@tailwind-styled/shared"
import { type TransformOptions, type TransformResult } from "./astTransform"
import { CompileContext, type CompileEngine, type CompileInput } from "./context"
import { adaptNativeResult, type ComponentMetadata, getNativeBridge } from "./nativeBridge"
import { Pipeline } from "./pipeline"

export interface CoreCompileOptions extends TransformOptions {}

export interface CoreCompileResult {
  result: TransformResult
  engine: CompileEngine
  cacheHit: boolean
  metadata?: ComponentMetadata[]
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
    metadata: result.metadata ? result.metadata.map((item) => ({ ...item })) : undefined,
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

interface CompileContextExtended extends CompileContext {
  metadata?: ComponentMetadata[]
}

class CompilerCore {
  private pipeline: Pipeline<CompileContextExtended>

  constructor() {
    this.pipeline = new Pipeline<CompileContextExtended>()
      .use((ctx) => this.nativeStep(ctx))
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
    const cssOutput =
      ctx.options.deadStyleElimination && result.classes.length > 0
        ? this.runDeadStyleElimination(result.classes)
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

  private runDeadStyleElimination(classes: string[]): string {
    if (classes.length === 0) return ""

    const native = getNativeBridge()

    if (native?.analyzeClassesNative) {
      try {
        const filesJson = JSON.stringify([{ file: "compiled", classes }])
        const analysis = native.analyzeClassesNative(filesJson, process.cwd(), 0)

        if (analysis?.safelist) {
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
      } catch (err) {
        console.debug("[deadStyleElimination] native analyze failed, skipping:", (err as Error).message ?? err)
      }
    }

    return ""
  }

  private nativeStep(ctx: CompileContextExtended): void {
    const native = getNativeBridge()
    if (!native?.transformSourceNative) {
      throw new TwError(
        "rust",
        "NATIVE_TRANSFORM_UNAVAILABLE",
        "FATAL: Native binding 'transformSourceNative' is required but not available.\n" +
        "This package requires native Rust bindings.\n\n" +
        "Resolution steps:\n" +
        "1. Build the native Rust module: npm run build:rust"
      )
    }

    const opts: Record<string, string> = {}
    if (ctx.options.mode) opts.mode = ctx.options.mode
    if (ctx.options.filename ?? ctx.filepath) {
      opts.filename = ctx.options.filename ?? ctx.filepath
    }

    const raw = native.transformSourceNative(ctx.source, opts)
    if (raw === null) {
      throw new TwError(
        "rust",
        "NATIVE_TRANSFORM_RETURNED_NULL",
        "FATAL: Native transformSourceNative returned null.\n" +
        "This package requires native Rust bindings to transform source code."
      )
    }

    const adapted = adaptNativeResult(raw)
    ctx.result = adapted
    ctx.metadata = adapted.metadata
    ctx.engine = "native"
    ctx.done = true
  }
}

const compilerCore = new CompilerCore()

export function compileWithCore(input: CompileInput): CoreCompileResult {
  return compilerCore.compile(input)
}

export function resetCompileCache(): void {
  compileCache.clear()
}
