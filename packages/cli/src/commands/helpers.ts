import fs from "node:fs/promises"
import path from "node:path"

import { CliUsageError } from "../utils/errors"
import { firstExistingPath, resolveMonorepoPath } from "../utils/paths"
import type { CommandContext } from "./types"

export type PluginInfo = {
  name: string
  description: string
  version: string
  tags: string[]
  official?: boolean
}

export function enumerateVariantProps(matrix: Record<string, Array<string | number | boolean>>) {
  const keys = Object.keys(matrix)
  if (keys.length === 0) return [{}]
  const result: Array<Record<string, string | number | boolean>> = []

  function walk(index: number, current: Record<string, string | number | boolean>) {
    if (index >= keys.length) {
      result.push({ ...current })
      return
    }
    const key = keys[index]
    const values = matrix[key] ?? []
    for (const value of values) {
      current[key] = value
      walk(index + 1, current)
    }
  }

  walk(0, {})
  return result
}

export async function resolveScript(
  context: CommandContext,
  relativeToRepoRoot: string
): Promise<string> {
  const fromRuntime = await resolveMonorepoPath(context.runtimeDir, relativeToRepoRoot)
  const fromCwd = path.resolve(process.cwd(), relativeToRepoRoot)
  const resolved = await firstExistingPath([fromRuntime, fromCwd])
  if (!resolved) {
    throw new CliUsageError(`Required script not found: ${relativeToRepoRoot}`)
  }
  return resolved
}

export async function loadRegistry(context: CommandContext): Promise<PluginInfo[]> {
  const runtimeRegistryPath = await resolveMonorepoPath(
    context.runtimeDir,
    "packages/plugin-registry/registry.json"
  )
  const candidates: string[] = [
    runtimeRegistryPath,
    path.resolve(process.cwd(), "packages/plugin-registry/registry.json"),
  ]

  const registryPath = await firstExistingPath(candidates)
  if (!registryPath) {
    throw new CliUsageError("Plugin registry file not found.")
  }

  const raw = await fs.readFile(registryPath, "utf8")
  const data = JSON.parse(raw) as { official: PluginInfo[]; community: PluginInfo[] }
  return [
    ...data.official.map((item) => ({ ...item, official: true })),
    ...data.community.map((item) => ({ ...item, official: false })),
  ]
}

export function validatePackageName(value: string): boolean {
  return /^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/i.test(value)
}
