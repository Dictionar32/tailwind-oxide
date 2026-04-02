export function cacheGet(filePath: string, contentHash: string): string[] | null
export function cachePut(filePath: string, contentHash: string, classes: string[], mtimeMs: number, size: number): void
export function cacheInvalidate(filePath: string): void
export function cacheSize(): number
export function isNative(): boolean
