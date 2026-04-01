/**
 * tailwind-styled-v4 - Rust notify watch backend.
 *
 * Native-only: Rust notify binding is required.
 * No JavaScript fallback — native Rust binding must be available.
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

const getBinding = (): NativeWatchBinding => {
  if (watchBindingState.binding !== undefined) {
    if (watchBindingState.binding === null) {
      throw new Error(
        "FATAL: Native watch binding not found.\n" +
        "This package requires native Rust bindings.\n\n" +
        "Resolution steps:\n" +
        "1. Build the native Rust module: npm run build:rust"
      )
    }
    return watchBindingState.binding
  }

  const runtimeDir = typeof __dirname === "string" ? __dirname : process.cwd()
  const req = createRequire(import.meta.url)

  const candidates = [
    path.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
    path.resolve(runtimeDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
    path.resolve(runtimeDir, "..", "..", "..", "native", "tailwind_styled_parser.node"),
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
  throw new Error(
    "FATAL: Native watch binding not found in any candidate path.\n" +
    "This package requires native Rust bindings.\n\n" +
    "Candidates checked:\n" +
    candidates.map((p) => `  - ${p}`).join("\n") +
    "\n\nResolution steps:\n" +
    "1. Build the native Rust module: npm run build:rust"
  )
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
 *
 * Native-only: Rust notify is required.
 */
export function watchWorkspace(
  rootDir: string,
  callback: WatchCallback,
  options: NativeWatchOptions = {}
): WatchHandle {
  const binding = getBinding()
  const pollMs = options.pollIntervalMs ?? 500
  const resolvedRoot = path.resolve(rootDir)

  const result = (() => {
    try {
      return binding.startWatch!(resolvedRoot)
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error))
      throw new Error(
        `FATAL: Native watch start failed: ${normalized.message}\n` +
        "This package requires native Rust bindings.\n\n" +
        "Resolution steps:\n" +
        "1. Build the native Rust module: npm run build:rust"
      )
    }
  })()

  if (result.status !== "ok") {
    throw new Error(
      `FATAL: Native watch start returned status '${result.status}'.\n` +
      "This package requires native Rust bindings."
    )
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
        return []
      }
    })()

    if (raw.length === 0) return

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
