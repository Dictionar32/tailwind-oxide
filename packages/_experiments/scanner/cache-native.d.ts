export interface NativeCacheEntry { file: string; classes: string[]; hash: string; mtimeMs: number; size: number; hitCount: number }
export function readCache(rootDir: string, cacheDir?: string): NativeCacheEntry[]
export function writeCache(rootDir: string, entries: NativeCacheEntry[], cacheDir?: string): void
export function filePriority(mtimeMs: number, size: number, cached?: { mtimeMs: number; size: number; hitCount: number; lastSeenMs?: number }, nowMs?: number): number
