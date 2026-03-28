import * as fs from "node:fs"
import * as path from "node:path"
import { SCRIPTS, type ScriptName } from "../constants"

interface ResolveOptions {
  fallbackVersions?: number[]
  includeNodeModules?: boolean
}

const DEFAULT_FALLBACK_VERSIONS = [50, 49, 48, 47, 46, 45]

export function findScript(
  root: string,
  scriptRelPath: string,
  options: ResolveOptions = {}
): string | null {
  const { fallbackVersions = DEFAULT_FALLBACK_VERSIONS, includeNodeModules = true } = options

  const candidates: string[] = []

  candidates.push(path.join(root, scriptRelPath))

  const versionMatch = scriptRelPath.match(/\/v(\d+)\//)
  if (versionMatch) {
    const currentVersion = parseInt(versionMatch[1], 10)
    for (const v of fallbackVersions) {
      if (v !== currentVersion) {
        const fallback = scriptRelPath.replace(/\/v\d+\//, `/v${v}/`)
        candidates.push(path.join(root, fallback))
      }
    }
  }

  if (includeNodeModules) {
    candidates.push(path.join(root, "node_modules/@tailwind-styled/scripts", scriptRelPath))
    const pkgVersion = scriptRelPath.match(/\/v(\d+)\//)?.[1]
    if (pkgVersion) {
      candidates.push(
        path.join(
          root,
          `node_modules/tailwind-styled-v${pkgVersion}/scripts/v${pkgVersion}`,
          path.basename(scriptRelPath)
        )
      )
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

export function findAllScripts(root: string): Map<ScriptName, string | null> {
  const results = new Map<ScriptName, string | null>()

  for (const [name, scriptPath] of Object.entries(SCRIPTS)) {
    const found = findScript(root, scriptPath)
    results.set(name as ScriptName, found)
  }

  return results
}

export function findLspScript(root: string, bundledPath: string): string | null {
  const candidates = [
    bundledPath,
    path.join(root, "scripts/v50/lsp.mjs"),
    path.join(root, "scripts/v49/lsp.mjs"),
    path.join(root, "scripts/v48/lsp.mjs"),
    path.join(root, "scripts/v48/lsp.mjs"),
    path.join(root, "node_modules/@tailwind-styled/scripts/v50/lsp.mjs"),
    path.join(root, "node_modules/tailwind-styled-v50/scripts/v50/lsp.mjs"),
    path.join(root, "node_modules/tailwind-styled-v48/scripts/v48/lsp.mjs"),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}
