#!/usr/bin/env node
import { getRegistry, PluginRegistry, PluginRegistryError } from "./index"

function printHelp(): void {
  console.log(`tw-plugin commands:
  search <query> [--json]
  list [--json]
  info <package> [--json]
  install <package> [--dry-run] [--allow-external] [--yes]
  uninstall <package> [--dry-run]

Options:
  --json       Output as JSON (machine-readable)
  --debug      Show timing and execution details
  --registry   Use external registry URL`)
}

function isTruthyFlag(args: string[], flag: string): boolean {
  return args.includes(flag)
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  if (index === -1 || index + 1 >= args.length) return undefined
  const value = args[index + 1]
  if (value?.startsWith("-")) return undefined
  return value
}

function firstNonFlag(args: string[]): string | undefined {
  return args.find((item) => !item.startsWith("-"))
}

function maybeRed(text: string): string {
  if (!process.stderr.isTTY) return text
  return `\x1b[31m${text}\x1b[0m`
}

function printError(error: unknown): never {
  if (error instanceof PluginRegistryError) {
    const normalized = error.toObject()
    console.error(maybeRed(`[${normalized.code}] ${normalized.message}`))
    if (normalized.context) {
      console.error(maybeRed(`context: ${JSON.stringify(normalized.context)}`))
    }
    process.exit(1)
  }
  const message = error instanceof Error ? error.message : String(error)
  console.error(maybeRed(`[UNEXPECTED_ERROR] ${message}`))
  process.exit(1)
}

function debugLog(debug: boolean, label: string, startMs?: number): void {
  if (!debug) return
  const elapsed = startMs !== undefined ? ` (${Date.now() - startMs}ms)` : ""
  process.stderr.write(`[debug] ${label}${elapsed}\n`)
}

async function run(): Promise<void> {
  const [, , command, ...argv] = process.argv

  if (!command || command === "--help" || command === "-h") {
    printHelp()
    return
  }

  const debug = isTruthyFlag(argv, "--debug")
  const json = isTruthyFlag(argv, "--json")
  const registryUrl = getFlagValue(argv, "--registry")
  const t0 = Date.now()

  const registryInstance = await (async (): Promise<PluginRegistry> => {
    if (registryUrl) {
      debugLog(debug, `loading registry from: ${registryUrl}`)
      try {
        const r = await PluginRegistry.loadFromUrl(registryUrl)
        debugLog(debug, `registry loaded`, t0)
        return r
      } catch (error) {
        printError(error)
        process.exit(1)
      }
    }
    return getRegistry()
  })()

  if (command === "search") {
    const query = argv.filter((a) => !a.startsWith("-")).join(" ")
    debugLog(debug, `search: "${query}"`)
    const results = registryInstance.search(query)
    debugLog(debug, `search done, ${results.length} results`, t0)

    if (json) {
      console.log(JSON.stringify(results, null, 2))
      return
    }
    if (results.length === 0) {
      console.log("No plugins found")
      return
    }
    for (const plugin of results) {
      const scope = plugin.official ? "official" : "community"
      console.log(`${plugin.name}@${plugin.version} [${scope}]`)
      console.log(`  ${plugin.description}`)
      console.log(`  tags: ${plugin.tags.join(", ")}`)
    }
    return
  }

  if (command === "list") {
    debugLog(debug, "list all plugins")
    const results = registryInstance.getAll()
    debugLog(debug, `list done, ${results.length} plugins`, t0)

    if (json) {
      console.log(JSON.stringify(results, null, 2))
      return
    }
    for (const plugin of results) {
      console.log(`${plugin.name}@${plugin.version}`)
    }
    return
  }

  if (command === "info") {
    const pluginName = firstNonFlag(argv)
    if (!pluginName) {
      console.error(maybeRed("Missing plugin name"))
      process.exit(1)
    }
    debugLog(debug, `info: "${pluginName}"`)
    const plugin = registryInstance.getByName(pluginName)
    if (!plugin) {
      console.error(maybeRed(`Plugin '${pluginName}' not found. Try: tw-plugin search <keyword>`))
      process.exit(1)
    }
    if (json) {
      console.log(JSON.stringify(plugin, null, 2))
      return
    }
    const scope = plugin.official ? "official" : "community"
    console.log(`${plugin.name}@${plugin.version} [${scope}]`)
    console.log(`  ${plugin.description}`)
    console.log(`  tags: ${plugin.tags.join(", ")}`)
    if (plugin.docs) console.log(`  docs: ${plugin.docs}`)
    if (plugin.install) console.log(`  install: ${plugin.install}`)
    return
  }

  if (command === "install") {
    const pluginName = firstNonFlag(argv)
    const dryRun = isTruthyFlag(argv, "--dry-run")
    const allowExternal = isTruthyFlag(argv, "--allow-external")
    const confirmExternal = isTruthyFlag(argv, "--yes")

    if (!pluginName) {
      console.error(maybeRed("Missing plugin name"))
      process.exit(1)
    }

    debugLog(debug, `install: "${pluginName}" dry=${dryRun} external=${allowExternal}`)

    try {
      const result = registryInstance.install(pluginName, {
        dryRun,
        allowExternal,
        confirmExternal,
      })
      debugLog(debug, `install done`, t0)
      if (json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }
      console.log(`Installed: ${result.plugin}`)
    } catch (error) {
      printError(error)
    }
    return
  }

  if (command === "uninstall") {
    const pluginName = firstNonFlag(argv)
    const dryRun = isTruthyFlag(argv, "--dry-run")

    if (!pluginName) {
      console.error(maybeRed("Missing plugin name"))
      process.exit(1)
    }

    debugLog(debug, `uninstall: "${pluginName}" dry=${dryRun}`)

    try {
      const result = registryInstance.uninstall(pluginName, { dryRun })
      debugLog(debug, `uninstall done`, t0)
      if (json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }
      console.log(`Uninstalled: ${result.plugin}`)
    } catch (error) {
      printError(error)
    }
    return
  }

  if (command === "update-check") {
    const results = registryInstance.checkAllUpdates()
    if (json) {
      console.log(JSON.stringify(results, null, 2))
      return
    }
    const updates = results.filter((r) => r.hasUpdate)
    if (updates.length === 0) {
      console.log("All plugins up to date")
    } else {
      console.log(`${updates.length} update(s) available:\n`)
      updates.forEach((r) => console.log(`  ${r.name}  ${r.current} -> ${r.latest}`))
      console.log(`\nRun: npm update ${updates.map((r) => r.name).join(" ")}`)
    }
    return
  }

  if (command === "verify") {
    const pkgName = argv[0]
    if (!pkgName) {
      console.error(maybeRed("Missing plugin name"))
      process.exit(1)
    }
    const result = registryInstance.verifyIntegrity(pkgName)
    if (json) {
      console.log(JSON.stringify({ plugin: pkgName, ...result }, null, 2))
      return
    }
    console.log(result.ok ? `[OK] ${pkgName}: integrity OK` : `[FAIL] ${pkgName}: ${result.reason}`)
    if (!result.ok && result.reason !== "no checksum registered (skip)") process.exitCode = 1
    return
  }

  console.error(maybeRed(`Unknown command: ${command}`))
  printHelp()
  process.exit(1)
}

run().catch((error) => {
  printError(error)
})
