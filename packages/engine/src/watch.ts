import fs from "node:fs"
import path from "node:path"

export interface WatcherOptions {
  ignoreDirectories?: string[]
  /**
   * Delay before emitting change event to reduce noisy bursts.
   */
  debounceMs?: number
  onError?: (error: Error, directory: string) => void
}

export interface WatcherEvent {
  type: "change" | "unlink"
  filePath: string
}

export interface WorkspaceWatcher {
  close(): void
}

const DEFAULT_IGNORES = ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"]

export function watchWorkspace(
  rootDir: string,
  onEvent: (event: WatcherEvent) => void,
  options: WatcherOptions = {}
): WorkspaceWatcher {
  const ignoreDirectories = new Set(options.ignoreDirectories ?? DEFAULT_IGNORES)
  const watchers = new Map<string, fs.FSWatcher>()
  const restartTimers = new Map<string, NodeJS.Timeout>()
  const debounceMs = options.debounceMs ?? 100
  const pending = new Map<string, NodeJS.Timeout>()

  const shouldIgnore = (targetPath: string): boolean => {
    const parts = targetPath.split(path.sep)
    return parts.some((part) => ignoreDirectories.has(part))
  }

  const enqueue = (event: WatcherEvent): void => {
    const key = `${event.type}:${event.filePath}`
    const existing = pending.get(key)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      pending.delete(key)
      onEvent(event)
    }, debounceMs)

    pending.set(key, timer)
  }

  const safeUnwatch = (dir: string): void => {
    const watcher = watchers.get(dir)
    if (!watcher) return
    try {
      watcher.close()
    } catch {
      // ignore close errors
    }
    watchers.delete(dir)
  }

  const scheduleRestart = (dir: string): void => {
    const previous = restartTimers.get(dir)
    if (previous) clearTimeout(previous)

    const timer = setTimeout(() => {
      restartTimers.delete(dir)
      watchDir(dir)
    }, 250)

    restartTimers.set(dir, timer)
  }

  const watchDir = (dir: string): void => {
    if (watchers.has(dir) || shouldIgnore(dir) || !fs.existsSync(dir)) return

    try {
      const stat = fs.lstatSync(dir)
      if (!stat.isDirectory() || stat.isSymbolicLink()) return
    } catch {
      return
    }

    const watcher = fs.watch(dir, { persistent: true }, (_eventType, fileName) => {
      if (!fileName) return
      const fullPath = path.join(dir, fileName.toString())
      if (shouldIgnore(fullPath)) return

      if (fs.existsSync(fullPath)) {
        try {
          const stat = fs.lstatSync(fullPath)
          if (stat.isSymbolicLink()) return
          if (stat.isDirectory()) {
            watchDir(fullPath)
            return
          }
          enqueue({ type: "change", filePath: fullPath })
          return
        } catch {
          // ignore transient fs errors
        }
      }

      enqueue({ type: "unlink", filePath: fullPath })
    })

    watcher.on("error", (error) => {
      safeUnwatch(dir)
      const watcherError = error instanceof Error ? error : new Error(String(error))
      options.onError?.(watcherError, dir)
      scheduleRestart(dir)
    })

    watchers.set(dir, watcher)

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      watchDir(path.join(dir, entry.name))
    }
  }

  watchDir(path.resolve(rootDir))

  return {
    close() {
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
      for (const timer of restartTimers.values()) clearTimeout(timer)
      restartTimers.clear()
      for (const watcher of watchers.values()) watcher.close()
      watchers.clear()
    },
  }
}
