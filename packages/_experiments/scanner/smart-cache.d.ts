import { ScanCache, ScanCacheEntry } from "./cache"
export class SmartCache {
  constructor(cache: ScanCache)
  rankFiles(candidates: string[]): Array<{ filePath: string; stat: { mtimeMs: number; size: number }; cached?: ScanCacheEntry }>
  invalidateMissing(candidates: Set<string>): void
}
