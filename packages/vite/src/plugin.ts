/**
 * tailwind-styled-v4 - Vite Plugin v5
 *
 * Usage in vite.config.ts:
 *   import { tailwindStyledPlugin } from "@tailwind-styled/vite"
 *   export default defineConfig({
 *     plugins: [react(), tailwindStyledPlugin()]
 *   })
 *
 * v5 Changes:
 * - Simplified API (removed deprecated options)
 * - Uses @tailwind-styled/engine for build orchestration
 * - Mode always zero-runtime
 */

import fs from "node:fs"
import path from "node:path"

import { runLoaderTransform } from "@tailwind-styled/compiler"
import { createEngine } from "@tailwind-styled/engine"
import type { HmrContext, Plugin, ResolvedConfig } from "vite"

import { parseVitePluginOptions } from "./schemas"

export interface VitePluginOptions {
  include?: RegExp
  exclude?: RegExp
  scanDirs?: string[]
  safelistOutput?: string
  generateSafelist?: boolean
  scanReportOutput?: string
  useEngineBuild?: boolean
  analyze?: boolean
  strict?: boolean
  mode?: "zero-runtime" | "runtime"
  routeCss?: boolean
  deadStyleElimination?: boolean
  addDataAttr?: boolean
  autoClientBoundary?: boolean
  hoist?: boolean
  incremental?: boolean
}

interface ViteLoaderOptions extends Record<string, unknown> {
  mode?: "zero-runtime"
  addDataAttr?: boolean
  filename?: string
  preserveImports?: boolean
}

interface ViteLoaderOutput {
  code: string
  changed: boolean
  classes: string[]
}

interface ScanWorkspaceResult {
  files: Array<{ file: string; classes: string[] }>
  totalFiles: number
  uniqueClasses: string[]
}

type ViteTransformRunner = (ctx: {
  filepath: string
  source: string
  options: ViteLoaderOptions
  isDev?: boolean
}) => ViteLoaderOutput

type ViteEngineFacade = {
  scanWorkspace(): Promise<ScanWorkspaceResult>
  build(): Promise<unknown>
}

type ViteEngineFactory = (options: {
  root?: string
  compileCss?: boolean
  analyze?: boolean
  scanner?: {
    includeExtensions?: string[]
  }
}) => Promise<ViteEngineFacade>

type InternalVitePluginOptions = VitePluginOptions & {
  __internalTransformRunner?: ViteTransformRunner
  __internalCreateEngine?: ViteEngineFactory
}

const SCAN_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"]

function warnDeprecated(options: VitePluginOptions, key: keyof VitePluginOptions, message: string) {
  if (options[key] !== undefined) {
    console.warn(`[tailwind-styled-v4] Warning: '${key}' is deprecated in v5. ${message}`)
  }
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function filterScanToDirs(
  scan: ScanWorkspaceResult,
  root: string,
  scanDirs: string[]
): ScanWorkspaceResult {
  const resolvedDirs = scanDirs.map((dir) => path.resolve(root, dir))
  if (resolvedDirs.length === 0) return scan

  const files = scan.files.filter((file) => {
    const absoluteFile = path.resolve(file.file)
    return resolvedDirs.some((directory) => isInsideDirectory(absoluteFile, directory))
  })

  const uniqueClasses = Array.from(new Set(files.flatMap((file) => file.classes))).sort()

  return {
    files,
    totalFiles: files.length,
    uniqueClasses,
  }
}

function writeJsonArtifact(root: string, relativePath: string, value: unknown): void {
  const outputPath = path.resolve(root, relativePath)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`)
}

export function tailwindStyledPlugin(opts: VitePluginOptions = {}): Plugin {
  const rawOptions = opts as InternalVitePluginOptions
  const parsedOptions = parseVitePluginOptions(rawOptions)

  warnDeprecated(parsedOptions, "mode", "Only zero-runtime is supported.")
  warnDeprecated(parsedOptions, "routeCss", "Use engine's analyzing capabilities.")
  warnDeprecated(parsedOptions, "deadStyleElimination", "Use 'analyze: true' option instead.")
  warnDeprecated(parsedOptions, "addDataAttr", "Handled by engine internally.")
  warnDeprecated(parsedOptions, "autoClientBoundary", "Handled by engine internally.")
  warnDeprecated(parsedOptions, "hoist", "Handled by engine internally.")
  warnDeprecated(parsedOptions, "incremental", "Handled by engine internally.")

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
  } = parsedOptions

  const transformRunner = rawOptions.__internalTransformRunner ?? runLoaderTransform
  const engineFactory = rawOptions.__internalCreateEngine ?? createEngine
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

      const loaderOptions: ViteLoaderOptions = {
        mode: "zero-runtime",
        addDataAttr: pluginState.isDev,
        filename: filepath,
        preserveImports: true,
      }

      let output: ViteLoaderOutput
      try {
        output = transformRunner({
          filepath,
          source,
          options: loaderOptions,
          isDev: pluginState.isDev,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[tailwind-styled-v4] Transform skipped for ${filepath}: ${message}`)
        return null
      }

      if (!output.changed) return null
      return { code: output.code, map: null }
    },

    async buildEnd() {
      if (pluginState.isDev) return

      const engine = await engineFactory({
        root: pluginState.root,
        compileCss: true,
        analyze,
        scanner: {
          includeExtensions: SCAN_EXTENSIONS,
        },
      })

      try {
        const scan = filterScanToDirs(await engine.scanWorkspace(), pluginState.root, scanDirs)

        if (doSafelist) {
          writeJsonArtifact(pluginState.root, safelistOutput, scan.uniqueClasses)
        }

        writeJsonArtifact(pluginState.root, scanReportOutput, {
          root: pluginState.root,
          totalFiles: scan.totalFiles,
          uniqueClassCount: scan.uniqueClasses.length,
        })
      } catch (error) {
        console.warn("[tailwind-styled-v4] Engine scan phase failed:", error)
      }

      if (!useEngineBuild) return

      try {
        await engine.build()
        console.log("[tailwind-styled-v4] Engine build complete")
      } catch (error) {
        const msg = `[tailwind-styled-v4] Engine build step failed: ${error}`
        if (strict) {
          throw new Error(msg)
        }
        console.warn(msg)
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
