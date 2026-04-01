import { CliUsageError } from "../utils/errors"
import { writeJsonSuccess } from "../utils/json"
import { npmCommandName, runCommand, runCommandAsJson } from "../utils/process"
import { loadRegistry, resolveScript, validatePackageName } from "./helpers"
import type { CommandDefinition } from "./types"

export const pluginCommand: CommandDefinition = {
  name: "plugin",
  async run(args, context) {
    const subcommand = args[0]
    const pluginArgs = args.slice(1)

    if (subcommand === "update-check") {
      const script = await resolveScript(context, "packages/plugin-registry/dist/cli.js")
      if (context.json) {
        await runCommandAsJson("plugin.update-check", process.execPath, [script, "update-check"])
      } else {
        await runCommand(process.execPath, [script, "update-check"])
      }
      return
    }

    if (subcommand === "verify") {
      const pkgName = pluginArgs[0]
      if (!pkgName) throw new CliUsageError("Usage: tw plugin verify <package-name>")
      const script = await resolveScript(context, "packages/plugin-registry/dist/cli.js")
      if (context.json) {
        await runCommandAsJson("plugin.verify", process.execPath, [script, "verify", pkgName])
      } else {
        await runCommand(process.execPath, [script, "verify", pkgName])
      }
      return
    }

    if (subcommand === "marketplace" || subcommand === "publish") {
      const script = await resolveScript(context, "scripts/v45/marketplace.mjs")
      const marketplaceCommand = subcommand === "publish" ? "publish" : (pluginArgs[0] ?? "help")
      const forwarded = subcommand === "marketplace" ? pluginArgs.slice(1) : pluginArgs
      if (context.json) {
        await runCommandAsJson(`plugin.${subcommand}`, process.execPath, [
          script,
          marketplaceCommand,
          ...forwarded,
        ])
      } else {
        await runCommand(process.execPath, [script, marketplaceCommand, ...forwarded])
      }
      return
    }

    const plugins = await loadRegistry(context)

    if (subcommand === "search") {
      const query = pluginArgs.join(" ").toLowerCase().trim()
      const results = plugins.filter((plugin) => {
        if (!query) return true
        return (
          plugin.name.toLowerCase().includes(query) ||
          plugin.description.toLowerCase().includes(query) ||
          plugin.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      })
      if (context.json) {
        writeJsonSuccess("plugin.search", { query, count: results.length, results })
      } else {
        context.output.table(results)
      }
      return
    }

    if (subcommand === "list") {
      if (context.json) {
        writeJsonSuccess("plugin.list", { count: plugins.length, plugins })
      } else {
        context.output.table(plugins)
      }
      return
    }

    if (subcommand === "install") {
      const pluginName = pluginArgs[0]
      if (!pluginName) throw new CliUsageError("Usage: tw plugin install <name>")
      if (!validatePackageName(pluginName)) {
        throw new CliUsageError(`Invalid package name: ${pluginName}`)
      }
      if (context.json) {
        await runCommand(npmCommandName(), ["install", pluginName], { stdio: "pipe" })
        writeJsonSuccess("plugin.install", {
          package: pluginName,
          manager: npmCommandName(),
          installed: true,
        })
      } else {
        await runCommand(npmCommandName(), ["install", pluginName])
      }
      return
    }

    throw new CliUsageError("Unknown plugin command")
  },
}
