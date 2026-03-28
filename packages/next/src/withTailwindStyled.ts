import path from "node:path"
import { fileURLToPath } from "node:url"

import type { LoaderOptions } from "@tailwind-styled/compiler"

export interface TailwindStyledNextOptions
  extends Pick<
    LoaderOptions,
    | "mode"
    | "autoClientBoundary"
    | "addDataAttr"
    | "hoist"
    | "routeCss"
    | "incremental"
    | "verbose"
  > {
  include?: RegExp
  exclude?: RegExp
}

interface NextWebpackRule {
  test?: RegExp
  exclude?: RegExp
  use?: unknown[]
  _tailwindStyledNextMarker?: boolean
}

interface NextWebpackConfig {
  module?: {
    rules?: NextWebpackRule[]
  }
  [key: string]: unknown
}

interface NextConfigWithTurbopack {
  webpack?: (
    config: NextWebpackConfig,
    options: Record<string, unknown>
  ) => NextWebpackConfig | Promise<NextWebpackConfig>
  turbopack?: {
    rules?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

const resolveRuntimeDir = (): string => {
  if (typeof __dirname !== "undefined" && __dirname.length > 0) {
    return __dirname
  }
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

const WEBPACK_LOADER_PATH = path.resolve(resolveRuntimeDir(), "webpackLoader.js")
const TURBOPACK_LOADER_PATH = path.resolve(resolveRuntimeDir(), "turbopackLoader.js")
const DEFAULT_INCLUDE = /\.[jt]sx?$/
const DEFAULT_EXCLUDE = /node_modules/

const createLoaderOptions = (options: TailwindStyledNextOptions): LoaderOptions => ({
  mode: options.mode ?? "zero-runtime",
  autoClientBoundary: options.autoClientBoundary ?? true,
  addDataAttr: options.addDataAttr,
  hoist: options.hoist,
  routeCss: options.routeCss,
  incremental: options.incremental,
  verbose: options.verbose,
  preserveImports: true,
})

const buildTurbopackRules = (
  loaderPath: string,
  loaderOptions: LoaderOptions
): Record<string, unknown> => ({
  "*.js": { loaders: [{ loader: loaderPath, options: loaderOptions }] },
  "*.jsx": { loaders: [{ loader: loaderPath, options: loaderOptions }] },
  "*.ts": { loaders: [{ loader: loaderPath, options: loaderOptions }] },
  "*.tsx": { loaders: [{ loader: loaderPath, options: loaderOptions }] },
})

const applyWebpackRule = (
  config: NextWebpackConfig,
  options: TailwindStyledNextOptions
): NextWebpackConfig => {
  const loaderOptions = createLoaderOptions(options)
  const rules = config.module?.rules ?? []
  const alreadyRegistered = rules.some((rule) => rule?._tailwindStyledNextMarker === true)

  if (!alreadyRegistered) {
    const tailwindStyledRule: NextWebpackRule = {
      _tailwindStyledNextMarker: true,
      test: options.include ?? DEFAULT_INCLUDE,
      exclude: options.exclude ?? DEFAULT_EXCLUDE,
      use: [{ loader: WEBPACK_LOADER_PATH, options: loaderOptions }],
    }

    config.module = {
      ...(config.module ?? {}),
      rules: [tailwindStyledRule, ...rules],
    }
  }

  return config
}

export function withTailwindStyled(options: TailwindStyledNextOptions = {}) {
  return function wrap(nextConfig: NextConfigWithTurbopack = {}): NextConfigWithTurbopack {
    const previousWebpack = nextConfig.webpack
    const loaderOptions = createLoaderOptions(options)

    return {
      ...nextConfig,
      webpack(config: NextWebpackConfig, webpackOptions: Record<string, unknown>) {
        const apply = (resolvedConfig: NextWebpackConfig) =>
          applyWebpackRule(resolvedConfig, options)

        if (typeof previousWebpack !== "function") {
          return apply(config)
        }

        const result = previousWebpack(config, webpackOptions)
        return result instanceof Promise ? result.then(apply) : apply(result)
      },
      turbopack: {
        ...(nextConfig.turbopack ?? {}),
        rules: {
          ...(nextConfig.turbopack?.rules ?? {}),
          ...buildTurbopackRules(TURBOPACK_LOADER_PATH, loaderOptions),
        },
      },
    }
  }
}
