/**
 * Scanner — Rust native bridge
 *
 * Wraps the Rust scan_workspace and extract_classes_from_source functions.
 * Uses @tailwind-styled/shared for native binding resolution.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  createDebugLogger,
  loadNativeBinding,
  resolveNativeBindingCandidates,
  TwError,
} from "@tailwind-styled/shared"

const log = createDebugLogger("scanner:native")

// ESM-compatible __dirname equivalent
function getDirname(): string {
  if (typeof __dirname !== "undefined") {
    return __dirname
  }
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

interface NativeScannerBinding {
  scanWorkspace?: (
    root: string,
    extensions: string[] | null
  ) => {
    files: Array<{ file: string; classes: string[]; hash: string }>
    totalFiles: number
    uniqueClasses: string[] | null
  } | null
  extractClassesFromSource?: (source: string) => string[] | null
  hashFileContent?: (content: string) => string | null
  cacheRead?: (cachePath: string) => {
    entries: Array<{
      file: string
      classes: string[]
      hash: string
      mtimeMs: number
      size: number
      hitCount: number
    }>
    version: number
  } | null
  cacheWrite?: (
    cachePath: string,
    entries: Array<{
      file: string
      classes: string[]
      hash: string
      mtimeMs: number
      size: number
      hitCount: number
    }>
  ) => boolean
  cachePriority?: (
    mtimeMs: number,
    size: number,
    cachedMtimeMs: number,
    cachedSize: number,
    cachedHitCount: number,
    cachedLastSeenMs: number,
    nowMs: number
  ) => number
}

const isValidScannerBinding = (module: unknown): module is NativeScannerBinding => {
  const candidate = module as Partial<NativeScannerBinding> | null | undefined
  return !!(
    candidate &&
    (candidate.scanWorkspace ||
      candidate.extractClassesFromSource ||
      candidate.hashFileContent ||
      candidate.cacheRead ||
      candidate.cacheWrite)
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Native Bridge - Factory Pattern
// ─────────────────────────────────────────────────────────────────────────

const createScannerBridgeLoader = () => {
  const _state = {
    binding: undefined as NativeScannerBinding | null | undefined,
    loadError: null as string | null,
    candidatePaths: [] as string[],
  }

  const throwNativeBindingError = (): never => {
    const lines = [
      "FATAL: Native scanner binding not found.",
      "",
      "This package requires the Rust native binding 'tailwind_styled_parser.node'.",
      "The binding was not found in any of these paths:",
      ..._state.candidatePaths.map((p) => `  - ${p}`),
      "",
    ]

    if (_state.loadError) {
      lines.push("Load error:", `  ${_state.loadError}`, "")
    }

    lines.push(
      "To fix this, run:",
      "  npm run build:rust",
      "",
      "This will build the native Rust module from the 'native/' directory.",
      "If you're using this package in a CI/CD environment, ensure Rust toolchain is installed",
      "and 'npm run build:rust' is executed before running tests or building."
    )

    throw new TwError("rust", "SCANNER_NATIVE_BINDING_NOT_FOUND", lines.join("\n"))
  }

  const scannerGetBinding = (): NativeScannerBinding => {
    const cachedBinding = _state.binding
    if (cachedBinding !== undefined) {
      if (cachedBinding !== null) {
        return cachedBinding
      }
      return throwNativeBindingError()
    }

    const runtimeDir = getDirname()
    const candidates = resolveNativeBindingCandidates({
      runtimeDir,
      includeDefaultCandidates: true,
    })

    _state.candidatePaths = candidates

    const { binding, loadErrors } = loadNativeBinding<NativeScannerBinding>({
      runtimeDir,
      candidates,
      isValid: isValidScannerBinding,
      invalidExportMessage: "Module loaded but missing expected scanner binding functions",
    })

    if (binding) {
      log(`scanner native binding loaded successfully`)
      _state.binding = binding
      return _state.binding
    }

    if (loadErrors.length > 0) {
      _state.loadError = loadErrors.map((e) => `${e.path}: ${e.message}`).join("; ")
    }

    _state.binding = null
    return throwNativeBindingError()
  }

  return {
    get: scannerGetBinding,
    scannerGetBinding,
    reset: (): void => {
      _state.binding = undefined
      _state.loadError = null
      _state.candidatePaths = []
    },
  }
}

const scannerBridgeLoader = createScannerBridgeLoader()
const scannerGetBinding = scannerBridgeLoader.get

export const resetScannerBridgeCache = scannerBridgeLoader.reset

export function scanWorkspaceNative(
  root: string,
  extensions?: string[]
): ReturnType<NonNullable<NativeScannerBinding["scanWorkspace"]>> {
  return scannerGetBinding().scanWorkspace!(root, extensions ?? null)
}

export function extractClassesNative(source: string): string[] {
  const result = scannerGetBinding().extractClassesFromSource?.(source)
  if (result === null || result === undefined) {
    throw new TwError(
      "rust",
      "SCANNER_EXTRACT_FAILED",
      "Native extractClassesFromSource returned null/undefined"
    )
  }
  return result
}

export function hashContentNative(content: string): string {
  const result = scannerGetBinding().hashFileContent?.(content)
  if (result === null || result === undefined) {
    throw new TwError(
      "rust",
      "SCANNER_HASH_FAILED",
      "Native hashFileContent returned null/undefined"
    )
  }
  return result
}

export function isRustCacheAvailable(): boolean {
  return true
}

export function hasNativeScannerBinding(): boolean {
  try {
    scannerBridgeLoader.get()
    return true
  } catch {
    return false
  }
}

export function cacheReadNative(
  cachePath: string
): ReturnType<NonNullable<NativeScannerBinding["cacheRead"]>> {
  const result = scannerGetBinding().cacheRead?.(cachePath)
  if (result === null || result === undefined) {
    throw new TwError(
      "rust",
      "SCANNER_CACHE_READ_FAILED",
      "Native cacheRead returned null/undefined"
    )
  }
  return result
}

export function cacheWriteNative(
  cachePath: string,
  entries: Parameters<NonNullable<NativeScannerBinding["cacheWrite"]>>[1]
): boolean {
  const result = scannerGetBinding().cacheWrite?.(cachePath, entries)
  if (result === null || result === undefined) {
    throw new TwError(
      "rust",
      "SCANNER_CACHE_WRITE_FAILED",
      "Native cacheWrite returned null/undefined"
    )
  }
  return result
}

export function cachePriorityNative(
  mtimeMs: number,
  size: number,
  cachedMtimeMs: number,
  cachedSize: number,
  cachedHitCount: number,
  cachedLastSeenMs: number,
  nowMs = Date.now()
): number {
  const result = scannerGetBinding().cachePriority?.(
    mtimeMs,
    size,
    cachedMtimeMs,
    cachedSize,
    cachedHitCount,
    cachedLastSeenMs,
    nowMs
  )
  if (result === null || result === undefined) {
    throw new TwError(
      "rust",
      "SCANNER_CACHE_PRIORITY_FAILED",
      "Native cachePriority returned null/undefined"
    )
  }
  return result
}
