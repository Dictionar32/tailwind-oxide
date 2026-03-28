"use server"

/**
 * tailwind-styled-v5 — CSS Injector (React Server Component)
 *
 * Inject CSS yang sudah di-generate per-route langsung ke <head>.
 * Dipakai di Next.js App Router layout atau page.
 *
 * Di server component — inject inline CSS, zero client JS.
 * Streaming friendly — CSS di-emit bersamaan dengan HTML.
 *
 * Usage:
 *   // app/layout.tsx
 *   import { TwCssInjector } from "tailwind-styled-v4/css"
 *   export default function Layout({ children }) {
 *     return <html><head><TwCssInjector/></head><body>{children}</body></html>
 *   }
 */

import fs from "node:fs"
import path from "node:path"
import React from "react"

interface CssInjectorProps {
  /** Override CSS directory. Default: .next/static/css/tw */
  cssDir?: string
  /** Specific route to inject. Default: auto-detect dari headers */
  route?: string
  /** Inject global CSS juga. Default: true */
  includeGlobal?: boolean
  /** Minify inline CSS. Default: true */
  minify?: boolean
  /** Add <link> tag instead of inline <style> untuk cached CSS */
  asLink?: boolean
  /** Override manifest path for dev mode */
  manifestPath?: string
}

const defaultProps: CssInjectorProps = {
  cssDir: undefined,
  route: undefined,
  includeGlobal: true,
  minify: true,
  asLink: false,
  manifestPath: undefined,
}

/**
 * Server Component — inject route-specific CSS into <head>.
 * No client JS, no hydration overhead.
 */
export async function TwCssInjector(props?: CssInjectorProps): Promise<React.ReactElement> {
  const { cssDir, route, includeGlobal, minify, asLink, manifestPath } = {
    ...defaultProps,
    ...props,
  }
  const resolvedDir = cssDir ?? path.join(process.cwd(), ".next", "static", "css", "tw")

  const cssChunks: string[] = []

  // Try manifest-based loading first (for dev mode)
  if (manifestPath) {
    const manifestCss = loadCssFromManifest(manifestPath, route ?? "/")
    if (manifestCss) {
      cssChunks.push(manifestCss)
    }
  } else {
    // Fallback: legacy file-based loading with path detection
    const detectedManifest = detectManifestPath(resolvedDir)
    if (detectedManifest) {
      const manifestCss = loadCssFromManifest(detectedManifest, route ?? "/")
      if (manifestCss) {
        cssChunks.push(manifestCss)
      }
    }
  }

  // 1. Global CSS (base styles, reset)
  if (includeGlobal) {
    const globalCss = loadCssFile(path.join(resolvedDir, "_global.css"))
    if (globalCss) cssChunks.push(globalCss)
  }

  // 2. Route-specific CSS
  const targetRoute = route ?? "/"
  const routeFile = routeToFilename(targetRoute)
  const routeCss = loadCssFile(path.join(resolvedDir, routeFile))
  if (routeCss) cssChunks.push(routeCss)

  if (cssChunks.length === 0) return React.createElement(React.Fragment, null)

  const combined = cssChunks.join("\n")
  const final = minify ? minifyCss(combined) : combined

  if (asLink) {
    // Return <link> tag — CSS cached by browser
    return React.createElement("link", {
      rel: "stylesheet",
      href: `/_next/static/css/tw/${routeFile}`,
      crossOrigin: "anonymous",
    })
  }

  // Inline <style> — zero network request, fastest FCP
  return React.createElement("style", {
    dangerouslySetInnerHTML: { __html: final },
    "data-tw-route": targetRoute,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook for client components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lightweight hook to get current route's CSS classes.
 * Useful for dynamic class injection in client components.
 *
 * Returns empty string on server (SSR) — CSS already injected by TwCssInjector.
 */
export function useTwClasses(classes: string): string {
  // In client environment, return classes as-is
  // CSS is already handled by TwCssInjector at server level
  return classes
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadCssFile(filepath: string): string | null {
  try {
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, "utf-8")
    }
  } catch {
    // file not found or unreadable
  }
  return null
}

function routeToFilename(route: string): string {
  if (route === "/") return "index.css"
  if (route === "__global") return "_global.css"
  return `${route.replace(/^\//, "").replace(/\//g, "_")}.css`
}

function detectManifestPath(cssDir: string): string | null {
  const candidates = [
    path.join(cssDir, "css-manifest.json"),
    path.join(process.cwd(), "public", "__tw", "css-manifest.json"),
    path.join(process.cwd(), "artifacts", "route-css", "css-manifest.json"),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

interface CssManifest {
  routes?: Record<string, string>
  global?: string
  [key: string]: unknown
}

function loadCssFromManifest(manifestPath: string, route: string): string | null {
  try {
    if (!fs.existsSync(manifestPath)) return null

    const content = fs.readFileSync(manifestPath, "utf-8")
    const manifest: CssManifest = JSON.parse(content)

    // Try route-specific CSS
    if (manifest.routes?.[route]) {
      const routeCssPath = path.join(path.dirname(manifestPath), manifest.routes[route])
      return loadCssFile(routeCssPath)
    }

    // Fallback: global CSS
    if (manifest.global) {
      const globalCssPath = path.join(path.dirname(manifestPath), manifest.global)
      return loadCssFile(globalCssPath)
    }
  } catch {
    // manifest not found or invalid
  }
  return null
}

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*{\s*/g, "{")
    .replace(/\s*}\s*/g, "}")
    .replace(/\s*;\s*/g, ";")
    .trim()
}
