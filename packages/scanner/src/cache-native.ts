/**
 * tailwind-styled-v4 — Scanner Cache (Rust-backed)
 *
 * This module REQUIRES native Rust bindings and will FAIL LOUDLY if they are not available.
 * NO JavaScript fallback is provided.
 */

import path from "node:path"
import { cachePriorityNative, cacheReadNative, cacheWriteNative } from "./native-bridge"

function defaultCachePath(rootDir: string, cacheDir?: string): string {
  const dir = cacheDir
    ? path.resolve(rootDir, cacheDir)
    : path.join(process.cwd(), ".cache", "tailwind-styled")
  return path.join(dir, "scanner-cache.json")
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface NativeCacheEntry {
  file: string
  classes: string[]
  hash: string
  mtimeMs: number
  size: number
  hitCount: number
}

/**
 * Read scanner cache from disk using Rust parser.
 * REQUIRES native binding - throws if unavailable.
 */
export function readCache(rootDir: string, cacheDir?: string): NativeCacheEntry[] {
  const cachePath = defaultCachePath(rootDir, cacheDir)

  const result = cacheReadNative(cachePath)
  if (!result) return []

  return result.entries.map((e) => ({
    file: e.file,
    classes: e.classes,
    hash: e.hash,
    mtimeMs: e.mtimeMs,
    size: e.size,
    hitCount: e.hitCount,
  }))
}

/**
 * Write scanner cache to disk using Rust serialiser.
 * REQUIRES native binding - throws if unavailable.
 */
export function writeCache(rootDir: string, entries: NativeCacheEntry[], cacheDir?: string): void {
  const cachePath = defaultCachePath(rootDir, cacheDir)

  const success = cacheWriteNative(cachePath, entries)
  if (!success) {
    throw new Error(
      "Native cacheWrite failed. Run 'npm run build:rust' to rebuild native bindings."
    )
  }
}

/**
 * Compute priority score for a file using the Rust SmartCache algorithm.
 * Higher = process first.
 * REQUIRES native binding - throws if unavailable.
 */
export function filePriority(
  mtimeMs: number,
  size: number,
  cached: { mtimeMs: number; size: number; hitCount: number; lastSeenMs?: number } | undefined,
  nowMs = Date.now()
): number {
  return cachePriorityNative(
    mtimeMs,
    size,
    cached?.mtimeMs ?? 0,
    cached?.size ?? 0,
    cached?.hitCount ?? 0,
    cached?.lastSeenMs ?? 0,
    nowMs
  )
}

export interface CacheStats {
  totalEntries: number
  totalClasses: number
  totalSizeBytes: number
  avgClassesPerEntry: number
  mostUsedClasses: Array<{ class: string; count: number }>
}

export function computeCacheStats(entries: NativeCacheEntry[]): CacheStats {
  if (entries.length === 0) {
    return { totalEntries: 0, totalClasses: 0, totalSizeBytes: 0, avgClassesPerEntry: 0, mostUsedClasses: [] }
  }

  const classCounts = new Map<string, number>()
  let totalClasses = 0
  let totalSize = 0

  for (const entry of entries) {
    totalClasses += entry.classes.length
    totalSize += entry.size
    for (const cls of entry.classes) {
      classCounts.set(cls, (classCounts.get(cls) ?? 0) + 1)
    }
  }

  const mostUsedClasses = [...classCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cls, count]) => ({ class: cls, count }))

  return {
    totalEntries: entries.length,
    totalClasses,
    totalSizeBytes: totalSize,
    avgClassesPerEntry: totalClasses / entries.length,
    mostUsedClasses,
  }
}
