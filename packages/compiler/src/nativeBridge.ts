/**
 * tailwind-styled-v4 — Native Bridge Loader
 *
 * Uses @tailwind-styled/shared for native binding resolution.
 */

import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import {
  createDebugLogger,
  loadNativeBinding,
  resolveNativeBindingCandidates,
  TwError,
} from "@tailwind-styled/shared"
import { type ComponentMetadata, parseComponentMetadataJson, parseNativeRscJson } from "./schemas"

export type { ComponentMetadata, NativeRscResult } from "./schemas"

const log = createDebugLogger("compiler:native")

// ── Type Exports ────────────────────────────────────────────────────────────────

export interface NativeBridge {
  transform?: (source: string, options?: unknown) => unknown
  transformSourceNative?: (source: string, opts?: Record<string, string>) => NativeTransformResult | null
  extractClassesFromSourceNative?: (source: string) => string[]
  hasTwUsageNative?: (source: string) => boolean
  isAlreadyTransformedNative?: (source: string) => boolean
  analyzeRscNative?: (source: string, filename: string) => {
    isServer: boolean
    needsClientDirective: boolean
    clientReasons: string[]
  }
  analyzeClassesNative?: (
    filesJson: string,
    cwd: string,
    flags: number
  ) => {
    code: string
    classes: string[]
    changed: boolean
    rscJson?: string
    metadataJson?: string
    safelist?: string[]
  } | null
}

export interface NativeTransformResult {
  code: string
  classes: string[]
  changed: boolean
  rscJson?: string
  metadataJson?: string
}

export interface TransformResult {
  code: string
  classes: string[]
  changed: boolean
  rsc?: {
    isServer: boolean
    needsClientDirective: boolean
    clientReasons: string[]
  }
  metadata?: ComponentMetadata[]
}

const NATIVE_UNAVAILABLE_MESSAGE =
  "[tailwind-styled/compiler v5] Native binding is required but not available.\n" +
  "This package requires native Rust bindings. There is no JavaScript fallback.\n" +
  "Please ensure:\n" +
  "  1. The native module is properly installed\n" +
  "  2. You have run: npm run build:rust (or use prebuilt binary)\n" +
  "\n" +
  "For help, see: https://tailwind-styled.dev/docs/install"

// ─────────────────────────────────────────────────────────────────────────────
// Native Bridge - Factory Pattern
// ─────────────────────────────────────────────────────────────────────────────

const getDirname = (): string => {
  if (typeof __dirname !== "undefined") return __dirname
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

const isValidCompilerBridge = (module: unknown): module is NativeBridge => {
  const candidate = module as Partial<NativeBridge> | null | undefined
  return !!(
    candidate &&
    (typeof candidate.transform === "function" ||
      typeof candidate.transformSourceNative === "function" ||
      typeof candidate.extractClassesFromSourceNative === "function" ||
      typeof candidate.hasTwUsageNative === "function")
  )
}

const isRawNativeBinding = (module: unknown): module is Record<string, unknown> => {
  const candidate = module as Record<string, unknown> | null | undefined
  return !!(
    candidate &&
    (typeof candidate["transform_source"] === "function" ||
      typeof candidate["has_tw_usage"] === "function" ||
      typeof candidate["extract_classes_from_source"] === "function" ||
      typeof candidate["parse_classes"] === "function" ||
      typeof candidate["transformSource"] === "function" ||
      typeof candidate["hasTwUsage"] === "function" ||
      typeof candidate["extractClassesFromSource"] === "function" ||
      typeof candidate["parseClasses"] === "function" ||
      typeof candidate["transformSourceNative"] === "function")
  )
}

const adaptRawNativeBinding = (module: Record<string, unknown>): NativeBridge => {
  const cast = module as Record<string, any>

  const hasTwUsage = cast.has_tw_usage ?? cast.hasTwUsage
  const isAlreadyTransformed = cast.is_already_transformed ?? cast.isAlreadyTransformed
  const analyzeRsc = cast.analyze_rsc ?? cast.analyzeRsc
  const analyzeClasses = cast.analyze_classes ?? cast.analyzeClasses
  const transformSource = cast.transform_source ?? cast.transformSource ?? cast.transformSourceNative
  const extractClassesFromSource =
    cast.extract_classes_from_source ?? cast.extractClassesFromSource

  return {
    hasTwUsageNative: hasTwUsage ? (source: string) => hasTwUsage(source) : undefined,
    isAlreadyTransformedNative: isAlreadyTransformed
      ? (source: string) => isAlreadyTransformed(source)
      : undefined,
    analyzeRscNative: analyzeRsc ? (source: string, filename = "") => analyzeRsc(source, filename) : undefined,
    analyzeClassesNative: analyzeClasses
      ? (filesJson: string, cwd: string, flags: number) => analyzeClasses(filesJson, cwd, flags)
      : undefined,
    transformSourceNative: transformSource
      ? (source: string, opts?: Record<string, string>) => transformSource(source, opts)
      : undefined,
    extractClassesFromSourceNative: extractClassesFromSource
      ? (source: string) => extractClassesFromSource(source)
      : undefined,
  }
}

const createBridgeLoader = () => {
  const bridgeState: { current: NativeBridge | null | undefined } = {
    current: undefined,
  }

  const loadBridge = (): NativeBridge => {
    if (bridgeState.current !== undefined) {
      if (bridgeState.current === null) {
        throw new TwError("rust", "NATIVE_BINDING_UNAVAILABLE", NATIVE_UNAVAILABLE_MESSAGE)
      }
      return bridgeState.current
    }

    if (process.env.TWS_NO_NATIVE === "1" || process.env.TWS_NO_NATIVE === "true" ||
        process.env.TWS_NO_RUST === "1" || process.env.TWS_NO_RUST === "true") {
      bridgeState.current = null
      const envVar = process.env.TWS_NO_NATIVE ? "TWS_NO_NATIVE" : "TWS_NO_RUST"
      throw new TwError("rust", "NATIVE_BINDING_UNAVAILABLE",
        `[tailwind-styled/compiler v5] Native binding is required but not available.\n` +
        `The ${envVar} environment variable is set.\n` +
        `This package requires native Rust bindings. There is no JavaScript fallback.\n` +
        `Please ensure:\n` +
        `  1. The native module is properly installed\n` +
        `  2. You have run: npm run build:rust (or use prebuilt binary)\n` +
        `\n` +
        `For help, see: https://tailwind-styled.dev/docs/install`)
    }

    const runtimeDir = getDirname()
    const candidates = resolveNativeBindingCandidates({
      runtimeDir,
      includeDefaultCandidates: true,
    })

    // Also add the npm package name as a candidate
    candidates.unshift("@tailwind-styled/native")

    const { binding, loadErrors } = loadNativeBinding<NativeBridge>({
      runtimeDir,
      candidates,
      isValid: isValidCompilerBridge,
      invalidExportMessage: "Module loaded but missing expected compiler bridge functions",
    })

    if (binding) {
      log(`native bridge loaded successfully`)
      bridgeState.current = binding
      return bridgeState.current
    }

    // Fallback strategy: try to accept raw .node bindings from native folder
    // by wrapping snake_case exported functions into the compiler native bridge API.
    const fallbackRequire = createRequire(path.join(runtimeDir, "noop.cjs"))

    for (const candidate of candidates) {
      try {
        const mod = fallbackRequire(candidate)
        if (isValidCompilerBridge(mod)) {
          log(`native bridge loaded successfully from fallback candidate ${candidate}`)
          bridgeState.current = mod
          return bridgeState.current
        }

        if (isRawNativeBinding(mod)) {
          log(`adapted raw native binding from ${candidate}`)
          bridgeState.current = adaptRawNativeBinding(mod)
          return bridgeState.current
        }
      } catch (err) {
        log(`fallback candidate ${candidate} failed to load: ${(err as Error).message ?? err}`)
      }
    }

    bridgeState.current = null

    const lines = [
      "[tailwind-styled/compiler v5] Native binding not found.",
      "",
      "Tried loading from:",
      ...candidates.map((c) => `  - ${c}`),
    ]

    if (loadErrors.length > 0) {
      lines.push("", "Load errors:")
      for (const error of loadErrors) {
        lines.push(`  - ${error.path}: ${error.message}`)
      }
    }

    lines.push(
      "",
      "Please build the native module:",
      "  npm run build:native",
      "",
      "Or install a prebuilt binary for your platform."
    )

    throw new TwError("rust", "NATIVE_BINDING_NOT_FOUND", lines.join("\n"))
  }

  return {
    get: loadBridge,
    reset: (): void => {
      bridgeState.current = undefined
    },
  }
}

const bridgeLoader = createBridgeLoader()

export const getNativeBridge = bridgeLoader.get

export const resetNativeBridgeCache = bridgeLoader.reset

export const adaptNativeResult = (
  raw: NativeTransformResult
): TransformResult & {
  metadata?: ComponentMetadata[]
} => {
  const rsc = raw.rscJson ? parseNativeRscJson(raw.rscJson) : undefined
  const metadata = raw.metadataJson ? parseComponentMetadataJson(raw.metadataJson) : undefined

  return {
    code: raw.code,
    classes: raw.classes,
    changed: raw.changed,
    rsc,
    metadata,
  }
}
