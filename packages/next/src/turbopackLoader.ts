/**
 * tailwind-styled-v4 - Turbopack Loader
 *
 * Router-aware: auto-detects App Router vs Pages Router
 * and adjusts options accordingly.
 */

import { runLoaderTransform } from "@tailwind-styled/compiler/internal"

interface TurbopackContext {
  resourcePath: string
}

interface TurbopackLoaderOptions {
  addDataAttr?: boolean | string
  autoClientBoundary?: boolean | string
  hoist?: boolean | string
  preserveImports?: boolean | string
}

function parseBool(val: boolean | string | undefined): boolean {
  if (typeof val === "boolean") return val
  if (typeof val === "string") return val === "true"
  return false
}

function detectRouter(resourcePath: string): "app" | "pages" | "unknown" {
  if (/[/\\]app[/\\]/.test(resourcePath)) return "app"
  if (/[/\\]pages[/\\]/.test(resourcePath)) return "pages"
  return "unknown"
}

export default function turbopackLoader(
  this: TurbopackContext,
  source: string,
  options: TurbopackLoaderOptions = {}
): string {
  const router = detectRouter(this.resourcePath)

  const addDataAttr = parseBool(options.addDataAttr)
  const autoClientBoundary =
    router === "app" ? true : parseBool(options.autoClientBoundary)
  const hoist = parseBool(options.hoist)

  const directiveMatch = source.match(/^\s*"use (client|server)"\s*;?\s*\n/)
  const directive = directiveMatch ? `"use ${directiveMatch[1]}";\n` : ""

  const output = runLoaderTransform({
    filepath: this.resourcePath,
    source,
    options: {
      addDataAttr,
      autoClientBoundary,
      hoist,
      preserveImports: true,
    },
  })

  if (!directive) return output.code

  const stripped = output.code.replace(/"use (client|server)"\s*;?\s*\n?/g, "")
  return directive + stripped
}
