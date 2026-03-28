/**
 * tailwind-styled-v4 — Native Bridge Loader
 *
 * Uses @tailwind-styled/shared for native binding resolution.
 */

import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  createDebugLogger,
  loadNativeBinding,
  resolveNativeBindingCandidates,
  resolveRuntimeDir,
  TwError,
} from "@tailwind-styled/shared"
import {
  parseComponentMetadataJson,
  parseNativeRscJson,
  type ComponentMetadata,
} from "./schemas"

export type { ComponentMetadata, NativeRscResult } from "./schemas"

const log = createDebugLogger("compiler:native")

// ── Type Exports ────────────────────────────────────────────────────────────────

export interface NativeBridge {
  transform?: (source: string, options?: unknown) => unknown
  extractClassesFromSourceNative?: (source: string) => string[]
  analyzeClassesNative?: (filesJson: string, cwd: string, flags: number) => {
    safelist?: string[]
    [key: string]: unknown
  }
  transformSourceNative?: (source: string, opts?: Record<string, string>) => {
    code: string
    classes: string[]
    changed: boolean
    rscJson?: string
    metadataJson?: string
  } | null
  hasTwUsageNative?: (source: string) => boolean
  isAlreadyTransformedNative?: (source: string) => boolean
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

const createBridgeLoader = () => {
  const bridgeState: { current: NativeBridge | null | undefined } = {
    current: undefined,
  }

  const loadBridge = (): NativeBridge => {
    if (bridgeState.current !== undefined) {
      if (bridgeState.current === null) {
        throw new TwError(
          "rust",
          "NATIVE_BINDING_UNAVAILABLE",
          "[tailwind-styled/compiler v5] Native binding is required but not available.\n" +
            "Please ensure:\n" +
            "  1. The native module is properly installed\n" +
            "  2. You have run: npm run build:rust (or use prebuilt binary)\n" +
            "  3. TWS_NO_NATIVE environment variable is not set\n" +
            "\n" +
            "For help, see: https://tailwind-styled.dev/docs/install"
        )
      }
      return bridgeState.current
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

export const adaptNativeResult = (raw: NativeTransformResult): TransformResult & {
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
