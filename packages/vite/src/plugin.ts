/**
 * tailwind-styled-v4 — Vite Plugin v5
 *
 * Usage in vite.config.ts:
 *   import { tailwindStyledPlugin } from "@tailwind-styled/vite"
 *   export default defineConfig({
 *     plugins: [react(), tailwindStyledPlugin()]
 *   })
 *
 * v5 Changes:
 * - Simplified API (removed deprecated options)
 * - Uses @tailwind-styled/engine for build
 * - Mode always zero-runtime
 */

import fs from "node:fs"
import path from "node:path"

import type { LoaderOptions, TransformOptions } from "@tailwind-styled/compiler"
import { generateSafelist, runLoaderTransform } from "@tailwind-styled/compiler"
import { createEngine } from "@tailwind-styled/engine"
import { scanWorkspaceAsync } from "@tailwind-styled/scanner"
import type { Plugin, ResolvedConfig, HmrContext } from "vite"

export interface VitePluginOptions {
  /** File patterns to include. Default: /\.(tsx|ts|jsx|js)$/ */
  include?: RegExp
  /** File patterns to exclude. Default: /node_modules/ */
  exclude?: RegExp
  /** Directories to scan. Default: ["src"] */
  scanDirs?: string[]
  /** Safelist output path. Default: ".tailwind-styled-safelist.json" */
  safelistOutput?: string
  /** Generate safelist at build end. Default: true */
  generateSafelist?: boolean
  /** Scan report output path. Default: ".tailwind-styled-scan-report.json" */
  scanReportOutput?: string
  /** Run engine build at build end. Default: true */
  useEngineBuild?: boolean
  /** Enable analyzer for semantic reports. Default: false */
  analyze?: boolean
  /** Throw error on engine build failure. If true, error will abort Vite build (useful for CI/CD). If false (default), error only shows console.warn. Default: false */
  strict?: boolean

  /** @deprecated in v5 - mode is always "zero-runtime" */
  mode?: "zero-runtime" | "runtime"
  /** @deprecated in v5 - handled by engine */
  routeCss?: boolean
  /** @deprecated in v5 - handled by engine with analyze: true */
  deadStyleElimination?: boolean
  /** @deprecated in v5 - no longer used */
  addDataAttr?: boolean
  /** @deprecated in v5 - no longer used */
  autoClientBoundary?: boolean
  /** @deprecated in v5 - no longer used */
  hoist?: boolean
  /** @deprecated in v5 - no longer used */
  incremental?: boolean
}

function warnDeprecated(options: VitePluginOptions, key: keyof VitePluginOptions, message: string) {
  if (options[key] !== undefined) {
    console.warn(`[tailwind-styled-v4] Warning: '${key}' is deprecated in v5. ${message}`)
  }
}

export function tailwindStyledPlugin(opts: VitePluginOptions = {}): Plugin {
  warnDeprecated(opts, "mode", "Only zero-runtime is supported.")
  warnDeprecated(opts, "routeCss", "Use engine's analyzing capabilities.")
  warnDeprecated(opts, "deadStyleElimination", "Use 'analyze: true' option instead.")
  warnDeprecated(opts, "addDataAttr", "Handled by engine internally.")
  warnDeprecated(opts, "autoClientBoundary", "Handled by engine internally.")
  warnDeprecated(opts, "hoist", "Handled by engine internally.")
  warnDeprecated(opts, "incremental", "Handled by engine internally.")

  const {
    include = /\.(tsx|ts|jsx|js)$/,
    exclude = /node_modules/,
    scanDirs = ["src"],
    safelistOutput = ".tailwind-styled-safelist.json",
    scanReportOutput = ".tailwind-styled-scan-report.json",
    generateSafelist: doSafelist = true,
    useEngineBuild = true,
    analyze = false,
    strict = false,
  } = opts

  const pluginState = { root: process.cwd(), isDev: true }

  return {
    name: "tailwind-styled-v4",
    enforce: "pre" as const,

    configResolved(config: ResolvedConfig) {
      pluginState.root = config.root
      pluginState.isDev = config.command === "serve"
    },

    transform(source: string, id: string) {
      const filepath = id.split("?")[0]
      if (!include.test(filepath)) return null
      if (exclude.test(filepath)) return null

      const loaderOptions: LoaderOptions = {
        // v5: Always zero-runtime (mode is deprecated)
        mode: "zero-runtime",
        addDataAttr: pluginState.isDev,
        filename: filepath,
        // Preserve cv, cx, cn, etc — only tw.* is transformed
        preserveImports: true,
      }

      const output = runLoaderTransform({
        filepath,
        source,
        options: loaderOptions,
        isDev: pluginState.isDev,
      })

      if (!output.changed) return null
      return { code: output.code, map: null }
    },

    async buildEnd() {
      if (pluginState.isDev) return

      if (doSafelist) {
        try {
          generateSafelist(
            scanDirs.map((d) => path.resolve(pluginState.root, d)),
            path.resolve(pluginState.root, safelistOutput),
            pluginState.root
          )
        } catch (e) {
          console.warn("[tailwind-styled-v4] Safelist generation failed:", e)
        }
      }

      try {
        const report = await scanWorkspaceAsync(pluginState.root)
        const reportPath = path.resolve(pluginState.root, scanReportOutput)
        fs.writeFileSync(
          reportPath,
          JSON.stringify(
            {
              root: pluginState.root,
              totalFiles: report.totalFiles,
              uniqueClassCount: report.uniqueClasses.length,
            },
            null,
            2
          ) + "\n"
        )
      } catch (e) {
        console.warn("[tailwind-styled-v4] Scan report generation failed:", e)
      }

      if (useEngineBuild) {
        try {
          const engine = await createEngine({
              root: pluginState.root,
              compileCss: true,
              analyze,
              scanner: {
                includeExtensions: [".tsx", ".ts", ".jsx", ".js"],
                ignoreDirectories: scanDirs,
              },
            })
            await engine.build()
            console.log("[tailwind-styled-v4] ✓ Engine build complete")
          } catch (e) {
          const msg = `[tailwind-styled-v4] Engine build step failed: ${e}`
          if (strict) {
            throw new Error(msg)
          } else {
            console.warn(msg)
          }
        }
      }
    },

    handleHotUpdate({ file, server }: HmrContext) {
      if (include.test(file) && !exclude.test(file)) {
        server.ws.send({ type: "full-reload" })
      }
    },
  }
}

export default tailwindStyledPlugin
