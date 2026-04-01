/**
 * tailwind-styled-v4 — Container Query Engine
 *
 * Generates @container rules from a simple breakpoint config.
 *
 * Usage:
 *   const Card = tw.div({
 *     base: "p-4",
 *     container: {
 *       sm: "flex-col",      // @container (min-width: 320px)
 *       md: "flex-row",      // @container (min-width: 640px)
 *       lg: "grid-cols-3",   // @container (min-width: 1024px)
 *     },
 *     containerName: "card",
 *   })
 *
 *   // Wrap with container context:
 *   const CardWrapper = tw.div`@container`
 *
 * Named containers:
 *   const SidebarCard = tw.div({
 *     base: "p-2",
 *     container: { lg: "text-sm" },
 *     containerName: "sidebar",
 *   })
 *   // Generates: @container sidebar (min-width: 1024px) { ... }
 */

import type { ContainerConfig } from "./types"

// ─────────────────────────────────────────────────────────────────────────────
// Breakpoint map — matches Tailwind defaults
// ─────────────────────────────────────────────────────────────────────────────

const CONTAINER_BREAKPOINTS: Record<string, string> = {
  xs: "240px",
  sm: "320px",
  md: "640px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

export interface ContainerEntry {
  id: string
  tag: string
  containerName?: string
  breakpoints: Array<{ minWidth: string; classes: string }>
  cssInjected: boolean
}

const containerRegistry = new Map<string, ContainerEntry>()

declare global {
  interface Window {
    __TW_CONTAINER_REGISTRY__?: typeof containerRegistry
  }
}

if (typeof window !== "undefined") {
  window.__TW_CONTAINER_REGISTRY__ = containerRegistry
}

// ─────────────────────────────────────────────────────────────────────────────
// Hash
// ─────────────────────────────────────────────────────────────────────────────

function hashContainer(tag: string, container: ContainerConfig, name?: string): string {
  const key = tag + (name ?? "") + JSON.stringify(Object.entries(container).sort())
  const hash = key.split("").reduce((h, char) => ((h << 5) + h) ^ char.charCodeAt(0), 5381)
  return `tw-cq-${Math.abs(hash).toString(36).slice(0, 6)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS generator
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal Tailwind → CSS for container query contexts */
const LAYOUT_MAP: Record<string, string> = {
  "flex-col": "flex-direction:column",
  "flex-row": "flex-direction:row",
  "flex-wrap": "flex-wrap:wrap",
  "flex-nowrap": "flex-wrap:nowrap",
  "flex-1": "flex:1 1 0%",
  hidden: "display:none",
  block: "display:block",
  flex: "display:flex",
  grid: "display:grid",
  "grid-cols-1": "grid-template-columns:repeat(1,minmax(0,1fr))",
  "grid-cols-2": "grid-template-columns:repeat(2,minmax(0,1fr))",
  "grid-cols-3": "grid-template-columns:repeat(3,minmax(0,1fr))",
  "grid-cols-4": "grid-template-columns:repeat(4,minmax(0,1fr))",
  "grid-cols-6": "grid-template-columns:repeat(6,minmax(0,1fr))",
  "grid-cols-12": "grid-template-columns:repeat(12,minmax(0,1fr))",
  "text-sm": "font-size:0.875rem;line-height:1.25rem",
  "text-base": "font-size:1rem;line-height:1.5rem",
  "text-lg": "font-size:1.125rem;line-height:1.75rem",
  "text-xl": "font-size:1.25rem;line-height:1.75rem",
  "text-2xl": "font-size:1.5rem;line-height:2rem",
  "text-xs": "font-size:0.75rem;line-height:1rem",
  "p-2": "padding:0.5rem",
  "p-4": "padding:1rem",
  "p-6": "padding:1.5rem",
  "p-8": "padding:2rem",
  "px-2": "padding-left:0.5rem;padding-right:0.5rem",
  "px-4": "padding-left:1rem;padding-right:1rem",
  "px-6": "padding-left:1.5rem;padding-right:1.5rem",
  "py-2": "padding-top:0.5rem;padding-bottom:0.5rem",
  "py-4": "padding-top:1rem;padding-bottom:1rem",
  "gap-2": "gap:0.5rem",
  "gap-4": "gap:1rem",
  "gap-6": "gap:1.5rem",
  "gap-8": "gap:2rem",
  "w-full": "width:100%",
  "w-1/2": "width:50%",
  "w-1/3": "width:33.333333%",
  "w-2/3": "width:66.666667%",
  "max-w-sm": "max-width:24rem",
  "max-w-md": "max-width:28rem",
  "max-w-lg": "max-width:32rem",
  "max-w-xl": "max-width:36rem",
  "items-center": "align-items:center",
  "items-start": "align-items:flex-start",
  "items-end": "align-items:flex-end",
  "justify-center": "justify-content:center",
  "justify-between": "justify-content:space-between",
  "justify-start": "justify-content:flex-start",
  "justify-end": "justify-content:flex-end",
}

function layoutClassesToCss(classes: string): string {
  const decls: string[] = []
  for (const cls of classes.trim().split(/\s+/)) {
    if (LAYOUT_MAP[cls]) decls.push(LAYOUT_MAP[cls])
    else if (cls.startsWith("w-[")) {
      const val = cls.match(/\[(.+)\]/)?.[1]
      if (val) decls.push(`width:${val}`)
    } else if (cls.startsWith("max-w-[")) {
      const val = cls.match(/\[(.+)\]/)?.[1]
      if (val) decls.push(`max-width:${val}`)
    }
  }
  return decls.join(";")
}

function buildContainerRules(
  id: string,
  container: ContainerConfig,
  containerName?: string
): string {
  const rules = Object.entries(container)
    .map(([key, value]) => {
      const minWidth =
        typeof value === "string"
          ? (CONTAINER_BREAKPOINTS[key] ?? key)
          : (value.minWidth ?? CONTAINER_BREAKPOINTS[key] ?? key)
      const classes = typeof value === "string" ? value : value.classes

      const css = layoutClassesToCss(classes)
      if (!css) return null

      const query = containerName
        ? `@container ${containerName} (min-width: ${minWidth})`
        : `@container (min-width: ${minWidth})`

      return `${query}{.${id}{${css}}}`
    })
    .filter(Boolean) as string[]

  return rules.join("\n")
}

// ─────────────────────────────────────────────────────────────────────────────
// Style injection
// ─────────────────────────────────────────────────────────────────────────────

function injectContainerStyles(
  id: string,
  container: ContainerConfig,
  containerName?: string
): void {
  if (typeof document === "undefined") return
  const styleId = `tw-cq-${id}`
  if (document.getElementById(styleId)) return

  const css = buildContainerRules(id, container, containerName)
  if (!css) return

  // Try batched injector first (available when runtime-css is installed)
  try {
    const { batchedInject } = require("@tailwind-styled/runtime-css/batched") as {
      batchedInject: (css: string) => void
    }
    for (const rule of css.split("\n").filter(Boolean)) batchedInject(rule)
    return
  } catch {
    // Fallback: per-element style tag
  }

  const style = document.createElement("style")
  style.id = styleId
  style.setAttribute("data-tw-container", id)
  style.textContent = css
  document.head.appendChild(style)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface ContainerQueryResult {
  containerClass: string
  hasContainer: true
}

export function processContainer(
  tag: string,
  container: ContainerConfig,
  containerName?: string
): ContainerQueryResult {
  const id = hashContainer(tag, container, containerName)

  if (!containerRegistry.has(id)) {
    const breakpoints = Object.entries(container).map(([key, value]) => ({
      minWidth: CONTAINER_BREAKPOINTS[key] ?? key,
      classes: typeof value === "string" ? value : value.classes,
    }))
    containerRegistry.set(id, {
      id,
      tag,
      containerName,
      breakpoints,
      cssInjected: false,
    })
  }

  injectContainerStyles(id, container, containerName)
  containerRegistry.get(id)!.cssInjected = true

  return { containerClass: id, hasContainer: true }
}

export function generateContainerCss(
  tag: string,
  container: ContainerConfig,
  containerName?: string
): string {
  const id = hashContainer(tag, container, containerName)
  return buildContainerRules(id, container, containerName)
}

export function getContainerRegistry(): Map<string, ContainerEntry> {
  return containerRegistry
}
