/**
 * tailwind-styled-v4 — Rspack Loader v5
 *
 * v5 Changes:
 * - Mode always zero-runtime (no more runtime mode)
 * - Uses native binding from compiler
 */

import type { LoaderOptions } from "@tailwind-styled/compiler"
import { runLoaderTransform, shouldSkipFile } from "@tailwind-styled/compiler"

interface RspackLoaderOptions extends LoaderOptions {
  addDataAttr?: boolean
  preserveImports?: boolean
}

interface RspackLoaderContext {
  resourcePath: string
  getOptions(): RspackLoaderOptions
  async(): (err: Error | null, result?: string) => void
}

export default function rspackLoader(this: RspackLoaderContext, source: string): void {
  const callback = this.async()
  const filepath = this.resourcePath

  if (shouldSkipFile(filepath) || filepath.includes(".rspack-dist")) {
    callback(null, source)
    return
  }

  try {
    const options = this.getOptions()

    const output = runLoaderTransform({
      filepath,
      source,
      options: {
        // v5: Always zero-runtime
        mode: "zero-runtime",
        addDataAttr: options.addDataAttr ?? true,
        hoist: true,
        filename: filepath,
        // Preserve cv, cx, cn, etc — only tw.* is transformed
        preserveImports: true,
      },
    })

    callback(null, output.code)
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[tailwind-styled/rspack] Transform failed for ${filepath}:`, err)
    }
    callback(null, source)
  }
}
