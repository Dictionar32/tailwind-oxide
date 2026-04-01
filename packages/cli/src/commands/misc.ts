import path from "node:path"
import { parseArgs as parseNodeArgs } from "node:util"
import { CliUsageError } from "../utils/errors"
import { pathExists, readJsonSafe } from "../utils/fs"
import { writeJsonSuccess } from "../utils/json"
import { codeCommandName, npmCommandName, runCommand } from "../utils/process"
import { resolveScript } from "./helpers"
import type { CommandDefinition } from "./types"

const testCommand: CommandDefinition = {
  name: "test",
  async run(args) {
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        watch: { type: "boolean", default: false },
      },
    })
    const watch = Boolean(parsed.values.watch)
    await runCommand(npmCommandName(), watch ? ["run", "test", "--", "--watch"] : ["run", "test"])
  },
}

const aiCommand: CommandDefinition = {
  name: "ai",
  async run(args, context) {
    const prompt = args.join(" ").trim()
    if (!prompt) throw new CliUsageError('Usage: tw ai "describe component"')
    const script = await resolveScript(context, "scripts/v45/ai.mjs")
    await runCommand(process.execPath, [script, prompt])
  },
}

const shareCommand: CommandDefinition = {
  name: "share",
  async run(args, context) {
    const name = args.find((arg) => !arg.startsWith("-")) ?? "component-name"
    const manifestPath = path.join(process.cwd(), ".tw-cache", "deploy-manifest.json")

    const defaultManifest: Required<Pick<ShareManifest, "name" | "version">> = {
      name,
      version: "0.1.0",
    }
    const parsedManifest = await readJsonSafe<ShareManifest>(manifestPath)
    const manifest: ShareManifest = parsedManifest
      ? { ...defaultManifest, ...parsedManifest }
      : defaultManifest

    const resolvedName = manifest.name ?? name
    const sharePayload = {
      name: resolvedName,
      version: manifest.version ?? "0.1.0",
      description: manifest.description ?? "",
      keywords: Array.isArray(manifest.keywords) ? manifest.keywords : [],
      registry: manifest.registry ?? "https://registry.tailwind-styled.dev",
      installCommand: `npm install ${resolvedName}`,
      importExample: `import { ${resolvedName.replace(/[^a-zA-Z]/g, "")} } from "${resolvedName}"`,
      channel: "community",
      sharedAt: new Date().toISOString(),
      instructions: [
        "1. Attach README.md with usage examples",
        `2. Add version tag: git tag v${manifest.version ?? "0.1.0"}`,
        "3. Run `tw deploy` to publish to registry",
        "4. Share this payload in community channels",
      ],
    }

    if (context.json) {
      writeJsonSuccess("share", sharePayload)
      return
    }

    context.output.writeText(JSON.stringify(sharePayload, null, 2))
  },
}

const codeCommand: CommandDefinition = {
  name: "code",
  async run(args, context) {
    const docsUrl = "https://marketplace.visualstudio.com/search?term=tailwind-styled&target=VSCode"
    const extension = "tailwind-styled.tailwind-styled-v4"
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        docs: { type: "boolean", default: false },
        install: { type: "boolean", default: false },
      },
    })
    const docs = Boolean(parsed.values.docs)
    const install = Boolean(parsed.values.install)

    if (docs) {
      if (context.json) {
        writeJsonSuccess("code", { action: "docs", url: docsUrl })
        return
      }
      context.output.writeText(docsUrl)
      return
    }
    if (install) {
      await runCommand(codeCommandName(), ["--install-extension", extension], {
        stdio: context.json ? "pipe" : "inherit",
      })
      if (context.json) {
        writeJsonSuccess("code", { action: "install", extension })
      }
      return
    }
    if (context.json) {
      writeJsonSuccess("code", { action: "help", usage: "tw code --docs | tw code --install" })
      return
    }
    context.output.writeText("Use: tw code --docs | tw code --install")
  },
}

interface VersionPayload {
  packageName: string
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean | null
  checkFailed: string | null
}

interface ShareManifest {
  name?: string
  version?: string
  description?: string
  keywords?: string[]
  registry?: string
}

const CLI_PACKAGE_NAME = "create-tailwind-styled"

const parseSemver = (version: string): [number, number, number] | null => {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/)
  return match ? [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)] : null
}

const isVersionOutdated = (currentVersion: string, latestVersion: string): boolean | null => {
  const current = parseSemver(currentVersion)
  const latest = parseSemver(latestVersion)
  if (!current || !latest) return null

  const firstDiffIndex = current.findIndex((val, idx) => val !== latest[idx])
  return firstDiffIndex === -1 ? false : current[firstDiffIndex] < latest[firstDiffIndex]
}

const resolveCurrentCliVersion = async (
  context: Parameters<CommandDefinition["run"]>[1]
): Promise<string> => {
  const candidates = [
    path.resolve(context.runtimeDir, "..", "package.json"),
    path.resolve(process.cwd(), "packages", "cli", "package.json"),
    path.resolve(process.cwd(), "package.json"),
  ]

  for (const candidate of candidates) {
    if (!(await pathExists(candidate))) continue
    const pkg = await readJsonSafe<{ name?: string; version?: string }>(candidate)
    const isCliPackage =
      pkg?.version &&
      (pkg.name === CLI_PACKAGE_NAME ||
        candidate.includes(`${path.sep}packages${path.sep}cli${path.sep}`))
    if (isCliPackage) return pkg.version ?? "0.0.0"
  }

  return "0.0.0"
}

const fetchLatestCliVersion = async (): Promise<string> => {
  const response = await fetch(`https://registry.npmjs.org/${CLI_PACKAGE_NAME}/latest`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const payload = (await response.json()) as { version?: unknown }
  if (!payload.version || typeof payload.version !== "string") {
    throw new Error("Invalid npm registry response")
  }
  return payload.version
}

const buildVersionPayload = async (
  context: Parameters<CommandDefinition["run"]>[1],
  checkLatest: boolean
): Promise<VersionPayload> => {
  const currentVersion = await resolveCurrentCliVersion(context)

  if (!checkLatest) {
    return {
      packageName: CLI_PACKAGE_NAME,
      currentVersion,
      latestVersion: null,
      updateAvailable: null,
      checkFailed: null,
    }
  }

  try {
    const latestVersion = await fetchLatestCliVersion()
    return {
      packageName: CLI_PACKAGE_NAME,
      currentVersion,
      latestVersion,
      updateAvailable: isVersionOutdated(currentVersion, latestVersion),
      checkFailed: null,
    }
  } catch (error) {
    return {
      packageName: CLI_PACKAGE_NAME,
      currentVersion,
      latestVersion: null,
      updateAvailable: null,
      checkFailed: error instanceof Error ? error.message : String(error),
    }
  }
}

const versionCommand: CommandDefinition = {
  name: "version",
  aliases: ["v"],
  async run(args, context) {
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        check: { type: "boolean", default: false },
      },
    })
    const checkLatest = Boolean(parsed.values.check)
    const payload = await buildVersionPayload(context, checkLatest)

    if (context.json) {
      writeJsonSuccess("version", payload)
      return
    }

    context.output.writeText(`tw version: ${payload.currentVersion}`)
    if (!checkLatest) return

    if (payload.checkFailed) {
      context.output.writeText(`Latest check failed: ${payload.checkFailed}`)
      return
    }

    if (payload.latestVersion && payload.updateAvailable) {
      context.output.writeText(`Update available: ${payload.latestVersion}`)
      context.output.writeText("Run: tw upgrade")
      return
    }

    if (payload.latestVersion) {
      context.output.writeText(`Up to date (latest: ${payload.latestVersion})`)
    }
  },
}

const upgradeCommand: CommandDefinition = {
  name: "upgrade",
  aliases: ["update"],
  async run(args, context) {
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        install: { type: "boolean", default: false },
      },
    })
    const install = Boolean(parsed.values.install)
    const payload = await buildVersionPayload(context, true)

    if (payload.checkFailed) {
      if (context.json) {
        writeJsonSuccess("upgrade", { ...payload, installAttempted: false, installExecuted: false })
        return
      }
      context.output.writeText(`Latest check failed: ${payload.checkFailed}`)
      return
    }

    const shouldUpdate = payload.updateAvailable === true
    if (!shouldUpdate) {
      if (context.json) {
        writeJsonSuccess("upgrade", {
          ...payload,
          installAttempted: install,
          installExecuted: false,
        })
      } else {
        context.output.writeText(`Already up to date (${payload.currentVersion})`)
      }
      return
    }

    if (!install) {
      if (context.json) {
        writeJsonSuccess("upgrade", {
          ...payload,
          installAttempted: false,
          installExecuted: false,
          installHint: `npm install -g ${CLI_PACKAGE_NAME}@latest`,
        })
      } else {
        context.output.writeText(
          `Update available: ${payload.currentVersion} -> ${payload.latestVersion}`
        )
        context.output.writeText("Run: tw upgrade --install")
      }
      return
    }

    await runCommand(npmCommandName(), ["install", "-g", `${CLI_PACKAGE_NAME}@latest`], {
      stdio: context.json ? "pipe" : "inherit",
    })

    if (context.json) {
      writeJsonSuccess("upgrade", { ...payload, installAttempted: true, installExecuted: true })
      return
    }

    context.output.writeText(`Upgrade command executed for ${CLI_PACKAGE_NAME}@latest`)
  },
}

export const miscCommands: CommandDefinition[] = [
  testCommand,
  aiCommand,
  shareCommand,
  codeCommand,
  versionCommand,
  upgradeCommand,
]
