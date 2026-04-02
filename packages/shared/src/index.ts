import { createHash } from "node:crypto"
import { existsSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TokenMap = Record<string, string>

export type VariantValue = string | number | boolean | undefined

export type VariantProps = Record<string, VariantValue>

export type HtmlTagName = keyof HTMLElementTagNameMap

export type CompoundCondition = Record<string, string | number | boolean>

export type VariantMatrix = Record<string, Array<string | number | boolean>>

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────

export interface Logger {
  warn(...args: unknown[]): void
  debug(...args: unknown[]): void
  error(...args: unknown[]): void
  log(...args: unknown[]): void
}

export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`
  return {
    warn(...args: unknown[]) {
      process.stderr.write(`${prefix} ${args.map(a => typeof a === "string" ? a : String(a)).join(" ")}\n`)
    },
    debug(...args: unknown[]) {
      process.stderr.write(`${prefix} ${args.map(a => typeof a === "string" ? a : String(a)).join(" ")}\n`)
    },
    error(...args: unknown[]) {
      process.stderr.write(`${prefix} ${args.map(a => typeof a === "string" ? a : String(a)).join(" ")}\n`)
    },
    log(...args: unknown[]) {
      process.stderr.write(`${prefix} ${args.map(a => typeof a === "string" ? a : String(a)).join(" ")}\n`)
    },
  }
}

export function createDebugLogger(namespace: string, label?: string): (msg: string) => void {
  const prefix = label ? `[${namespace}:${label}]` : `[${namespace}]`
  return (msg: string) => {
    if (process.env.DEBUG?.includes(namespace) || process.env.TW_DEBUG) {
      console.debug(prefix, msg)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

export class TwError extends Error {
  public readonly domain: string
  public readonly code: string

  constructor(domain: string, code: string, message: string) {
    super(message)
    this.name = "TwError"
    this.domain = domain
    this.code = code
  }

  static fromIo(code: string, message: string): TwError {
    return new TwError("io", code, message)
  }

  static fromCompile(code: string, message: string): TwError {
    return new TwError("compile", code, message)
  }

  static fromRust(opts: { code: string; message: string }): TwError {
    return new TwError("rust", opts.code, opts.message)
  }

  override toString(): string {
    return `TwError [${this.domain}:${this.code}] ${this.message}`
  }
}

export function wrapUnknownError(domain: string, code: string, error: unknown): TwError {
  if (error instanceof TwError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new TwError(domain, code, message)
}

// ─────────────────────────────────────────────────────────────────────────────
// Native binding resolution
// ─────────────────────────────────────────────────────────────────────────────

export interface LoadNativeBindingOptions<T> {
  runtimeDir: string
  candidates: string[]
  isValid: (module: unknown) => module is T
  invalidExportMessage: string
}

export interface LoadNativeBindingResult<T> {
  binding: T | null
  loadErrors: Array<{ path: string; message: string }>
  loadedPath?: string
}

export function loadNativeBinding<T>(options: LoadNativeBindingOptions<T>): LoadNativeBindingResult<T> {
  const { runtimeDir, candidates, isValid } = options
  const loadErrors: Array<{ path: string; message: string }> = []

  for (const candidate of candidates) {
    const candidatePath = resolve(runtimeDir, candidate)
    try {
      if (!existsSync(candidatePath) && !existsSync(candidatePath + ".node")) {
        continue
      }
      // Dynamic require for native modules
      const mod = requireNativeModule(candidatePath)
      if (mod && isValid(mod)) {
        return { binding: mod, loadErrors, loadedPath: candidatePath }
      }
      loadErrors.push({ path: candidatePath, message: options.invalidExportMessage })
    } catch (e) {
      loadErrors.push({ path: candidatePath, message: e instanceof Error ? e.message : String(e) })
    }
  }

  return { binding: null, loadErrors }
}

function getRequire(): NodeRequire {
  try {
    return createRequire(import.meta.url)
  } catch {
    // CJS context — require is already available as global
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require as NodeRequire
  }
}

const _require = getRequire()

function requireNativeModule(path: string): unknown {
  return _require(path)
}

export interface ResolveCandidatesOptions {
  runtimeDir: string
  envVarNames?: string[]
  includeDefaultCandidates?: boolean
  enforceNodeExtensionForEnvPath?: boolean
}

export function resolveNativeBindingCandidates(options: ResolveCandidatesOptions): string[] {
  const { runtimeDir, envVarNames = [], includeDefaultCandidates = true, enforceNodeExtensionForEnvPath = false } = options
  const candidates: string[] = []

  // Check environment variables for custom paths
  for (const envVar of envVarNames) {
    const envPath = process.env[envVar]
    if (envPath) {
      if (enforceNodeExtensionForEnvPath && !envPath.endsWith(".node")) {
        candidates.push(envPath + ".node")
      } else {
        candidates.push(envPath)
      }
    }
  }

  if (!includeDefaultCandidates) return candidates

  // Scan the runtime directory for native bindings
  if (existsSync(runtimeDir)) {
    try {
      const entries = readdirSync(runtimeDir)
      for (const entry of entries) {
        if (entry.endsWith(".node")) {
          candidates.push(entry)
        }
      }
    } catch {
      // ignore read errors
    }
  }

  // Add explicit monorepo root native directory candidates
  // Packages live at packages/<name>/dist, so we need to walk up to monorepo root
  const defaultBindingName = "tailwind_styled_parser.node"
  candidates.push(resolve(runtimeDir, "..", "..", "..", "native", defaultBindingName))
  candidates.push(resolve(runtimeDir, "..", "..", "..", "..", "native", defaultBindingName))
  candidates.push(resolve(process.cwd(), "native", defaultBindingName))

  return Array.from(new Set(candidates))
}

export function resolveRuntimeDir(dir: string | undefined, importMetaUrl: string): string {
  if (dir) return resolve(dir)
  try {
    return dirname(fileURLToPath(importMetaUrl))
  } catch {
    return process.cwd()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hashing
// ─────────────────────────────────────────────────────────────────────────────

export function hashContent(content: string, algorithm: string = "md5", length?: number): string {
  const hash = createHash(algorithm).update(content).digest("hex")
  return length ? hash.slice(0, length) : hash
}

// ─────────────────────────────────────────────────────────────────────────────
// Error formatting
// ─────────────────────────────────────────────────────────────────────────────

export function formatErrorMessage(error: unknown): string {
  if (error instanceof TwError) return error.toString()
  if (error instanceof Error) return error.message
  return String(error)
}

// ─────────────────────────────────────────────────────────────────────────────
// LRU Cache
// ─────────────────────────────────────────────────────────────────────────────

export class LRUCache<K, V> {
  private capacity: number
  private cache: Map<K, V>

  constructor(capacity: number) {
    this.capacity = capacity
    this.cache = new Map()
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries()
  }

  get size(): number {
    return this.cache.size
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trace Utilities
// ─────────────────────────────────────────────────────────────────────────────

export type { TraceSnapshot, TraceSummary } from "./trace"
export {
  getHealthColor,
  getModeColor,
  formatMemory,
  formatDuration,
  calculateHealth,
  getBuildTimeColor,
  getMemoryColor,
  createTraceSnapshot,
  getPipelinePercentages,
} from "./trace"

// ─────────────────────────────────────────────────────────────────────────────
// Performance Telemetry
// ─────────────────────────────────────────────────────────────────────────────

export type { BuildTelemetry, TelemetryStats } from "./telemetry"
export { TelemetryCollector, telemetry } from "./telemetry"

// ─────────────────────────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────────────────────────

export type { ErrorCode } from "./error-codes"
export { ERROR_CODES, getSuggestion, formatErrorCode } from "./error-codes"

// ─────────────────────────────────────────────────────────────────────────────
// Tailwind Compatibility
// ─────────────────────────────────────────────────────────────────────────────

export type { TailwindInfo } from "./compatibility"
export { detectTailwind, assertTailwindV4, getTailwindVersion, isTailwindV4 } from "./compatibility"
