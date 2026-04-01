import { parseArgs as parseNodeArgs } from "node:util"

import { CliUsageError } from "../utils/errors"
import { runCommand, runCommandAsJson } from "../utils/process"
import { resolveScript } from "./helpers"
import type { CommandDefinition } from "./types"

interface ScriptRunOptions {
  jsonUnsupported?: boolean
}

async function runScriptCommand(
  commandName: string,
  context: Parameters<CommandDefinition["run"]>[1],
  relativeScriptPath: string,
  args: string[],
  options: ScriptRunOptions = {}
): Promise<void> {
  if (context.json && options.jsonUnsupported) {
    throw new CliUsageError(
      `[tw ${commandName}] --json is not supported for long-running command mode`
    )
  }

  const script = await resolveScript(context, relativeScriptPath)
  const commandArgs = [script, ...args]

  if (context.json) {
    await runCommandAsJson(commandName, process.execPath, commandArgs)
  } else {
    await runCommand(process.execPath, commandArgs)
  }
}

const parseCommand: CommandDefinition = {
  name: "parse",
  async run(args, context) {
    const file = args[0]
    if (!file) throw new CliUsageError("Usage: tw parse <file>")
    await runScriptCommand("parse", context, "scripts/v46/parse.mjs", [file])
  },
}

const transformCommand: CommandDefinition = {
  name: "transform",
  async run(args, context) {
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        output: { type: "string" },
      },
    })
    const file = parsed.positionals[0]
    const out =
      typeof parsed.values.output === "string" ? parsed.values.output : parsed.positionals[1]
    if (!file) throw new CliUsageError("Usage: tw transform <file> [outFile]")
    const commandArgs = [file]
    if (out) commandArgs.push(out)
    await runScriptCommand("transform", context, "scripts/v46/transform.mjs", commandArgs)
  },
}

const minifyCommand: CommandDefinition = {
  name: "minify",
  async run(args, context) {
    const file = args[0]
    if (!file) throw new CliUsageError("Usage: tw minify <file>")
    await runScriptCommand("minify", context, "scripts/v47/minify.mjs", [file])
  },
}

const shakeCommand: CommandDefinition = {
  name: "shake",
  async run(args, context) {
    const file = args[0]
    if (!file) throw new CliUsageError("Usage: tw shake <css-file>")
    await runScriptCommand("shake", context, "scripts/v47/shake-css.mjs", [file])
  },
}

const lintCommand: CommandDefinition = {
  name: "lint",
  async run(args, context) {
    const dir = args[0] ?? "."
    const workers = args[1] ?? "0"
    await runScriptCommand("lint", context, "scripts/v48/lint-parallel.mjs", [dir, workers])
  },
}

const formatCommand: CommandDefinition = {
  name: "format",
  async run(args, context) {
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        write: { type: "boolean", default: false },
      },
    })
    const file = parsed.positionals[0]
    if (!file) throw new CliUsageError("Usage: tw format <file> [--write]")
    const commandArgs = [file]
    if (parsed.values.write) commandArgs.push("--write")
    await runScriptCommand("format", context, "scripts/v48/format.mjs", commandArgs)
  },
}

const lspCommand: CommandDefinition = {
  name: "lsp",
  async run(args, context) {
    await runScriptCommand("lsp", context, "scripts/v48/lsp.mjs", ["--stdio", ...args], {
      jsonUnsupported: true,
    })
  },
}

const benchmarkCommand: CommandDefinition = {
  name: "benchmark",
  async run(args, context) {
    await runScriptCommand("benchmark", context, "scripts/v48/benchmark-toolchains.mjs", args)
  },
}

const optimizeCommand: CommandDefinition = {
  name: "optimize",
  async run(args, context) {
    const file = args[0]
    if (!file) {
      throw new CliUsageError("Usage: tw optimize <file> [--constant-folding] [--partial-eval]")
    }
    await runScriptCommand("optimize", context, "scripts/v49/optimize.mjs", args)
  },
}

const splitCommand: CommandDefinition = {
  name: "split",
  async run(args, context) {
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        output: { type: "string" },
      },
    })
    const root = parsed.positionals[0] ?? "."
    const outDir =
      typeof parsed.values.output === "string"
        ? parsed.values.output
        : (parsed.positionals[1] ?? "artifacts/route-css")
    await runScriptCommand("split", context, "scripts/v49/split-routes.mjs", [root, outDir])
  },
}

const criticalCommand: CommandDefinition = {
  name: "critical",
  async run(args, context) {
    const html = args[0]
    const css = args[1]
    if (!html || !css) throw new CliUsageError("Usage: tw critical <html-file> <css-file>")
    await runScriptCommand("critical", context, "scripts/v49/critical-css.mjs", [html, css])
  },
}

const cacheCommand: CommandDefinition = {
  name: "cache",
  async run(args, context) {
    const commandArgs: string[] = []
    if (args[0]) commandArgs.push(args[0])
    if (args[1]) commandArgs.push(args[1])
    await runScriptCommand("cache", context, "scripts/v50/cache.mjs", commandArgs)
  },
}

const clusterCommand: CommandDefinition = {
  name: "cluster",
  async run(args, context) {
    const commandArgs: string[] = []
    if (args[0]) commandArgs.push(args[0])
    if (args[1]) commandArgs.push(args[1])
    args
      .filter((arg) => arg.startsWith("--remote=") || arg.startsWith("--token="))
      .forEach((arg) => commandArgs.push(arg))
    await runScriptCommand("cluster", context, "scripts/v50/cluster.mjs", commandArgs)
  },
}

const clusterServerCommand: CommandDefinition = {
  name: "cluster-server",
  async run(args, context) {
    await runScriptCommand("cluster-server", context, "scripts/v50/cluster-server.mjs", args, {
      jsonUnsupported: true,
    })
  },
}

const adoptCommand: CommandDefinition = {
  name: "adopt",
  async run(args, context) {
    const feature = args[0]
    const project = args[1]
    const commandArgs: string[] = []
    if (feature) commandArgs.push(feature)
    if (project) commandArgs.push(project)
    await runScriptCommand("adopt", context, "scripts/v50/adopt.mjs", commandArgs)
  },
}

const metricsCommand: CommandDefinition = {
  name: "metrics",
  async run(args, context) {
    const port = args[0] ?? "3030"
    await runScriptCommand("metrics", context, "scripts/v50/metrics.mjs", [port], {
      jsonUnsupported: true,
    })
  },
}

const auditCommand: CommandDefinition = {
  name: "audit",
  async run(args, context) {
    await runScriptCommand("audit", context, "scripts/v45/audit.mjs", args)
  },
}

export const scriptCommands: CommandDefinition[] = [
  parseCommand,
  transformCommand,
  minifyCommand,
  shakeCommand,
  lintCommand,
  formatCommand,
  lspCommand,
  benchmarkCommand,
  optimizeCommand,
  splitCommand,
  criticalCommand,
  cacheCommand,
  clusterCommand,
  clusterServerCommand,
  adoptCommand,
  metricsCommand,
  auditCommand,
]
