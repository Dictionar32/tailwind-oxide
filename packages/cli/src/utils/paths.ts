import path from "node:path"
import { fileURLToPath } from "node:url"

import { CliUsageError } from "./errors"
import { pathExists } from "./fs"

export function runtimeDirFromImportMeta(importMetaUrl: string): string {
  const filename = fileURLToPath(importMetaUrl)
  return path.dirname(filename)
}

export async function resolveMonorepoPath(
  runtimeDir: string,
  relativeToRepoRoot: string
): Promise<string> {
  const fromRuntime = path.resolve(runtimeDir, "..", "..", "..", relativeToRepoRoot)
  const fromCwd = path.resolve(process.cwd(), relativeToRepoRoot)
  return (await pathExists(fromRuntime)) ? fromRuntime : fromCwd
}

export async function ensureScriptPath(
  runtimeDir: string,
  relativeToRepoRoot: string,
  label = relativeToRepoRoot
): Promise<string> {
  const resolved = await resolveMonorepoPath(runtimeDir, relativeToRepoRoot)
  if (!(await pathExists(resolved))) {
    throw new CliUsageError(`Required script not found: ${label}`)
  }
  return resolved
}

export async function firstExistingPath(paths: string[]): Promise<string | null> {
  for (const candidate of paths) {
    if (await pathExists(candidate)) return candidate
  }
  return null
}
