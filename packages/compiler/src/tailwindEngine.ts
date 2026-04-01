/**
 * tailwind-styled-v4 — Embedded Tailwind Engine
 *
 * Native-only: Rust CSS compiler is required.
 * No JavaScript fallback — native Rust binding must be available.
 */

import fs from "node:fs"
import path from "node:path"
import { getAllRoutes, getRouteClasses } from "./routeCssCollector"

export type TailwindEngineMode = "jit" | "build" | "manual"

export interface TailwindEngineOptions {
  mode?: TailwindEngineMode
  cwd?: string
  outputDir?: string
  config?: Record<string, unknown>
  minify?: boolean
}

export interface CssGenerateResult {
  route: string
  css: string
  classes: string[]
  sizeBytes: number
}

export const generateCssForClasses = async (
  classes: string[],
  _config?: Record<string, unknown>,
  _cwd = process.cwd()
): Promise<string> => {
  const { compileCssFromClasses } = require("./cssCompiler") as typeof import("./cssCompiler")
  const result = compileCssFromClasses(classes)
  if (!result?.css || result.resolvedClasses.length === 0) {
    throw new Error(
      "FATAL: Native CSS compiler failed to resolve classes.\n" +
      "This package requires native Rust bindings.\n" +
      `Unresolved classes: ${classes.join(", ")}`
    )
  }
  return result.css
}

export const generateAllRouteCss = async (
  opts: TailwindEngineOptions = {}
): Promise<CssGenerateResult[]> => {
  const { cwd = process.cwd(), outputDir, minify = true } = opts

  const results: CssGenerateResult[] = []
  const routes = getAllRoutes()

  for (const route of routes) {
    const classes = Array.from(getRouteClasses(route))
    if (classes.length === 0) continue

    const rawCss = await generateCssForClasses(classes, undefined, cwd)
    const css = minify ? minifyCss(rawCss) : rawCss

    results.push({
      route,
      css,
      classes,
      sizeBytes: Buffer.byteLength(css, "utf8"),
    })
  }

  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true })

    for (const result of results) {
      const filename = routeToFilename(result.route)
      const filepath = path.join(outputDir, filename)
      fs.mkdirSync(path.dirname(filepath), { recursive: true })
      fs.writeFileSync(filepath, result.css)
    }

    const totalSize = results.reduce((sum, r) => sum + r.sizeBytes, 0)
    console.log(
      `[tailwind-styled-v4] Route CSS generated: ${results.length} routes, ${formatBytes(totalSize)} total`
    )
  }

  return results
}

const routeToFilename = (route: string): string => {
  if (route === "/") return "index.css"
  if (route === "__global") return "_global.css"
  return `${route.replace(/^\//, "").replace(/\//g, "_")}.css`
}

const minifyCss = (css: string): string => {
  return css
    .replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*{\s*/g, "{")
    .replace(/\s*}\s*/g, "}")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*;\s*/g, ";")
    .trim()
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
