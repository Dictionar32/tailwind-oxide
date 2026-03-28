import { runPreflightCli } from "../preflight"
import { ensureFlag } from "../utils/args"
import type { CommandDefinition } from "./types"

export const preflightCommand: CommandDefinition = {
  name: "preflight",
  async run(args, context) {
    const commandArgs = context.json ? ensureFlag("json", args) : args
    await runPreflightCli(commandArgs)
  },
}
