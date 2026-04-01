/**
 * tailwind-styled-v4 - Rspack Plugin v5 (stable)
 *
 * Usage:
 *   import { tailwindStyledRspackPlugin } from "@tailwind-styled/rspack"
 *
 *   export default defineConfig({
 *     plugins: [tailwindStyledRspackPlugin()],
 *   })
 *
 * v5:
 * - Simplified API
 * - Mode always zero-runtime
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { parseRspackPluginOptions } from "./schemas"

function getDirname(): string {
  if (typeof __dirname !== "undefined") {
    return __dirname
  }
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

function resolveLoaderPath(basename: string): string {
  const runtimeDir = getDirname()
  const preferredExtensions =
    typeof __dirname !== "undefined" && __dirname.length > 0 ? [".cjs", ".js"] : [".js", ".cjs"]

  for (const ext of preferredExtensions) {
    const candidate = path.resolve(runtimeDir, `${basename}${ext}`)
    if (fs.existsSync(candidate)) return candidate
  }

  return path.resolve(runtimeDir, `${basename}.js`)
}

interface RspackRule {
  _tailwindStyledRspackMarker?: boolean
  test?: RegExp
  exclude?: RegExp
  use?: Array<{
    loader: string
    options: {
      mode: "zero-runtime"
      addDataAttr: boolean
      preserveImports: boolean
    }
  }>
}

interface RspackCompiler {
  options: {
    mode?: string
    module?: {
      rules?: RspackRule[]
    }
  }
}

export interface RspackPluginOptions {
  /** File patterns to include. Default: /\.[jt]sx?$/ */
  include?: RegExp
  /** File patterns to exclude. Default: /node_modules/ */
  exclude?: RegExp
  /** Add data-tw debug attributes in dev. Default: true in dev */
  addDataAttr?: boolean
  /** Enable analyzer. Default: false */
  analyze?: boolean
}

export class TailwindStyledRspackPlugin {
  private opts: RspackPluginOptions

  constructor(opts: RspackPluginOptions = {}) {
    this.opts = parseRspackPluginOptions(opts)
  }

  apply(compiler: RspackCompiler): void {
    const isDev = compiler.options.mode !== "production"
    const loaderPath = resolveLoaderPath("loader")
    const existing = compiler.options.module?.rules ?? []
    const alreadyRegistered = existing.some(
      (rule) =>
        typeof rule === "object" && rule !== null && rule._tailwindStyledRspackMarker === true
    )

    if (alreadyRegistered) return

    const rule: RspackRule = {
      _tailwindStyledRspackMarker: true,
      test: this.opts.include ?? /\.[jt]sx?$/,
      exclude: this.opts.exclude ?? /node_modules/,
      use: [
        {
          loader: loaderPath,
          options: {
            mode: "zero-runtime",
            addDataAttr: this.opts.addDataAttr ?? isDev,
            preserveImports: true,
          },
        },
      ],
    }

    compiler.options.module = {
      ...(compiler.options.module ?? {}),
      rules: [rule, ...existing],
    }
  }
}

export function tailwindStyledRspackPlugin(
  opts: RspackPluginOptions = {}
): TailwindStyledRspackPlugin {
  return new TailwindStyledRspackPlugin(opts)
}

export default tailwindStyledRspackPlugin

export {
  parseRspackPluginOptions,
  type RspackPluginOptionsInput,
  RspackPluginOptionsSchema,
} from "./schemas"
