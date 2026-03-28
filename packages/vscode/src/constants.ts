export const SCRIPT_VERSION = "v50" as const

export const SCRIPTS = {
  ai: `scripts/v45/ai.mjs`,
  splitRoutes: `scripts/v49/split-routes.mjs`,
  figmaSync: `scripts/v45/figma-sync.mjs`,
  lsp: `scripts/v48/lsp.mjs`,
} as const

export type ScriptName = keyof typeof SCRIPTS
export type ScriptPath = (typeof SCRIPTS)[ScriptName]

export const DEFAULT_TIMEOUT = 30000
