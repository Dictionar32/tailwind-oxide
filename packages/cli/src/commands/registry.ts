import { CliUsageError } from "../utils/errors"
import { runCommand, runCommandAsJson } from "../utils/process"
import { resolveScript } from "./helpers"
import type { CommandDefinition } from "./types"

export const registryCommand: CommandDefinition = {
  name: "registry",
  async run(args, context) {
    const sub = args[0] ?? "serve"
    if (context.json && sub === "serve") {
      throw new CliUsageError(
        "[tw registry serve] --json is not supported for long-running server mode"
      )
    }
    const isTarball = ["publish", "install", "versions"].includes(sub)
    const script = await resolveScript(
      context,
      isTarball ? "scripts/v45/registry-tarball.mjs" : "scripts/v45/registry.mjs"
    )
    const commandArgs = [script, sub, ...args.slice(1)]
    if (context.json) {
      await runCommandAsJson(`registry.${sub}`, process.execPath, commandArgs)
    } else {
      await runCommand(process.execPath, commandArgs)
    }
  },
}

export const installRegistryCommand: CommandDefinition = {
  name: "install",
  async run(args, context) {
    const script = await resolveScript(context, "scripts/v45/registry-tarball.mjs")
    const commandArgs = [script, "install", ...args]
    if (context.json) {
      await runCommandAsJson("registry.install", process.execPath, commandArgs)
    } else {
      await runCommand(process.execPath, commandArgs)
    }
  },
}
