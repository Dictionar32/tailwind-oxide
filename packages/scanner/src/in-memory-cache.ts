/**
 * tailwind-styled-v4 — In-memory scan cache (Rust DashMap backend).
 *
 * Native-only: Rust DashMap cache is required.
 * No JavaScript fallback — native Rust binding must be available.
 *
 * Cache hidup selama proses Node.js — tidak perlu baca/tulis file di hot path.
 */

import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

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

interface NativeCacheBinding {
  scanCacheGet(filePath: string, contentHash: string): string[] | null
  scanCachePut(
    filePath: string,
    contentHash: string,
    classes: string[],
    mtimeMs: number,
    size: number
  ): void
  scanCacheInvalidate(filePath: string): void
  scanCacheStats(): { size: number }
}

// ─────────────────────────────────────────────────────────────────────────
// Native Cache Binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const createCacheBindingLoader = () => {
  const _state = { binding: undefined as NativeCacheBinding | null | undefined }

  const getBinding = (): NativeCacheBinding => {
    if (_state.binding !== undefined) {
      if (_state.binding === null) {
        throw new Error(
          "FATAL: Native cache binding not found.\n" +
          "This package requires native Rust bindings.\n\n" +
          "Resolution steps:\n" +
          "1. Build the native Rust module: npm run build:rust"
        )
      }
      return _state.binding
    }

    const req = createRequire(import.meta.url)
    const runtimeDir = getDirname()
    const candidates = [
      path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
      path.resolve(runtimeDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
    ]
    for (const c of candidates) {
      try {
        const mod = req(c) as Partial<NativeCacheBinding>
        if (typeof mod.scanCacheGet === "function" && typeof mod.scanCachePut === "function") {
          _state.binding = mod as NativeCacheBinding
          return _state.binding
        }
      } catch {
        /* next */
      }
    }
    _state.binding = null
    throw new Error(
      "FATAL: Native cache binding not found in any candidate path.\n" +
      "This package requires native Rust bindings.\n\n" +
      "Candidates checked:\n" +
      candidates.map((p) => `  - ${p}`).join("\n") +
      "\n\nResolution steps:\n" +
      "1. Build the native Rust module: npm run build:rust"
    )
  }

  return {
    get: getBinding,
    reset: (): void => {
      _state.binding = undefined
    },
  }
}

const cacheBindingLoader = createCacheBindingLoader()

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ambil kelas dari cache jika hash masih cocok (file belum berubah).
 * Return null jika cache miss atau file berubah.
 */
export function cacheGet(filePath: string, contentHash: string): string[] | null {
  const b = cacheBindingLoader.get()
  return b.scanCacheGet(filePath, contentHash) ?? null
}

/**
 * Simpan hasil ekstraksi ke cache.
 */
export function cachePut(
  filePath: string,
  contentHash: string,
  classes: string[],
  mtimeMs: number,
  size: number
): void {
  const b = cacheBindingLoader.get()
  b.scanCachePut(filePath, contentHash, classes, mtimeMs, size)
}

/**
 * Invalidate cache untuk file yang dihapus atau direname.
 */
export function cacheInvalidate(filePath: string): void {
  cacheBindingLoader.get().scanCacheInvalidate(filePath)
}

/**
 * Jumlah entry di cache saat ini.
 */
export function cacheSize(): number {
  return cacheBindingLoader.get().scanCacheStats().size
}

/**
 * Cek apakah menggunakan Rust backend — always true in native-only mode.
 */
export function isNative(): boolean {
  return true
}
