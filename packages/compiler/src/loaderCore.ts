/**
 * tailwind-styled-v5 - loaderCore
 *
 * Unified loader path:
 *   boundary validation -> incremental precheck -> core compiler (native/js pipeline) -> finalize
 */

import { TwError } from "@tailwind-styled/shared"
import type { TransformOptions, TransformResult } from "./astTransform"
import { compileWithCore } from "./coreCompiler"
import { getIncrementalEngine, parseClassesToNodes } from "./incrementalEngine"
import type { ComponentMetadata } from "./nativeBridge"
import { registerFileClasses } from "./routeCssCollector"
import { LoaderOptionsSchema } from "./schemas"
import { getBucketEngine } from "./styleBucketSystem"

export interface LoaderOptions extends TransformOptions {
  routeCss?: boolean
  incremental?: boolean
  verbose?: boolean
  autoClientBoundary?: boolean
}

export interface LoaderContext {
  filepath: string
  source: string
  options: LoaderOptions
  isDev?: boolean
}

export interface LoaderOutput {
  code: string
  changed: boolean
  classes: string[]
  rsc?: TransformResult["rsc"]
  engine?: "native" | "js" | "none"
  cacheHit?: boolean
  /** Compound component metadata — only present when Rust engine ran */
  metadata?: ComponentMetadata[]
}

const SKIP_PATHS = ["node_modules", ".next", ".rspack-dist", ".turbo", "dist/", "out/"]

export function shouldSkipFile(filepath: string): boolean {
  return SKIP_PATHS.some((p) => filepath.includes(p)) || !/\.[jt]sx?$/.test(filepath)
}

export function runLoaderTransform(ctx: LoaderContext): LoaderOutput {
  const { filepath, source } = ctx
  const passthrough: LoaderOutput = { code: source, changed: false, classes: [] }

  // ── Boundary validation: validate loader options with Zod ──
  const optionsParse = LoaderOptionsSchema.safeParse(ctx.options)
  if (!optionsParse.success) {
    throw TwError.fromCompile(
      "LOADER_OPTIONS_INVALID",
      `Invalid loader options for ${filepath}: ${optionsParse.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    )
  }
  const options = optionsParse.data

  if (shouldSkipFile(filepath)) return passthrough

  try {
    if (options.incremental !== false) {
      const engine = getIncrementalEngine({ verbose: options.verbose })
      const precheck = engine.processFile(filepath, source, [])
      if (!precheck.changed) return passthrough
    }

    const compiled = compileWithCore({
      filepath,
      source,
      options: { ...options, filename: filepath },
    })

    if (!compiled.result.changed) return passthrough

    return finalize(
      compiled.result,
      filepath,
      options,
      compiled.engine,
      compiled.cacheHit,
      compiled.metadata
    )
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      const name = filepath.split(/[/\\]/).pop()
      console.warn(`[tailwind-styled] Transform failed for ${name}:`, err)
    }
    return passthrough
  }
}

function finalize(
  result: TransformResult,
  filepath: string,
  options: LoaderOptions,
  engine: "native" | "js" | "none",
  cacheHit: boolean,
  metadata?: ComponentMetadata[]
): LoaderOutput {
  if (!result.changed) {
    return { code: result.code, changed: false, classes: [] }
  }

  if (options.routeCss && result.classes.length > 0) {
    registerFileClasses(filepath, result.classes)
  }

  if (options.incremental !== false) {
    try {
      const engineInst = getIncrementalEngine({ verbose: options.verbose })
      const nodes = parseClassesToNodes(result.classes)
      const diff = engineInst.processFile(filepath, result.code, nodes)
      getBucketEngine().applyDiff(diff.diff)
    } catch {
      // non-fatal
    }
  }

  if (options.verbose) {
    const env = result.rsc?.isServer ? "server" : "client"
    const name = filepath.split(/[/\\]/).pop()
    const pathHint = result.rsc ? ` (${env})` : ""
    const cacheText = cacheHit ? " cache-hit" : ""
    const metaText = metadata?.length ? ` [${metadata.length} compound]` : ""
    console.log(
      `[tailwind-styled] ${name} -> ${result.classes.length} classes${pathHint} [${engine}${cacheText}]${metaText}`
    )
  }

  return {
    code: result.code,
    changed: result.changed,
    classes: result.classes,
    rsc: result.rsc,
    engine,
    cacheHit,
    metadata,
  }
}
