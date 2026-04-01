/**
 * tailwind-styled-v4 — Reactive State Engine
 *
 * Zero-JS CSS state management via data attributes.
 * No React re-render needed for style changes.
 *
 * How it works:
 *   1. tw.button({ state: { active: "bg-blue-500", loading: "opacity-70" } })
 *   2. State engine generates a unique class + injects CSS:
 *      .tw-s-abc123[data-active="true"] { @apply bg-blue-500; }
 *      .tw-s-abc123[data-loading="true"] { @apply opacity-70; }
 *   3. Component renders with the state class
 *   4. User sets data-active="true" directly — no state needed
 *
 * Devtools integration:
 *   All components register to __TW_STATE_REGISTRY__ for devtools inspection.
 */

import type { StateConfig } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Registry — tracks all state-enabled components
// ─────────────────────────────────────────────────────────────────────────────

export interface StateComponentEntry {
  id: string
  tag: string
  states: string[]
  cssInjected: boolean
}

const stateRegistry = new Map<string, StateComponentEntry>()

declare global {
  interface Window {
    __TW_STATE_REGISTRY__?: typeof stateRegistry
  }
}

if (typeof window !== "undefined") {
  window.__TW_STATE_REGISTRY__ = stateRegistry
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic hash — same config → same class (no re-injection on HMR)
// ─────────────────────────────────────────────────────────────────────────────

function hashState(tag: string, state: StateConfig): string {
  const key = tag + JSON.stringify(Object.entries(state).sort())
  const hash = key.split("").reduce((h, char) => ((h << 5) + h) ^ char.charCodeAt(0), 5381)
  return `tw-s-${Math.abs(hash).toString(36).slice(0, 6)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS generator — Tailwind class → plain CSS via CSSOM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map Tailwind utility classes to inline CSS declarations.
 * Subset covers all common state-driven utilities.
 * For full coverage the compiler strips this and uses the real Tailwind engine.
 */
const TW_MAP: Record<string, string> = {
  // Display
  hidden: "display:none",
  block: "display:block",
  flex: "display:flex",
  inline: "display:inline",
  "inline-flex": "display:inline-flex",
  grid: "display:grid",
  // Opacity
  "opacity-0": "opacity:0",
  "opacity-5": "opacity:0.05",
  "opacity-10": "opacity:0.1",
  "opacity-20": "opacity:0.2",
  "opacity-25": "opacity:0.25",
  "opacity-30": "opacity:0.3",
  "opacity-40": "opacity:0.4",
  "opacity-50": "opacity:0.5",
  "opacity-60": "opacity:0.6",
  "opacity-70": "opacity:0.7",
  "opacity-75": "opacity:0.75",
  "opacity-80": "opacity:0.8",
  "opacity-90": "opacity:0.9",
  "opacity-95": "opacity:0.95",
  "opacity-100": "opacity:1",
  // Cursor
  "cursor-pointer": "cursor:pointer",
  "cursor-not-allowed": "cursor:not-allowed",
  "cursor-default": "cursor:default",
  "cursor-wait": "cursor:wait",
  "cursor-move": "cursor:move",
  "cursor-grab": "cursor:grab",
  "cursor-grabbing": "cursor:grabbing",
  // Pointer events
  "pointer-events-none": "pointer-events:none",
  "pointer-events-auto": "pointer-events:auto",
  // Scale
  "scale-90": "transform:scale(0.9)",
  "scale-95": "transform:scale(0.95)",
  "scale-100": "transform:scale(1)",
  "scale-105": "transform:scale(1.05)",
  "scale-110": "transform:scale(1.1)",
  // Translate
  "translate-x-0": "transform:translateX(0)",
  "translate-y-0": "transform:translateY(0)",
  "-translate-x-1": "transform:translateX(-0.25rem)",
  "-translate-y-1": "transform:translateY(-0.25rem)",
  "translate-x-1": "transform:translateX(0.25rem)",
  "translate-y-1": "transform:translateY(0.25rem)",
  // Ring
  ring: "box-shadow:0 0 0 3px rgba(59,130,246,0.5)",
  "ring-2": "box-shadow:0 0 0 2px rgba(59,130,246,0.5)",
  "ring-4": "box-shadow:0 0 0 4px rgba(59,130,246,0.5)",
  "ring-inset": "box-shadow:inset 0 0 0 3px rgba(59,130,246,0.5)",
  // Border
  border: "border-width:1px",
  "border-2": "border-width:2px",
  "border-transparent": "border-color:transparent",
  // Outline
  "outline-none": "outline:2px solid transparent;outline-offset:2px",
  outline: "outline:2px solid currentColor",
  // Overflow
  "overflow-hidden": "overflow:hidden",
  "overflow-auto": "overflow:auto",
  "overflow-scroll": "overflow:scroll",
  // Text decoration
  underline: "text-decoration-line:underline",
  "no-underline": "text-decoration-line:none",
  "line-through": "text-decoration-line:line-through",
  // Font weight
  "font-bold": "font-weight:700",
  "font-semibold": "font-weight:600",
  "font-medium": "font-weight:500",
  "font-normal": "font-weight:400",
  // Background colors (common)
  "bg-transparent": "background-color:transparent",
  "bg-white": "background-color:#fff",
  "bg-black": "background-color:#000",
  "bg-blue-500": "background-color:rgb(59,130,246)",
  "bg-blue-600": "background-color:rgb(37,99,235)",
  "bg-red-500": "background-color:rgb(239,68,68)",
  "bg-green-500": "background-color:rgb(34,197,94)",
  "bg-yellow-500": "background-color:rgb(234,179,8)",
  "bg-zinc-900": "background-color:rgb(24,24,27)",
  "bg-zinc-800": "background-color:rgb(39,39,42)",
  // Text colors
  "text-white": "color:#fff",
  "text-black": "color:#000",
  "text-blue-500": "color:rgb(59,130,246)",
  "text-red-500": "color:rgb(239,68,68)",
  "text-zinc-400": "color:rgb(161,161,170)",
  "text-zinc-500": "color:rgb(113,113,122)",
}

function twClassesToCss(classes: string): string {
  const decls: string[] = []
  for (const cls of classes.trim().split(/\s+/)) {
    if (TW_MAP[cls]) decls.push(TW_MAP[cls])
    // Arbitrary values: bg-[#f00] color-[red]
    else if (cls.includes("[") && cls.includes("]")) {
      const val = cls.match(/\[(.+)\]/)?.[1]
      if (!val) continue
      if (cls.startsWith("bg-[")) decls.push(`background-color:${val}`)
      else if (cls.startsWith("text-[")) decls.push(`color:${val}`)
      else if (cls.startsWith("w-[")) decls.push(`width:${val}`)
      else if (cls.startsWith("h-[")) decls.push(`height:${val}`)
      else if (cls.startsWith("opacity-[")) decls.push(`opacity:${val}`)
    }
  }
  return decls.join(";")
}

// ─────────────────────────────────────────────────────────────────────────────
// Style injection — batched for performance (FIX CSS Rule Batching)
// ─────────────────────────────────────────────────────────────────────────────

function injectStateStyles(id: string, state: StateConfig): void {
  if (typeof document === "undefined") return

  const styleId = `tw-state-${id}`
  if (document.getElementById(styleId)) return // already injected

  const rules = Object.entries(state)
    .map(([stateName, classes]) => {
      const css = twClassesToCss(classes)
      return css ? `.${id}[data-${stateName}="true"]{${css}}` : null
    })
    .filter(Boolean) as string[]

  if (rules.length === 0) return

  // Try batched injector first (available when runtime-css is installed)
  try {
    const { batchedInject } = require("@tailwind-styled/runtime-css/batched") as {
      batchedInject: (css: string) => void
    }
    for (const rule of rules) batchedInject(rule)
    return
  } catch {
    // Fallback: per-element style tag (original behavior)
  }

  const style = document.createElement("style")
  style.id = styleId
  style.setAttribute("data-tw-state", id)
  style.textContent = rules.join("\n")
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface StateEngineResult {
  /** CSS class to add to the component */
  stateClass: string
  /** Whether this component uses state (for SSR data attributes) */
  hasState: true
  /** List of state names (for devtools) */
  stateNames: string[]
}

/**
 * Process a StateConfig for a component.
 * Returns the state class and injects CSS (client-side only).
 */
export function processState(tag: string, state: StateConfig): StateEngineResult {
  const id = hashState(tag, state)
  const stateNames = Object.keys(state)

  // Register for devtools
  if (!stateRegistry.has(id)) {
    stateRegistry.set(id, {
      id,
      tag,
      states: stateNames,
      cssInjected: false,
    })
  }

  // Inject CSS (client only)
  injectStateStyles(id, state)

  // Mark as injected
  const entry = stateRegistry.get(id)!
  entry.cssInjected = true

  return { stateClass: id, hasState: true, stateNames }
}

/**
 * Generate SSR-safe CSS string for a state config.
 * Used by SSR to inject styles into <head>.
 */
export function generateStateCss(tag: string, state: StateConfig): string {
  const id = hashState(tag, state)

  const rules = Object.entries(state)
    .map(([stateName, classes]) => {
      const css = twClassesToCss(classes)
      return css ? `.${id}[data-${stateName}="true"]{${css}}` : null
    })
    .filter(Boolean) as string[]

  return rules.join("\n")
}

/**
 * Get the state registry (for devtools).
 */
export function getStateRegistry(): Map<string, StateComponentEntry> {
  return stateRegistry
}
