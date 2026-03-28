/**
 * tailwind-styled-v4 — Tailwind Config Loader
 */

import fs from "node:fs"
import path from "node:path"

export type TailwindConfig = Record<string, unknown>

const CONFIG_FILES = [
  "tailwind.config.ts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
]

// ─────────────────────────────────────────────────────────────────────────────
// Config Cache - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────────

const createConfigCache = () => {
  const cacheState: { config: TailwindConfig | null; cwd: string } = {
    config: null,
    cwd: "",
  }

  return {
    get: (cwd: string): TailwindConfig | null => {
      if (cacheState.config && cacheState.cwd === cwd) return cacheState.config
      return null
    },
    set: (config: TailwindConfig, cwd: string): void => {
      cacheState.config = config
      cacheState.cwd = cwd
    },
    invalidate: (): void => {
      cacheState.config = null
      cacheState.cwd = ""
    },
  }
}

const configCache = createConfigCache()

export const loadTailwindConfig = (cwd = process.cwd()): TailwindConfig => {
  const cached = configCache.get(cwd)
  if (cached) return cached

  for (const file of CONFIG_FILES) {
    const fullPath = path.join(cwd, file)
    if (fs.existsSync(fullPath)) {
      try {
        const mod = require(fullPath)
        const config = mod.default ?? mod
        configCache.set(config, cwd)
        console.log(`[tailwind-styled-v4] Using config: ${file}`)
        return config
      } catch {
        // continue to next file
      }
    }
  }

  console.log("[tailwind-styled-v4] No tailwind config found → using built-in preset")
  const { defaultPreset } = require("../../preset/src/defaultPreset")
  configCache.set(defaultPreset, cwd)
  return defaultPreset
}

export const getContentPaths = (config: TailwindConfig, cwd = process.cwd()): string[] => {
  if (Array.isArray(config.content)) {
    return config.content.filter((item: unknown) => typeof item === "string")
  }

  if (config.content?.files) {
    return config.content.files.filter((f: unknown) => typeof f === "string")
  }

  return ["src", "app", "pages", "components"]
    .filter((d) => fs.existsSync(path.join(cwd, d)))
    .map((d) => `./${d}/**/*.{tsx,ts,jsx,js}`)
}

export const invalidateConfigCache = (): void => {
  configCache.invalidate()
}

export const isZeroConfig = (cwd = process.cwd()): boolean => {
  return !CONFIG_FILES.some((f) => fs.existsSync(path.join(cwd, f)))
}

export const bootstrapZeroConfig = (cwd = process.cwd()): {
  generatedConfig: boolean
  generatedCss: boolean
} => {
  const generatedConfig = false

  const cssPaths = [
    "src/app/globals.css",
    "app/globals.css",
    "src/index.css",
    "src/styles/globals.css",
  ]
  const hasGlobalCss = cssPaths.some((p) => fs.existsSync(path.join(cwd, p)))

  const generatedCss = (() => {
    if (hasGlobalCss) return false
    const { defaultGlobalCss } = require("../../preset/src/defaultPreset")
    const appDir = fs.existsSync(path.join(cwd, "src/app"))
      ? "src/app"
      : fs.existsSync(path.join(cwd, "app"))
        ? "app"
        : "src"
    const cssPath = path.join(cwd, appDir, "globals.css")
    if (fs.existsSync(path.dirname(cssPath))) {
      fs.writeFileSync(cssPath, defaultGlobalCss)
      console.log(`[tailwind-styled-v4] Generated ${cssPath}`)
      return true
    }
    return false
  })()

  return { generatedConfig, generatedCss }
}
