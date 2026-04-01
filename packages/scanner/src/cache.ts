import fs from "node:fs"
import path from "node:path"

export interface CachedScanFileEntry {
  mtimeMs: number
  size: number
  classes: string[]
  hitCount?: number
  lastSeenMs?: number
}

export interface CachedScanIndex {
  version: 2
  files: Record<string, CachedScanFileEntry>
}

export interface ScanCacheOptions {
  cacheDir?: string
}

function defaultCachePath(rootDir: string, cacheDir?: string): string {
  const resolvedDir = cacheDir
    ? path.resolve(rootDir, cacheDir)
    : path.join(process.cwd(), ".cache", "tailwind-styled")
  return path.join(resolvedDir, "scanner-cache.json")
}

export class ScanCache {
  private readonly cachePath: string
  private readonly index: CachedScanIndex

  constructor(rootDir: string, options: ScanCacheOptions = {}) {
    this.cachePath = defaultCachePath(rootDir, options.cacheDir)
    this.index = this.read()
  }

  private read(): CachedScanIndex {
    if (!fs.existsSync(this.cachePath)) {
      return { version: 2, files: {} }
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(this.cachePath, "utf8")) as {
        version?: number
        files?: Record<string, CachedScanFileEntry>
      }
      if (parsed?.files) {
        return {
          version: 2,
          files: parsed.files,
        }
      }
    } catch {
      // ignore malformed cache and re-init
    }

    return { version: 2, files: {} }
  }

  get(filePath: string): CachedScanFileEntry | undefined {
    return this.index.files[filePath]
  }

  set(filePath: string, entry: CachedScanFileEntry): void {
    this.index.files[filePath] = entry
  }

  touch(filePath: string): void {
    const entry = this.index.files[filePath]
    if (!entry) return
    entry.hitCount = (entry.hitCount ?? 0) + 1
    entry.lastSeenMs = Date.now()
  }

  delete(filePath: string): void {
    delete this.index.files[filePath]
  }

  entries(): Array<[string, CachedScanFileEntry]> {
    return Object.entries(this.index.files)
  }

  save(): void {
    fs.mkdirSync(path.dirname(this.cachePath), { recursive: true })
    fs.writeFileSync(this.cachePath, `${JSON.stringify(this.index, null, 2)}\n`)
  }
}
