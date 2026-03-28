import type { CommandDefinition } from "./types"
import { ensureFlag } from "../utils/args"

export const createCommand: CommandDefinition = {
  name: "create",
  async run(args, context) {
    const createMod = await import("../createApp")
    const commandArgs = context.json ? ensureFlag("json", args) : args
    await createMod.main(commandArgs)
  },
}
