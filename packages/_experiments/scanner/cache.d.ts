export interface ScanCacheEntry {
  mtimeMs: number; size: number; classes: string[]; hitCount: number; lastSeenMs: number;
}
export interface ScanCacheOptions { cacheDir?: string }
export class ScanCache {
  constructor(rootDir: string, options?: ScanCacheOptions)
  get(filePath: string): ScanCacheEntry | undefined
  set(filePath: string, entry: ScanCacheEntry): void
  touch(filePath: string): void
  save(): void
}
