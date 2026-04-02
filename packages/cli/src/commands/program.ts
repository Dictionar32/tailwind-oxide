import { Command } from "commander"

import { runAnalyzeCli } from "../analyze"
import { runExtractCli } from "../extract"
import { runInitCli } from "../init"
import { runMigrateCli } from "../migrate"
import { runScanCli } from "../scan"
import { runSetupCli } from "../setup"
import { runStatsCli } from "../stats"
import { resolveCommandHelp } from "../utils/runtime"
import { boundaryCommand } from "./boundary"
import { createCommand } from "./create"
import { dashboardCommand } from "./dashboard"
import { deployCommand } from "./deploy"
import { runDoctorCli } from "./doctor"
import { miscCommands } from "./misc"
import { pluginCommand } from "./plugin"
import { preflightCommand } from "./preflight"
import { installRegistryCommand, registryCommand } from "./registry"
import { scriptCommands } from "./scriptCommands"
import { storybookCommand } from "./storybook"
import { studioCommand } from "./studio"
import { syncCommand } from "./sync"
import { runTraceCli } from "./trace"
import type { CommandContext, CommandDefinition } from "./types"
import { runWhyCli } from "./why"

function contextArgs(args: string[], context: CommandContext): string[] {
  return context.json ? [...args, "--json"] : args
}

function leaf(commands: CommandDefinition[], name: string): CommandDefinition {
  const found = commands.find((command) => command.name === name)
  if (!found) {
    throw new Error(`Command definition not found: ${name}`)
  }
  return found
}

function actionCommand(args: unknown[]): Command {
  return args[args.length - 1] as Command
}

function toVariadic(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export function buildMainProgram(context: CommandContext): Command {
  const _miscByName = new Map(miscCommands.map((command) => [command.name, command]))
  const scriptByName = new Map(scriptCommands.map((command) => [command.name, command]))

  const program = new Command("tw")
  program
    .name("tw")
    .description("tailwind-styled-v4 CLI")
    .option("--json", "Output strict JSON envelope")
    .option("--debug", "Include stack traces for errors")
    .option("--verbose", "Verbose runtime logs")

  program
    .command("setup")
    .description("Auto-setup project")
    .option("--yes", "Skip prompts")
    .option("--next", "Force Next.js")
    .option("--vite", "Force Vite")
    .option("--rspack", "Force Rspack")
    .option("--react", "Force React")
    .option("--dry-run", "Preview changes")
    .option("--skip-install", "Skip package install")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.yes) args.push("--yes")
      if (options.next) args.push("--next")
      if (options.vite) args.push("--vite")
      if (options.rspack) args.push("--rspack")
      if (options.react) args.push("--react")
      if (options.dryRun) args.push("--dry-run")
      if (options.skipInstall) args.push("--skip-install")
      await runSetupCli(contextArgs(args, context))
    })

  program
    .command("create [name]")
    .description("Create project from template")
    .option("-y, --yes", "Skip prompts")
    .option("--template <template>", "Template name")
    .option("--dry-run", "Preview generated files")
    .action(async (name: string | undefined, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (name) args.push(name)
      if (options.template) args.push(`--template=${options.template}`)
      if (options.yes) args.push("--yes")
      if (options.dryRun) args.push("--dry-run")
      await createCommand.run(contextArgs(args, context), context)
    })

  program
    .command("init [target]")
    .description("Initialize tailwind-styled config files")
    .action(async (target?: string) => {
      await runInitCli(contextArgs(target ? [target] : [], context))
    })

  program
    .command("scan [target]")
    .description("Scan classes in workspace")
    .action(async (target?: string) => {
      await runScanCli(contextArgs(target ? [target] : [], context))
    })

  program
    .command("migrate [target]")
    .description("Migrate project patterns to v4")
    .option("--dry-run", "Preview changes")
    .option("--wizard", "Use interactive wizard")
    .action(async (target: string | undefined, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (target) args.push(target)
      if (options.dryRun) args.push("--dry-run")
      if (options.wizard) args.push("--wizard")
      await runMigrateCli(contextArgs(args, context))
    })

  program
    .command("analyze [target]")
    .description("Analyze class usage and patterns")
    .action(async (target?: string) => {
      await runAnalyzeCli(contextArgs(target ? [target] : [], context))
    })

  program
    .command("stats [target]")
    .description("Compute estimated CSS bundle stats")
    .action(async (target?: string) => {
      await runStatsCli(contextArgs(target ? [target] : [], context))
    })

  program
    .command("extract [target]")
    .description("Suggest extraction candidates")
    .option("--min <count>", "Minimum repeat count")
    .action(async (target: string | undefined, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (target) args.push(target)
      if (options.min) args.push(`--min=${options.min}`)
      await runExtractCli(contextArgs(args, context))
    })

  program
    .command("preflight")
    .description("Environment preflight checks")
    .option("--fix", "Apply simple fixes")
    .option("--allow-fail", "Do not set non-zero exit code on failing checks")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.fix) args.push("--fix")
      if (options.allowFail) args.push("--allow-fail")
      await preflightCommand.run(contextArgs(args, context), context)
    })

  program
    .command("dashboard")
    .description("Start dashboard server")
    .option("--port <port>", "Dashboard port")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.port) args.push(`--port=${options.port}`)
      await dashboardCommand.run(args, context)
    })

  program
    .command("storybook")
    .description("Storybook helpers and variant matrix")
    .option("--variants <json>", "Variant matrix JSON")
    .option("--port <port>", "Storybook port")
    .option("--no-open", "Disable browser open")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.variants) args.push(`--variants=${options.variants}`)
      if (options.port) args.push(`--port=${options.port}`)
      if (options.open === false) args.push("--no-open")
      await storybookCommand.run(contextArgs(args, context), context)
    })

  program
    .command("studio")
    .description("Open studio mode")
    .option("--project <project>", "Project path")
    .option("--port <port>", "Studio port")
    .option("--mode <mode>", "Studio mode")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.project) args.push(`--project=${options.project}`)
      if (options.port) args.push(`--port=${options.port}`)
      if (options.mode) args.push(`--mode=${options.mode}`)
      await studioCommand.run(args, context)
    })

  program
    .command("deploy [name]")
    .description("Publish package metadata to registry")
    .option("--version <version>", "Package version")
    .option("--tag <tag>", "Publish tag")
    .option("--registry <url>", "Target registry URL")
    .option("--dry-run", "Preview manifest")
    .action(async (name: string | undefined, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (name) args.push(name)
      if (options.version) args.push(`--version=${options.version}`)
      if (options.tag) args.push(`--tag=${options.tag}`)
      if (options.registry) args.push(`--registry=${options.registry}`)
      if (options.dryRun) args.push("--dry-run")
      await deployCommand.run(contextArgs(args, context), context)
    })

  const plugin = program.command("plugin").description("Plugin discovery and install")
  plugin
    .command("search [query...]")
    .description("Search plugins")
    .action(async (query: string[] | undefined) => {
      await pluginCommand.run(["search", ...toVariadic(query)], context)
    })
  plugin
    .command("list")
    .description("List available plugins")
    .action(async () => {
      await pluginCommand.run(["list"], context)
    })
  plugin
    .command("install <name>")
    .description("Install plugin package")
    .action(async (name: string) => {
      await pluginCommand.run(["install", name], context)
    })
  plugin
    .command("verify <packageName>")
    .description("Verify plugin package")
    .action(async (packageName: string) => {
      await pluginCommand.run(contextArgs(["verify", packageName], context), context)
    })
  plugin
    .command("update-check")
    .description("Check plugin updates")
    .action(async () => {
      await pluginCommand.run(contextArgs(["update-check"], context), context)
    })
  plugin
    .command("marketplace [args...]")
    .description("Marketplace helper")
    .allowUnknownOption(true)
    .action(async (args: string[] | undefined) => {
      await pluginCommand.run(contextArgs(["marketplace", ...toVariadic(args)], context), context)
    })
  plugin
    .command("publish [args...]")
    .description("Publish plugin to marketplace")
    .allowUnknownOption(true)
    .action(async (args: string[] | undefined) => {
      await pluginCommand.run(contextArgs(["publish", ...toVariadic(args)], context), context)
    })

  const registry = program.command("registry").description("Registry server utilities")
  ;["serve", "list", "info", "publish", "install", "versions"].forEach((subcommand) => {
    registry
      .command(`${subcommand} [args...]`)
      .description(`Registry ${subcommand}`)
      .allowUnknownOption(true)
      .action(async (args: string[] | undefined) => {
        await registryCommand.run(contextArgs([subcommand, ...toVariadic(args)], context), context)
      })
  })

  program
    .command("install [args...]")
    .description("Registry tarball install helper")
    .allowUnknownOption(true)
    .action(async (args: string[] | undefined) => {
      await installRegistryCommand.run(contextArgs(toVariadic(args), context), context)
    })

  const sync = program.command("sync").description("Design token sync commands")
  ;["init", "pull", "push", "diff"].forEach((subcommand) => {
    sync
      .command(`${subcommand} [args...]`)
      .description(`Sync ${subcommand}`)
      .allowUnknownOption(true)
      .action(async (args: string[] | undefined) => {
        await syncCommand.run(contextArgs([subcommand, ...toVariadic(args)], context), context)
      })
  })

  const figma = sync.command("figma").description("Figma sync helpers")
  ;["pull", "push", "diff", "modes"].forEach((subcommand) => {
    figma
      .command(`${subcommand} [args...]`)
      .description(`Figma ${subcommand}`)
      .allowUnknownOption(true)
      .action(async (args: string[] | undefined) => {
        await syncCommand.run(
          contextArgs(["figma", subcommand, ...toVariadic(args)], context),
          context
        )
      })
  })

  program
    .command("test")
    .description("Test shortcut wrapper")
    .option("--watch", "Watch mode")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.watch) args.push("--watch")
      await leaf(miscCommands, "test").run(args, context)
    })

  program
    .command("ai <prompt...>")
    .description("AI script shortcut")
    .action(async (prompt: string[]) => {
      await leaf(miscCommands, "ai").run(prompt, context)
    })

  program
    .command("share [name]")
    .description("Generate share payload template")
    .action(async (name?: string) => {
      await leaf(miscCommands, "share").run(contextArgs(name ? [name] : [], context), context)
    })

  program
    .command("code")
    .description("VS Code extension helper")
    .option("--docs", "Show docs URL")
    .option("--install", "Install extension")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.docs) args.push("--docs")
      if (options.install) args.push("--install")
      await leaf(miscCommands, "code").run(contextArgs(args, context), context)
    })

  program
    .command("version")
    .alias("v")
    .description("Show CLI version")
    .option("--check", "Check latest npm version")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.check) args.push("--check")
      await leaf(miscCommands, "version").run(contextArgs(args, context), context)
    })

  program
    .command("upgrade")
    .alias("update")
    .description("Check or upgrade CLI version")
    .option("--install", "Install latest version globally")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.install) args.push("--install")
      await leaf(miscCommands, "upgrade").run(contextArgs(args, context), context)
    })

  program
    .command("parse <file>")
    .description("Parse file (prototype)")
    .action(async (file: string) => {
      await scriptByName.get("parse")!.run(contextArgs([file], context), context)
    })

  program
    .command("transform <file> [out]")
    .description("Transform file (prototype)")
    .option("--output <out>", "Output file")
    .action(async (file: string, out: string | undefined, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = [file]
      if (out) args.push(out)
      if (options.output) args.push(`--output=${options.output}`)
      await scriptByName.get("transform")!.run(contextArgs(args, context), context)
    })

  program
    .command("minify <file>")
    .description("Minify file (prototype)")
    .action(async (file: string) => {
      await scriptByName.get("minify")!.run(contextArgs([file], context), context)
    })

  program
    .command("shake <cssFile>")
    .description("Shake CSS rules (prototype)")
    .action(async (cssFile: string) => {
      await scriptByName.get("shake")!.run(contextArgs([cssFile], context), context)
    })

  program
    .command("lint [dir] [workers]")
    .description("Parallel lint helper (prototype)")
    .action(async (dir?: string, workers?: string) => {
      const args = [dir ?? ".", workers ?? "0"]
      await scriptByName.get("lint")!.run(contextArgs(args, context), context)
    })

  program
    .command("format <file>")
    .description("Format helper (prototype)")
    .option("--write", "Write file changes")
    .action(async (file: string, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = [file]
      if (options.write) args.push("--write")
      await scriptByName.get("format")!.run(contextArgs(args, context), context)
    })

  program
    .command("lsp [args...]")
    .description("Language server protocol helper")
    .allowUnknownOption(true)
    .action(async (args: string[] | undefined) => {
      await scriptByName.get("lsp")!.run(contextArgs(toVariadic(args), context), context)
    })

  program
    .command("benchmark [args...]")
    .description("Write benchmark snapshot")
    .allowUnknownOption(true)
    .action(async (args: string[] | undefined) => {
      await scriptByName.get("benchmark")!.run(contextArgs(toVariadic(args), context), context)
    })

  program
    .command("optimize <file> [args...]")
    .description("Compile-time optimize helper")
    .allowUnknownOption(true)
    .action(async (file: string, args: string[] | undefined) => {
      await scriptByName
        .get("optimize")!
        .run(contextArgs([file, ...toVariadic(args)], context), context)
    })

  program
    .command("split [root] [outDir]")
    .description("Route-based CSS split helper")
    .option("--output <outDir>", "Output directory")
    .action(async (root: string | undefined, outDir: string | undefined, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (root) args.push(root)
      if (outDir) args.push(outDir)
      if (options.output) args.push(`--output=${options.output}`)
      await scriptByName.get("split")!.run(contextArgs(args, context), context)
    })

  program
    .command("critical <html> <css>")
    .description("Critical CSS extraction helper")
    .action(async (html: string, css: string) => {
      await scriptByName.get("critical")!.run(contextArgs([html, css], context), context)
    })

  ;["cache", "cluster", "cluster-server", "adopt", "metrics", "audit"].forEach((name) => {
    const signature =
      name === "metrics"
        ? "metrics [port]"
        : name === "adopt"
          ? "adopt [feature] [project]"
          : `${name} [args...]`

    program
      .command(signature)
      .description(`${name} helper`)
      .allowUnknownOption(true)
      .action(async (...actionArgs) => {
        const positionalArgs = actionArgs
          .slice(0, -1)
          .flatMap((value) => (Array.isArray(value) ? value : value ? [String(value)] : []))
        await scriptByName.get(name)!.run(contextArgs(positionalArgs, context), context)
      })
  })

  program
    .command("help [topic...]")
    .description("Show help")
    .action(async (topic: string[] | undefined) => {
      context.output.writeText(resolveCommandHelp(program, toVariadic(topic)).trim())
    })

  program
    .command("trace [class]")
    .description("Trace a class or inspect a file/directory target")
    .aliases(["t"])
    .option("--target <path>", "Trace a file or directory instead of a single class")
    .option("--cwd <path>", "Working directory for trace resolution")
    .option("--format <format>", "Output format: text, json, mermaid")
    .action(async (className: string | undefined, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (className) args.push(className)
      if (options.target) args.push(`--target=${options.target}`)
      if (options.cwd) args.push(`--cwd=${options.cwd}`)
      if (options.format) args.push(`--format=${options.format}`)
      await runTraceCli(contextArgs(args, context), context)
    })

  program
    .command("doctor")
    .description("Run diagnostics on your codebase")
    .aliases(["d", "diagnose"])
    .option("--cwd <path>", "Working directory for diagnostics")
    .option(
      "--include <checks>",
      `Diagnostic categories: ${["workspace", "tailwind", "analysis"].join(", ")}`
    )
    .option("--verbose", "Show detailed diagnostics")
    .action(async (...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (options.cwd) args.push(`--cwd=${options.cwd}`)
      if (options.include) args.push(`--include=${options.include}`)
      if (options.verbose) args.push("--verbose")
      await runDoctorCli(contextArgs(args, context), context)
    })

  program
    .command("why <class>")
    .description("Explain why a class is in the bundle")
    .aliases(["w"])
    .option("--cwd <path>", "Working directory for why analysis")
    .action(async (className: string, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = [className]
      if (options.cwd) args.push(`--cwd=${options.cwd}`)
      await runWhyCli(contextArgs(args, context), context)
    })

  program
    .command("boundary [target]")
    .description("Analyze RSC boundary (server/client components)")
    .aliases(["b"])
    .option("--cwd <path>", "Working directory")
    .action(async (target: string | undefined, ...actionArgs) => {
      const options = actionCommand(actionArgs).opts()
      const args: string[] = []
      if (target) args.push(target)
      if (options.cwd) args.push(`--cwd=${options.cwd}`)
      await boundaryCommand.run(contextArgs(args, context), context)
    })

  return program
}
