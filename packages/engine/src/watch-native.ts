/**
 * tailwind-styled-v4 - Rust notify watch backend.
 *
 * Uses native notify when available and falls back to Node fs.watch.
 * Keeps the same public API as watch.ts.
 */

import { createRequire } from "node:module"
import path from "node:path"
import { createLogger } from "@tailwind-styled/shared"

interface NativeWatchBinding {
  startWatch?: (rootDir: string) => { status: string; handleId: number }
  pollWatchEvents?: (handleId: number) => Array<{ kind: string; path: string }>
  stopWatch?: (handleId: number) => boolean
}

// ─────────────────────────────────────────────────────────────────────────
// Native Watch Binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const watchBindingState = {
  binding: undefined as NativeWatchBinding | null | undefined,
}

const getBinding = (): NativeWatchBinding | null => {
  if (watchBindingState.binding !== undefined) return watchBindingState.binding
  if (process.env.TWS_NO_NATIVE === "1") {
    watchBindingState.binding = null
    return null
  }

  const runtimeDir = typeof __dirname === "string" ? __dirname : process.cwd()
  const req =
    typeof require === "function" ? require : createRequire(path.join(runtimeDir, "noop.cjs"))

  const candidates = [
    path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
    path.resolve(runtimeDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
  ]

  for (const c of candidates) {
    try {
      const mod = req(c) as NativeWatchBinding
      if (mod?.startWatch && mod?.pollWatchEvents && mod?.stopWatch) {
        watchBindingState.binding = mod
        return mod
      }
    } catch {
      // try next candidate
    }
  }

  watchBindingState.binding = null
  return null
}

const resetWatchBinding = (): void => {
  watchBindingState.binding = undefined
}
const log = createLogger("engine:watch-native")

interface NativeWatchOptions {
  pollIntervalMs?: number
  extensions?: string[]
  onError?: (error: Error) => void
}

export type WatchEventKind = "add" | "change" | "unlink" | "rename"

export interface WatchEvent {
  kind: WatchEventKind
  path: string
}

export type WatchCallback = (events: WatchEvent[]) => void

export interface WatchHandle {
  stop(): void
  engine: string
}

/**
 * Start recursive watch.
 * Callback is polled at `pollIntervalMs` (default 500ms) when events exist.
 */
export function watchWorkspace(
  rootDir: string,
  callback: WatchCallback,
  options: NativeWatchOptions = {}
): WatchHandle {
  const binding = getBinding()
  const pollMs = options.pollIntervalMs ?? 500
  const resolvedRoot = path.resolve(rootDir)

  if (binding?.startWatch && binding?.pollWatchEvents && binding?.stopWatch) {
    const result = (() => {
      try {
        return binding.startWatch!(resolvedRoot)
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error))
        log.warn(`watch Rust start failed: ${normalized.message}, fallback to Node`)
        options.onError?.(normalized)
        return null
      }
    })()

    if (!result || result.status !== "ok") {
      const error = new Error(result ? `watch Rust error: ${result.status}` : "watch Rust start failed")
      log.warn(`${error.message}, fallback to Node`)
      options.onError?.(error)
      return nodeWatch(resolvedRoot, callback, options)
    }

    const handleId = result.handleId
    const timer = setInterval(() => {
      const raw = (() => {
        try {
          return binding.pollWatchEvents!(handleId)
        } catch (error) {
          const normalized = error instanceof Error ? error : new Error(String(error))
          log.warn(`watch Rust poll failed: ${normalized.message}`)
          options.onError?.(normalized)
          return null
        }
      })()

      if (!raw || raw.length === 0) return

      const deduped = new Set<string>()
      const events: WatchEvent[] = []

      for (const e of raw) {
        const absPath = path.isAbsolute(e.path)
          ? path.normalize(e.path)
          : path.resolve(resolvedRoot, e.path)
        const kind = e.kind as WatchEventKind
        const key = `${kind}:${absPath}`
        if (deduped.has(key)) continue
        deduped.add(key)
        events.push({ kind, path: absPath })
      }

      if (events.length > 0) callback(events)
    }, pollMs)

    return {
      engine: "rust-notify",
      stop() {
        clearInterval(timer)
        binding.stopWatch!(handleId)
      },
    }
  }

  return nodeWatch(resolvedRoot, callback, options)
}

function nodeWatch(
  rootDir: string,
  callback: WatchCallback,
  options: { extensions?: string[]; onError?: (error: Error) => void } = {}
): WatchHandle {
  const fs = require("node:fs") as typeof import("node:fs")
  const exts = new Set(options.extensions ?? [".ts", ".tsx", ".js", ".jsx", ".css"])

  const watcher = fs.watch(rootDir, { recursive: true }, (event, filename) => {
    if (!filename) return

    const fileName = filename.toString()
    const ext = path.extname(fileName)
    if (!exts.has(ext)) return

    const kind: WatchEventKind = event === "rename" ? "rename" : "change"
    const absPath = path.isAbsolute(fileName)
      ? path.normalize(fileName)
      : path.resolve(rootDir, fileName)

    callback([{ kind, path: absPath }])
  })
  watcher.on("error", (error) => {
    const normalized = error instanceof Error ? error : new Error(String(error))
    log.warn(`watch Node fs error: ${normalized.message}`)
    options.onError?.(normalized)
  })

  return {
    engine: "node-fs",
    stop() {
      watcher.close()
    },
  }
}
