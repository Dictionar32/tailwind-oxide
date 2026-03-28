"use client"

/**
 * tailwind-styled-v5 — Batched CSS Injector (Client Runtime)
 *
 * Menggantikan pattern inject-per-komponen yang menyebabkan banyak
 * style recalculation saat banyak komponen mount bersamaan.
 *
 * Cara kerja:
 *   - Semua CSS rules dari render cycle yang sama dikumpulkan
 *   - Satu requestAnimationFrame = satu DOM style update
 *   - Deduplication via Set<string> — rule yang sama tidak diinjeksi dua kali
 *   - Fallback synchronous untuk SSR / server context
 *
 * Usage (internal, dipakai oleh stateEngine dan containerQuery):
 *   import { batchedInject, flushBatchedCss } from "./batchedInjector"
 *
 *   // Queue a rule
 *   batchedInject(".tw-s-abc123[data-active=\"true\"]{opacity:0.5}")
 *
 *   // Force flush (biasanya tidak perlu — RAF melakukan ini otomatis)
 *   flushBatchedCss()
 */

// ─────────────────────────────────────────────────────────────────────────────
// Singleton state
// ─────────────────────────────────────────────────────────────────────────────

/** All injected rules (deduplication registry) */
const injected = new Set<string>()

/** Pending rules for current RAF batch */
const pending: string[] = []

/** RAF handle and style element state */
const _state = {
  rafHandle: null as ReturnType<typeof requestAnimationFrame> | null,
  styleEl: null as HTMLStyleElement | null,
}

function getStyleElement(): HTMLStyleElement {
  if (_state.styleEl && document.head.contains(_state.styleEl)) return _state.styleEl

  _state.styleEl = document.createElement("style")
  _state.styleEl.id = "__tw-runtime-css"
  _state.styleEl.setAttribute("data-tw-batched", "true")
  document.head.appendChild(_state.styleEl)
  return _state.styleEl
}

// ─────────────────────────────────────────────────────────────────────────────
// Core API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Queue a CSS rule for batched injection.
 * Multiple rules accumulated during one event loop tick are flushed together
 * in one requestAnimationFrame → one style recalculation.
 */
export function batchedInject(cssRule: string): void {
  if (typeof window === "undefined") return // SSR — no-op
  if (!cssRule || injected.has(cssRule)) return

  injected.add(cssRule)
  pending.push(cssRule)

  if (_state.rafHandle === null) {
    _state.rafHandle = requestAnimationFrame(flushBatchedCss)
  }
}

/**
 * Immediately flush all pending CSS rules to the DOM.
 * Called automatically by RAF each frame. Can also be called manually
 * after synchronous component setup where RAF timing is too late.
 */
export function flushBatchedCss(): void {
  _state.rafHandle = null

  if (pending.length === 0 || typeof document === "undefined") return

  const el = getStyleElement()
  const css = pending.join("\n")
  pending.length = 0

  // Append rather than replace — preserves previously injected rules
  el.textContent += `\n${css}`
}

/**
 * Synchronous inject — skips batching.
 * Use for SSR / critical path where RAF is not available.
 */
export function syncInject(cssRule: string): void {
  if (typeof document === "undefined") return
  if (!cssRule || injected.has(cssRule)) return

  injected.add(cssRule)
  getStyleElement().textContent += `\n${cssRule}`
}

/**
 * Check if a rule has already been injected (deduplication check).
 */
export function isInjected(cssRule: string): boolean {
  return injected.has(cssRule)
}

/**
 * Clear all injected rules and remove the style element.
 * Useful for testing / SSR resets. Not for production use.
 */
export function resetBatchedCss(): void {
  injected.clear()
  pending.length = 0

  if (_state.rafHandle !== null) {
    cancelAnimationFrame(_state.rafHandle)
    _state.rafHandle = null
  }

  if (_state.styleEl && document.head.contains(_state.styleEl)) {
    document.head.removeChild(_state.styleEl)
    _state.styleEl = null
  }
}

/**
 * Get stats about the current injection state (for devtools).
 */
export function getBatchedCssStats(): {
  totalInjected: number
  pendingCount: number
  hasBatchScheduled: boolean
} {
  return {
    totalInjected: injected.size,
    pendingCount: pending.length,
    hasBatchScheduled: _state.rafHandle !== null,
  }
}
