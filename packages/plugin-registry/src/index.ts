import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const PLUGIN_NAME_REGEX = /^(@[a-z0-9-]+\/)?[a-z0-9-]+(@[0-9]+\.[0-9]+\.[0-9]+)?$/

export interface PluginInfo {
  name: string
  description: string
  version: string
  tags: string[]
  official?: boolean
  docs?: string
  install?: string
  integrity?: string
}

interface RegistryData {
  version: string
  official: PluginInfo[]
  community: PluginInfo[]
}

export interface InstallResult {
  plugin: string
  installed: boolean
  command: string
  exitCode: number
}

export type PluginRegistryErrorCode =
  | "INVALID_PLUGIN_NAME"
  | "PLUGIN_NOT_FOUND"
  | "EXTERNAL_CONFIRMATION_REQUIRED"
  | "INSTALL_COMMAND_FAILED"
  | "INSTALL_FAILED"
  | "NETWORK_ERROR"
  | "REGISTRY_LOAD_FAILED"

export interface PluginRegistryErrorPayload {
  code: PluginRegistryErrorCode
  message: string
  context?: Record<string, unknown>
}

export class PluginRegistryError extends Error {
  readonly code: PluginRegistryErrorCode
  readonly context?: Record<string, unknown>

  constructor(payload: PluginRegistryErrorPayload) {
    super(payload.message)
    this.name = "PluginRegistryError"
    this.code = payload.code
    this.context = payload.context
  }

  toObject(): PluginRegistryErrorPayload {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
    }
  }
}

export interface InstallOptions {
  dryRun?: boolean
  npmBin?: string
  allowExternal?: boolean
  confirmExternal?: boolean
}

export interface RegistryOptions {
  registryUrl?: string
}

export class PluginRegistry {
  private readonly plugins: PluginInfo[]
  private readonly registryVersion: string

  constructor(registryData?: RegistryData, options: RegistryOptions = {}) {
    if (options.registryUrl) {
      this.plugins = []
      this.registryVersion = "0.0.0"
    } else {
      const data = registryData
      const version = data?.version ?? "4.2.0"
      const official = (data?.official ?? []).map((item) => ({
        name: item.name,
        description: item.description,
        version: item.version,
        tags: [...item.tags],
        official: true,
        docs: item.docs,
        install: item.install,
        integrity: item.integrity,
      }))
      const community = (data?.community ?? []).map((item) => ({
        name: item.name,
        description: item.description,
        version: item.version,
        tags: [...item.tags],
        official: false,
      }))
      this.plugins = [...official, ...community]
      this.registryVersion = version
    }
  }

  static async loadFromUrl(url: string): Promise<PluginRegistry> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new PluginRegistryError({
          code: "NETWORK_ERROR",
          message: `Failed to fetch registry: ${response.status} ${response.statusText}`,
          context: { url, status: response.status },
        })
      }
      const data = (await response.json()) as RegistryData
      return new PluginRegistry(data, { registryUrl: url })
    } catch (error) {
      if (error instanceof PluginRegistryError) throw error
      throw new PluginRegistryError({
        code: "NETWORK_ERROR",
        message: `Failed to load registry: ${error instanceof Error ? error.message : String(error)}`,
        context: { url },
      })
    }
  }

  getVersion(): string {
    return this.registryVersion
  }

  search(query: string): PluginInfo[] {
    const q = query.trim().toLowerCase()
    if (!q) return [...this.plugins]

    return this.plugins.filter((plugin) => {
      return (
        plugin.name.toLowerCase().includes(q) ||
        plugin.description.toLowerCase().includes(q) ||
        plugin.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }

  getAll(): PluginInfo[] {
    return [...this.plugins]
  }

  getByName(pluginName: string): PluginInfo | undefined {
    const nameWithoutVersion = pluginName.split("@").slice(0, 2).join("@")
    return this.plugins.find((plugin) => plugin.name === nameWithoutVersion)
  }

  install(pluginName: string, options: InstallOptions = {}): InstallResult {
    const npmBin = options.npmBin ?? process.env.TW_PLUGIN_NPM_BIN ?? "npm"

    if (!PLUGIN_NAME_REGEX.test(pluginName)) {
      throw new PluginRegistryError({
        code: "INVALID_PLUGIN_NAME",
        message: `Nama plugin tidak valid: '${pluginName}'.`,
        context: {
          pluginName,
          expectedPattern: String(PLUGIN_NAME_REGEX),
        },
      })
    }

    const knownPlugin = this.getByName(pluginName)
    const isExternal = !knownPlugin

    if (isExternal && !options.allowExternal) {
      throw new PluginRegistryError({
        code: "PLUGIN_NOT_FOUND",
        message: `Plugin '${pluginName}' tidak ditemukan di registry. Coba cari dengan 'tw-plugin search <keyword>'.`,
        context: {
          pluginName,
          allowExternal: false,
        },
      })
    }

    if (isExternal && options.allowExternal && !options.confirmExternal) {
      throw new PluginRegistryError({
        code: "EXTERNAL_CONFIRMATION_REQUIRED",
        message: `Plugin eksternal '${pluginName}' butuh konfirmasi. Jalankan ulang dengan --allow-external --yes.`,
        context: {
          pluginName,
          allowExternal: true,
        },
      })
    }

    const command = `${npmBin} install ${pluginName}`
    if (options.dryRun) {
      return { plugin: pluginName, installed: true, command, exitCode: 0 }
    }

    const child = spawnSync(npmBin, ["install", pluginName], { stdio: "inherit" })
    if (child.error) {
      throw new PluginRegistryError({
        code: "INSTALL_COMMAND_FAILED",
        message: `Gagal menjalankan perintah install: ${command}`,
        context: {
          pluginName,
          command,
          reason: child.error.message,
        },
      })
    }

    if (child.status !== 0) {
      throw new PluginRegistryError({
        code: "INSTALL_FAILED",
        message: `Install gagal (${child.status ?? 1}): ${command}`,
        context: {
          pluginName,
          command,
          exitCode: child.status ?? 1,
        },
      })
    }

    return {
      plugin: pluginName,
      installed: true,
      command,
      exitCode: 0,
    }
  }

  uninstall(
    pluginName: string,
    options: { dryRun?: boolean; npmBin?: string } = {}
  ): {
    plugin: string
    uninstalled: boolean
    command: string
    exitCode: number
  } {
    const npmBin = options.npmBin ?? process.env.TW_PLUGIN_NPM_BIN ?? "npm"
    const command = `${npmBin} uninstall ${pluginName}`

    if (options.dryRun) {
      return { plugin: pluginName, uninstalled: true, command, exitCode: 0 }
    }

    const child = spawnSync(npmBin, ["uninstall", pluginName], { stdio: "inherit" })
    if (child.status !== 0 && child.status !== null) {
      throw new PluginRegistryError({
        code: "INSTALL_FAILED",
        message: `Uninstall gagal (${child.status}): ${command}`,
        context: { pluginName, command, exitCode: child.status },
      })
    }

    return {
      plugin: pluginName,
      uninstalled: true,
      command,
      exitCode: child.status ?? 0,
    }
  }

  verifyIntegrity(pluginName: string): { ok: boolean; reason?: string } {
    const plugin = this.getByName(pluginName)
    if (!plugin) return { ok: false, reason: `Plugin '${pluginName}' not in registry` }
    if (!plugin.integrity) {
      return { ok: true, reason: "no checksum registered (skip)" }
    }
    try {
      const pkgPath = join(process.cwd(), "node_modules", pluginName, "package.json")
      if (!existsSync(pkgPath)) return { ok: false, reason: "plugin not installed" }
      const content = readFileSync(pkgPath, "utf8")
      const hash = `sha256-${createHash("sha256").update(content).digest("base64")}`
      return hash === plugin.integrity
        ? { ok: true }
        : { ok: false, reason: `Integrity mismatch: expected ${plugin.integrity}` }
    } catch (e: unknown) {
      return {
        ok: false,
        reason: `Integrity check failed: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }

  checkForUpdate(pluginName: string): {
    hasUpdate: boolean
    current?: string
    latest?: string
    error?: string
  } {
    const plugin = this.getByName(pluginName)
    if (!plugin) return { hasUpdate: false, error: `Plugin '${pluginName}' not in registry` }
    try {
      const pkgPath = join(process.cwd(), "node_modules", pluginName, "package.json")
      if (!existsSync(pkgPath)) return { hasUpdate: false, error: "plugin not installed" }
      const current = JSON.parse(readFileSync(pkgPath, "utf8")).version ?? "0.0.0"
      const latest = plugin.version
      const parseV = (v: string) =>
        v
          .replace(/[^0-9.]/g, "")
          .split(".")
          .map(Number)
      const [ca, cb, cc] = parseV(current)
      const [la, lb, lc] = parseV(latest)
      const hasUpdate = la > ca || (la === ca && lb > cb) || (la === ca && lb === cb && lc > cc)
      return { hasUpdate, current, latest }
    } catch (e: unknown) {
      return {
        hasUpdate: false,
        error: `Update check failed: ${e instanceof Error ? e.message : String(e)}`,
      }
    }
  }

  checkAllUpdates(): Array<{
    name: string
    hasUpdate: boolean
    current?: string
    latest?: string
    error?: string
  }> {
    return this.plugins.map((p) => ({ name: p.name, ...this.checkForUpdate(p.name) }))
  }
}

const _state = { defaultRegistry: null as PluginRegistry | null }

export function getRegistry(): PluginRegistry {
  if (!_state.defaultRegistry) {
    const registryData = require("../registry.json") as RegistryData
    _state.defaultRegistry = new PluginRegistry(registryData)
  }
  return _state.defaultRegistry
}

export const registry = getRegistry()
