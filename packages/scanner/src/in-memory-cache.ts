/**
 * tailwind-styled-v4 — In-memory scan cache (Rust DashMap backend).
 *
 * Menggantikan ScanCache (JS) dengan cache in-process yang lebih cepat.
 * Cache hidup selama proses Node.js — tidak perlu baca/tulis file di hot path.
 */

import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

// ESM-compatible __dirname equivalent
function getDirname(): string {
  if (typeof __dirname !== "undefined") {
    return __dirname
  }
  // ESM fallback
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  // Final fallback
  return process.cwd()
}

interface NativeCacheBinding {
  scanCacheGet?: (filePath: string, contentHash: string) => string[] | null
  scanCachePut?: (
    filePath: string,
    contentHash: string,
    classes: string[],
    mtimeMs: number,
    size: number
  ) => void
  scanCacheInvalidate?: (filePath: string) => void
  scanCacheStats?: () => { size: number }
}

// ─────────────────────────────────────────────────────────────────────────
// Native Cache Binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const createCacheBindingLoader = () => {
  const _state = { binding: undefined as NativeCacheBinding | null | undefined }

  const getBinding = (): NativeCacheBinding | null => {
    if (_state.binding !== undefined) return _state.binding
    if (process.env.TWS_NO_NATIVE === "1") return (_state.binding = null)

    const req = typeof require === "function" ? require : createRequire(import.meta.url)
    const runtimeDir = getDirname()
    const candidates = [
      path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
      path.resolve(runtimeDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
    ]
    for (const c of candidates) {
      try {
        const mod = req(c) as NativeCacheBinding
        if (mod?.scanCacheGet && mod?.scanCachePut) return (_state.binding = mod)
      } catch {
        /* next */
      }
    }
    return (_state.binding = null)
  }

  return {
    get: getBinding,
    reset: (): void => {
      _state.binding = undefined
    },
  }
}

const cacheBindingLoader = createCacheBindingLoader()

// ── JS fallback cache ─────────────────────────────────────────────────────────

const jsCache = new Map<string, { hash: string; classes: string[]; hits: number }>()

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Ambil kelas dari cache jika hash masih cocok (file belum berubah).
 * Return null jika cache miss atau file berubah.
 */
export function cacheGet(filePath: string, contentHash: string): string[] | null {
  const b = cacheBindingLoader.get()
  if (b?.scanCacheGet) {
    return b.scanCacheGet(filePath, contentHash) ?? null
  }
  const entry = jsCache.get(filePath)
  if (!entry || entry.hash !== contentHash) return null
  entry.hits++
  return entry.classes
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
  if (b?.scanCachePut) {
    b.scanCachePut(filePath, contentHash, classes, mtimeMs, size)
    return
  }
  jsCache.set(filePath, { hash: contentHash, classes, hits: 0 })
}

/**
 * Invalidate cache untuk file yang dihapus atau direname.
 */
export function cacheInvalidate(filePath: string): void {
  cacheBindingLoader.get()?.scanCacheInvalidate?.(filePath)
  jsCache.delete(filePath)
}

/**
 * Jumlah entry di cache saat ini.
 */
export function cacheSize(): number {
  return cacheBindingLoader.get()?.scanCacheStats?.().size ?? jsCache.size
}

/**
 * Cek apakah menggunakan Rust backend.
 */
export function isNative(): boolean {
  return cacheBindingLoader.get() !== null
}
