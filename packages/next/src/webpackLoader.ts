/**
 * tailwind-styled-v4 - Webpack Loader
 */

import {
  type LoaderOutput,
  runLoaderTransform,
  shouldSkipFile,
} from "@tailwind-styled/compiler/internal"

interface WebpackLoaderOptions {
  mode?: "zero-runtime"
  autoClientBoundary?: boolean
  addDataAttr?: boolean
  hoist?: boolean
  routeCss?: boolean
  incremental?: boolean
  verbose?: boolean
  preserveImports?: boolean
}

interface WebpackContext {
  resourcePath: string
  getOptions(): WebpackLoaderOptions
  async(): (err: Error | null, result?: string) => void
}

export default function webpackLoader(this: WebpackContext, source: string): void {
  const callback = this.async()
  const filepath = this.resourcePath

  if (shouldSkipFile(filepath) || filepath.includes(".next")) {
    callback(null, source)
    return
  }

  try {
    const options = this.getOptions()

    const output: LoaderOutput = runLoaderTransform({
      filepath,
      source,
      options: {
        mode: options.mode,
        autoClientBoundary: options.autoClientBoundary ?? true,
        addDataAttr: options.addDataAttr,
        hoist: options.hoist,
        filename: filepath,
        routeCss: options.routeCss,
        incremental: options.incremental,
        verbose: options.verbose,
        preserveImports: true,
      },
    })

    if (options.verbose && output.changed) {
      const env = output.rsc?.isServer ? "server" : "client"
      const engine = output.engine ?? "js"
      const name = filepath.split(/[/\\]/).pop()
      console.log(
        `[tailwind-styled/webpack] ${name} -> ${output.classes.length} classes (${env}) [${engine}]`
      )
    }

    callback(null, output.code)
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[tailwind-styled-v4] Webpack transform failed for ${filepath}:`, err)
    }
    callback(null, source)
  }
}
