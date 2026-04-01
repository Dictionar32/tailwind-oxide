import path from "node:path"

import { pathExists, readFileSafe, readJsonSafe, writeFileSafe } from "../../utils/fs"
import type { CliLogger } from "../../utils/logger"
import { runCommand } from "../../utils/process"

export type ProjectType = "next" | "vite" | "react" | "rspack"
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun"

export interface SetupFlags {
  isDryRun: boolean
  skipInstall: boolean
  isYes: boolean
  isJson: boolean
  explicitProjectType: ProjectType | null
}

export interface SetupProjectOption {
  label: string
  value: ProjectType
  adapter: string
}

interface PackageJsonLike {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export function resolveExplicitProjectType(rawFlags: Set<string>): ProjectType | null {
  if (rawFlags.has("--next")) return "next"
  if (rawFlags.has("--vite")) return "vite"
  if (rawFlags.has("--rspack")) return "rspack"
  if (rawFlags.has("--react")) return "react"
  return null
}

export function configureSetupFlags(rawArgs: string[]): SetupFlags {
  const rawFlags = new Set(rawArgs.filter((arg) => arg.startsWith("--")))
  return {
    isDryRun: rawFlags.has("--dry-run"),
    skipInstall: rawFlags.has("--skip-install"),
    isYes: rawFlags.has("--yes"),
    isJson: rawFlags.has("--json"),
    explicitProjectType: resolveExplicitProjectType(rawFlags),
  }
}

async function readPackageJson(cwd: string): Promise<PackageJsonLike | null> {
  return readJsonSafe<PackageJsonLike>(path.join(cwd, "package.json"))
}

export async function detectPm(cwd: string): Promise<PackageManager> {
  if (await pathExists(path.join(cwd, "bun.lockb"))) return "bun"
  if (await pathExists(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm"
  if (await pathExists(path.join(cwd, "yarn.lock"))) return "yarn"
  return "npm"
}

export async function detectBundler(cwd: string): Promise<ProjectType | null> {
  const pkg = await readPackageJson(cwd)
  if (!pkg) return null

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  if (deps.next) return "next"
  if (deps.vite || deps["@vitejs/plugin-react"]) return "vite"
  if (deps["@rspack/core"] || deps.rspack) return "rspack"
  if (deps.react) return "react"
  return null
}

export async function alreadyInstalled(cwd: string, pkgName: string): Promise<boolean> {
  const pkg = await readPackageJson(cwd)
  if (!pkg) return false
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) }
  return pkgName in deps
}

export async function findExisting(cwd: string, names: string[]): Promise<string | null> {
  for (const name of names) {
    const resolved = path.join(cwd, name)
    if (await pathExists(resolved)) return resolved
  }
  return null
}

export async function writeFileWithDryRun(
  cwd: string,
  filePath: string,
  content: string,
  label: string,
  flags: SetupFlags,
  logger: CliLogger
): Promise<void> {
  if (flags.isDryRun) {
    logger.dry(`create ${label}`)
    return
  }
  await writeFileSafe(filePath, content)
  logger.ok(path.relative(cwd, filePath) || label)
}

export async function patchFileWithDryRun(
  filePath: string,
  patcher: (source: string) => string | null,
  label: string,
  flags: SetupFlags,
  logger: CliLogger
): Promise<boolean> {
  const source = await readFileSafe(filePath)
  if (!source) return false

  const patched = patcher(source)
  if (!patched) {
    logger.skip(`${label} sudah terkonfigurasi`)
    return false
  }

  if (flags.isDryRun) {
    logger.dry(`patch ${label}`)
    return true
  }

  await writeFileSafe(filePath, patched)
  logger.ok(`${label} dipatch`)
  return true
}

export async function installPackages(
  cwd: string,
  pm: PackageManager,
  pkgs: string[],
  dev: boolean,
  flags: SetupFlags,
  logger: CliLogger
): Promise<void> {
  if (flags.skipInstall) {
    logger.skip("npm install (--skip-install)")
    return
  }
  if (flags.isDryRun) {
    logger.dry(`${pm} install ${pkgs.join(" ")}`)
    return
  }

  const flag = dev ? (pm === "yarn" || pm === "bun" ? "-D" : "--save-dev") : "--save"
  const cmd =
    pm === "yarn"
      ? ["add", flag, ...pkgs]
      : pm === "bun"
        ? ["add", flag, ...pkgs]
        : ["install", flag, ...pkgs]

  logger.info(`$ ${pm} ${cmd.join(" ")}`)
  try {
    const exitCode = await runCommand(pm, cmd, {
      cwd,
      allowNonZeroExit: true,
      stdio: flags.isJson ? "pipe" : "inherit",
    })
    if (exitCode !== 0) {
      logger.warn(`install gagal - jalankan manual: ${pm} ${cmd.join(" ")}`)
    }
  } catch {
    logger.warn(`install gagal - jalankan manual: ${pm} ${cmd.join(" ")}`)
  }
}
