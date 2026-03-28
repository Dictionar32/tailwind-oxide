/**
 * tailwind-styled-v4 - Turbopack Loader
 */

import type { LoaderOptions } from "@tailwind-styled/compiler"
import { runLoaderTransform } from "@tailwind-styled/compiler"

interface TurbopackContext {
  resourcePath: string
}

export default function turbopackLoader(
  this: TurbopackContext,
  source: string,
  options: LoaderOptions = {}
): string {
  const parseBool = (val: boolean | string | undefined): boolean => {
    if (typeof val === "boolean") return val
    if (typeof val === "string") return val === "true"
    return false
  }

  const addDataAttr = parseBool(options.addDataAttr)
  const autoClientBoundary = parseBool(options.autoClientBoundary)
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
      // Preserve cv, cx, cn, etc — only tw.* is transformed
      preserveImports: true,
    },
  })

  if (!directive) return output.code

  const stripped = output.code.replace(/"use (client|server)"\s*;?\s*\n?/g, "")
  return directive + stripped
}
