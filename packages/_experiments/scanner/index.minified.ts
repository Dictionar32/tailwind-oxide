// Archived experiment: excluded from package builds and workspace resolution.
import fs from "node:fs"
import path from "node:path"

import { extractAllClasses } from "@tailwind-styled/compiler"

import { ScanCache } from "./cache"
import { SmartCache } from "./smart-cache"
import { parseJsxLikeClasses } from "./ast-parser"
import { scanWorkspaceNative, extractClassesNative, hashContentNative } from "./native-bridge"

type NativeParsedClass = { raw?: string }
type NativeParserBinding = { parse_classes?: (input: string) => NativeParsedClass[] }

const _parserState = {
  binding: undefined as NativeParserBinding | null | undefined,
  initError: null as string | null,
  logged: false,
}

function canUseCjsRequire(): boolean {
  return typeof require === "function"
}

function debugNative(message: string): void {
  if (process.env.TWS_DEBUG_SCANNER !== "1") return
  if (_parserState.logged) return
  _parserState.logged = true
  console.warn(`[scanner:native] ${message}`)
}

function loadNativeParserBinding(): NativeParserBinding | null {
  if (_parserState.binding !== undefined) return _parserState.binding

  if (!canUseCjsRequire()) {
    _parserState.binding = null
    _parserState.initError = "require is unavailable in current module format"
    debugNative(`fallback to JS: ${_parserState.initError}`)
    return _parserState.binding
  }

  const candidates = [
    path.resolve(process.cwd(), "native/tailwind_styled_parser.node"),
    path.resolve(process.cwd(), "native/build/Release/tailwind_styled_parser.node"),
  ]

  for (const fullPath of candidates) {
    if (!fs.existsSync(fullPath)) continue
    try {
      const required = require(fullPath) as NativeParserBinding
      if (required && typeof required.parse_classes === "function") {
        _parserState.binding = required
        debugNative(`using native parser from ${fullPath}`)
        return _parserState.binding
      }
    } catch (error) {
      _parserState.initError = error instanceof Error ? error.message : String(error)
    }
  }

  _parserState.binding = null
  if (!_parserState.initError) {
    _parserState.initError = "native .node binding not found"
  }
  debugNative(`fallback to JS: ${_parserState.initError}`)
  return _parserState.binding
}

function normalizeWithNativeParser(tokens: string[]): string[] | null {
  const binding = loadNativeParserBinding()
  if (!binding || typeof binding.parse_classes !== "function") return null

  try {
    const parsed = binding.parse_classes(tokens.join(" "))
    const normalized = parsed.map((item) => item.raw?.trim() ?? "").filter(Boolean)
    return Array.from(new Set(normalized))
  } catch (error) {
    _parserState.initError = error instanceof Error ? error.message : String(error)
    debugNative(`runtime error, fallback to JS: ${_parserState.initError}`)
    return null
  }
}

export interface ScanWorkspaceOptions {
  includeExtensions?: string[]
  ignoreDirectories?: string[]
  useCache?: boolean
  cacheDir?: string
  smartInvalidation?: boolean
}

export interface ScanFileResult {
  file: string
  classes: string[]
}

export interface ScanWorkspaceResult {
  files: ScanFileResult[]
  totalFiles: number
  uniqueClasses: string[]
}

export const DEFAULT_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]
export const DEFAULT_IGNORES = ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"]

function buildExtensionSet(includeExtensions: string[]): Set<string> {
  return new Set(includeExtensions)
}

function collectCandidates(
  rootDir: string,
  ignoreDirectories: Set<string>,
  extensionSet: Set<string>
): string[] {
  const candidates: string[] = []
  const directories = [rootDir]

  while (directories.length > 0) {
    const currentDir = directories.pop()
    if (!currentDir) continue

    const entries = (() => {
      try {
        return fs.readdirSync(currentDir, { withFileTypes: true })
      } catch {
        return [] as fs.Dirent[]
      }
    })()

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (!ignoreDirectories.has(entry.name)) directories.push(fullPath)
        continue
      }

      if (!entry.isFile()) continue
      if (!extensionSet.has(path.extname(entry.name))) continue
      candidates.push(fullPath)
    }
  }

  return candidates
}

export function scanSource(source: string): string[] {
  // Try Rust engine first — fastest path
  const nativeClasses = extractClassesNative(source)
  if (nativeClasses) return nativeClasses

  // JS fallback
  const baseClasses = extractAllClasses(source)
  const jsxClasses: string[] = (() => {
    try { return parseJsxLikeClasses(source) }
    catch { return [] }
  })()

  const merged = Array.from(new Set([...baseClasses, ...jsxClasses]))
  const nativeNormalized = normalizeWithNativeParser(merged)
  if (nativeNormalized) return nativeNormalized

  return merged
}

export function isScannableFile(filePath: string, includeExtensions = DEFAULT_EXTENSIONS): boolean {
  return includeExtensions.includes(path.extname(filePath))
}

export function scanFile(filePath: string): ScanFileResult {
  const source = fs.readFileSync(filePath, "utf8")
  // Use Rust hash when available
  const hash = hashContentNative(source) ?? undefined
  return {
    file: filePath,
    classes: scanSource(source),
    ...(hash ? { hash } : {}),
  }
}

export function scanWorkspace(
  rootDir: string,
  options: ScanWorkspaceOptions = {}
): ScanWorkspaceResult {
  // ── Rust fast-path: full workspace scan in native ────────────────────────
  // Only used when no custom options are needed (no cache dir overrides, etc.)
  if (!options.cacheDir && options.useCache !== false) {
    const nativeResult = scanWorkspaceNative(rootDir, options.includeExtensions ?? undefined)
    if (nativeResult) {
      return {
        files: nativeResult.files.map((f) => ({ file: f.file, classes: f.classes })),
        totalFiles: nativeResult.totalFiles,
        uniqueClasses: nativeResult.uniqueClasses,
      }
    }
  }

  // ── JS fallback ───────────────────────────────────────────────────────────
  const includeExtensions = options.includeExtensions ?? DEFAULT_EXTENSIONS
  const extensionSet = buildExtensionSet(includeExtensions)
  const ignoreDirectories = new Set(options.ignoreDirectories ?? DEFAULT_IGNORES)
  const useCache = options.useCache ?? true
  const smartInvalidation = options.smartInvalidation ?? true

  const files: ScanFileResult[] = []
  const unique = new Set<string>()
  const cache = useCache ? new ScanCache(rootDir, { cacheDir: options.cacheDir }) : null
  const smartCache = cache && smartInvalidation ? new SmartCache(cache) : null
  const candidates = collectCandidates(rootDir, ignoreDirectories, extensionSet)

  const processResult = (result: ScanFileResult) => {
    files.push(result)
    for (const cls of result.classes) unique.add(cls)
  }

  if (!cache) {
    for (const filePath of candidates) {
      processResult(scanFile(filePath))
    }
  } else if (smartCache) {
    for (const { filePath, stat, cached } of smartCache.rankFiles(candidates)) {
      const cacheEntry = cached ?? cache.get(filePath)

      const result = (() => {
        if (cacheEntry && cacheEntry.mtimeMs === stat.mtimeMs && cacheEntry.size === stat.size) {
          cache.touch(filePath)
          return { file: filePath, classes: cacheEntry.classes }
        }
        const scanned = scanFile(filePath)
        cache.set(filePath, {
          mtimeMs: stat.mtimeMs,
          size: stat.size,
          classes: scanned.classes,
          hitCount: 1,
          lastSeenMs: Date.now(),
        })
        return scanned
      })()

      processResult(result)
    }
  } else {
    for (const filePath of candidates) {
      const stat = fs.statSync(filePath)
      const cacheEntry = cache.get(filePath)

      const result = (() => {
        if (cacheEntry && cacheEntry.mtimeMs === stat.mtimeMs && cacheEntry.size === stat.size) {
          cache.touch(filePath)
          return { file: filePath, classes: cacheEntry.classes }
        }
        const scanned = scanFile(filePath)
        cache.set(filePath, {
          mtimeMs: stat.mtimeMs,
          size: stat.size,
          classes: scanned.classes,
          hitCount: 1,
          lastSeenMs: Date.now(),
        })
        return scanned
      })()

      processResult(result)
    }
  }

  if (smartCache) {
    smartCache.invalidateMissing(new Set(candidates))
  }
  cache?.save()

  return {
    files,
    totalFiles: files.length,
    uniqueClasses: Array.from(unique).sort(),
  }
}

// Rust cache bridge — replaces cache.ts + smart-cache.ts in hot paths
export {
  rustCacheRead,
  rustCacheWrite,
  rustCachePriority,
  isRustCacheAvailable,
} from "./rust-cache-bridge"

// ── New Rust-backed modules ───────────────────────────────────────────────────
export { readCache, writeCache, filePriority } from "./cache-native"
export type { NativeCacheEntry } from "./cache-native"
export { astExtractClasses } from "./ast-native"
export type { AstExtractResult } from "./ast-native"

// ── Oxc AST parser (real AST, bukan regex) ────────────────────────────────────
export { oxcExtractClasses } from "./oxc-bridge"

// ── In-memory scan cache (Rust DashMap backend) ───────────────────────────────
export {
  cacheGet,
  cachePut,
  cacheInvalidate,
  cacheSize,
  isNative as isCacheNative,
} from "./in-memory-cache"

// ── Upgrade scanSource: pakai oxcExtractClasses sebagai tier kedua ────────────

/**
 * Upgrade path: scanSource dengan Oxc AST + regex hybrid.
 * Lebih akurat dari scanSource biasa — deteksi component names + imports.
 * Otomatis fallback ke scanSource jika Oxc tidak tersedia.
 */
export function scanSourceOxc(
  source: string,
  filename = "file.tsx"
): {
  classes: string[]
  componentNames: string[]
  hasUseClient: boolean
  imports: string[]
} {
  const { oxcExtractClasses: oxcFn } = require("./oxc-bridge") as typeof import("./oxc-bridge")
  try {
    const r = oxcFn(source, filename)
    return {
      classes: r.classes,
      componentNames: r.componentNames,
      hasUseClient: r.hasUseClient,
      imports: r.imports,
    }
  } catch {
    return { classes: scanSource(source), componentNames: [], hasUseClient: false, imports: [] }
  }
}

// ── Upgrade scanFile: pakai in-memory cache + oxc ─────────────────────────────

/**
 * scanFile dengan in-memory Rust cache.
 * Cache miss → scan → store. Cache hit → return langsung.
 */
export function scanFileCached(filePath: string): string[] {
  const { cacheGet, cachePut } = require("./in-memory-cache") as typeof import("./in-memory-cache")

  const content = fs.readFileSync(filePath, "utf8")
  const hash = hashContentNative(content) ?? content.slice(0, 64)

  // Cache hit
  const cached = cacheGet(filePath, hash)
  if (cached) return cached

  // Cache miss — scan
  const classes = scanSource(content)
  const stat = (() => {
    try {
      return fs.statSync(filePath)
    } catch {
      return null
    }
  })()
  cachePut(filePath, hash, classes, stat?.mtimeMs ?? 0, stat?.size ?? 0)

  return classes
}
