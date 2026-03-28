/**
 * tailwind-styled-v4 — Rspack Plugin v5 (stable)
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
 * - Uses @tailwind-styled/engine for build
 * - Mode always zero-runtime
 */

import path from "node:path"
import { fileURLToPath } from "node:url"

// ESM-compatible __dirname equivalent
function getDirname(): string {
  if (typeof __dirname !== "undefined") {
    return __dirname
  }
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

interface RspackCompiler {
  options: {
    mode?: string
    module?: {
      rules?: Array<Record<string, unknown>>
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

const LOADER_PATH = path.resolve(getDirname(), "loader.js")

export class TailwindStyledRspackPlugin {
  private opts: RspackPluginOptions

  constructor(opts: RspackPluginOptions = {}) {
    this.opts = opts
  }

  apply(compiler: RspackCompiler): void {
    const isDev = compiler.options.mode !== "production"

    const loaderOpts = {
      // v5: Always zero-runtime
      mode: "zero-runtime" as const,
      addDataAttr: this.opts.addDataAttr ?? isDev,
      // Preserve cv, cx, cn, etc — only tw.* is transformed
      preserveImports: true,
    }

    const include = this.opts.include ?? /\.[jt]sx?$/
    const exclude = this.opts.exclude ?? /node_modules/

    // Check idempotency
    const existing = compiler.options.module?.rules ?? []
    const alreadyRegistered = existing.some((r) => typeof r === "object" && r !== null && "_tailwindStyledRspackMarker" in r)
    if (alreadyRegistered) return

    const rule = {
      _tailwindStyledRspackMarker: true,
      test: include,
      exclude: exclude,
      use: [
        {
          loader: LOADER_PATH,
          options: loaderOpts,
        },
      ],
    }

    compiler.options.module.rules = [rule, ...existing]
  }
}

export function tailwindStyledRspackPlugin(
  opts: RspackPluginOptions = {}
): TailwindStyledRspackPlugin {
  return new TailwindStyledRspackPlugin(opts)
}

export default tailwindStyledRspackPlugin

// Re-export schemas
export {
  RspackPluginOptionsSchema,
  parseRspackPluginOptions,
  type RspackPluginOptionsInput,
} from "./schemas"
