/**
 * tailwind-styled-v4 — Route CSS Middleware (Sprint 6)
 *
 * Membaca css-manifest.json dan menyediakan helper untuk inject
 * `<link>` tags per route di Next.js App Router.
 *
 * Usage in layout.tsx:
 *   import { getRouteCssLinks } from 'tailwind-styled-v4/next/route-css'
 *   export default function Layout({ children }) {
 *     return (
 *       <html>
 *         <head>
 *           {getRouteCssLinks('/')}
 *         </head>
 *         <body>{children}</body>
 *       </html>
 *     )
 *   }
 */

import fs from "node:fs"
import path from "node:path"

export interface RouteCssManifest {
  [route: string]: string
}

const _cache = {
  manifest: null as RouteCssManifest | null,
  manifestPath: null as string | null,
}

/** Load css-manifest.json. Cached after first read. */
export function loadRouteCssManifest(manifestPath?: string): RouteCssManifest | null {
  const candidates = [
    manifestPath,
    process.env.TW_CSS_MANIFEST,
    path.join(process.cwd(), ".next", "static", "css", "tw", "css-manifest.json"),
    path.join(process.cwd(), "artifacts", "route-css", "css-manifest.json"),
    // Sprint 10+: dev mode — served at /__tw/css-manifest.json via Next.js rewrites
    path.join(process.cwd(), "public", "__tw", "css-manifest.json"),
  ].filter(Boolean) as string[]

  for (const p of candidates) {
    if (_cache.manifestPath === p && _cache.manifest) return _cache.manifest
    if (fs.existsSync(p)) {
      try {
        _cache.manifest = JSON.parse(fs.readFileSync(p, "utf8"))
        _cache.manifestPath = p
        return _cache.manifest
      } catch {}
    }
  }
  return null
}

/** Get CSS file paths for a given route. Returns global + route-specific. */
export function getRouteCssPaths(route: string, manifestPath?: string): string[] {
  const manifest = loadRouteCssManifest(manifestPath)
  if (!manifest) return []

  const paths: string[] = []
  // Always include global CSS
  if (manifest.__global) paths.push(manifest.__global)
  // Route-specific
  if (manifest[route]) paths.push(manifest[route])
  return paths
}

/** Get <link> JSX elements for a given route (React Server Component safe). */
export function getRouteCssLinks(
  route: string,
  opts: { baseUrl?: string; manifestPath?: string } = {}
): Array<{ type: "link"; props: Record<string, string> }> {
  const paths = getRouteCssPaths(route, opts.manifestPath)
  const base = opts.baseUrl ?? ""

  return paths.map((cssPath) => ({
    type: "link",
    props: {
      rel: "stylesheet",
      href: `${base}/${cssPath.replace(/\\/g, "/")}`,
      as: "style",
    },
  }))
}

/**
 * Inject <link> tags into an HTML string (for edge middleware / SSR).
 * Inserts before </head>.
 */
export function injectRouteCssIntoHtml(
  html: string,
  route: string,
  opts: { baseUrl?: string; manifestPath?: string } = {}
): string {
  const paths = getRouteCssPaths(route, opts.manifestPath)
  if (paths.length === 0) return html

  const links = paths
    .map((p) => `<link rel="stylesheet" href="/${p.replace(/\\/g, "/")}" as="style">`)
    .join("\n  ")

  return html.replace("</head>", `  ${links}\n</head>`)
}

/** Invalidate manifest cache (call after a build). */
export function invalidateRouteCssManifest(): void {
  _cache.manifest = null
  _cache.manifestPath = null
}

// ─── Sprint 7: Dynamic route CSS ─────────────────────────────────────────────

/**
 * Resolve dynamic route pattern to a manifest key.
 * "/post/[id]" with params {id: "123"} → tries "/post/123" first, falls back to "/post/[id]"
 * "/blog/[...slug]" with params {slug: ["a","b"]} → tries "/blog/a/b", falls back to "/blog/[...slug]"
 */
export function resolveDynamicRoute(
  routePattern: string,
  params: Record<string, string | string[]>,
  manifest: RouteCssManifest
): string {
  // Try to build concrete route from params
  const concrete = Object.entries(params).reduce((c, [key, value]) => {
    const val = Array.isArray(value) ? value.join("/") : value
    return c
      .replace(new RegExp(`\\[\\.\\.\\.(${key})\\]`), val) // [...slug] → a/b/c
      .replace(new RegExp(`\\[${key}\\]`), val) // [id] → 123
  }, routePattern)

  // Check if concrete route has CSS
  if (manifest[concrete]) return concrete

  // Fall back to pattern (shared CSS for all instances of this dynamic route)
  if (manifest[routePattern]) return routePattern

  // Fall back to parent route
  const parent = routePattern.split("/").slice(0, -1).join("/") || "/"
  if (manifest[parent]) return parent

  return "__global"
}

/**
 * Get CSS paths for a dynamic route with params.
 * Caches results per (route+params) combination.
 */
const _dynamicCache = new Map<string, string[]>()

export function getDynamicRouteCssPaths(
  routePattern: string,
  params: Record<string, string | string[]> = {},
  opts: { manifestPath?: string; noCache?: boolean } = {}
): string[] {
  const cacheKey = `${routePattern}:${JSON.stringify(params)}`
  if (!opts.noCache && _dynamicCache.has(cacheKey)) {
    return _dynamicCache.get(cacheKey)!
  }

  const manifest = loadRouteCssManifest(opts.manifestPath)
  if (!manifest) return []

  const resolvedRoute = resolveDynamicRoute(routePattern, params, manifest)
  const paths: string[] = []

  if (manifest.__global) paths.push(manifest.__global)
  if (manifest[resolvedRoute] && resolvedRoute !== "__global") paths.push(manifest[resolvedRoute])

  _dynamicCache.set(cacheKey, paths)
  return paths
}

/**
 * Get link descriptors for dynamic route (React Server Component safe).
 */
export function getDynamicRouteCssLinks(
  routePattern: string,
  params: Record<string, string | string[]> = {},
  opts: { baseUrl?: string; manifestPath?: string } = {}
): Array<{ type: "link"; props: Record<string, string> }> {
  const paths = getDynamicRouteCssPaths(routePattern, params, opts)
  const base = opts.baseUrl ?? ""
  return paths.map((cssPath) => ({
    type: "link" as const,
    props: {
      rel: "stylesheet",
      href: `${base}/${cssPath.replace(/\\/g, "/")}`,
      as: "style",
    },
  }))
}

/** Clear dynamic route cache (call after a build). */
export function invalidateDynamicRouteCache(): void {
  _dynamicCache.clear()
  invalidateRouteCssManifest()
}
