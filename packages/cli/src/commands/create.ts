import { ensureFlag } from "../utils/args"
import type { CommandDefinition } from "./types"

export const createCommand: CommandDefinition = {
  name: "create",
  async run(args, context) {
    const createMod = await import("../createApp")
    const commandArgs = context.json ? ensureFlag("json", args) : args
    await createMod.main(commandArgs)
  },
}
