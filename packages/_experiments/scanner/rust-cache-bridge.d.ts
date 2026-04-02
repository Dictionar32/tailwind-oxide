export function rustCacheRead(path: string): unknown
export function rustCacheWrite(path: string, data: unknown): boolean
export function rustCachePriority(mtimeMs: number, size: number, cachedMtimeMs: number, cachedSize: number, hitCount: number, lastSeenMs: number, nowMs: number): number
export function isRustCacheAvailable(): boolean
