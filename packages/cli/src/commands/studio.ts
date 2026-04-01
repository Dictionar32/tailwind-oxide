import { parseArgs as parseNodeArgs } from "node:util"

import { CliUsageError } from "../utils/errors"
import { runCommand } from "../utils/process"
import { resolveScript } from "./helpers"
import type { CommandDefinition } from "./types"

export const studioCommand: CommandDefinition = {
  name: "studio",
  async run(args, context) {
    if (context.json) {
      throw new CliUsageError("[tw studio] --json is not supported for this command")
    }

    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        project: { type: "string" },
        port: { type: "string" },
        mode: { type: "string" },
      },
    })

    const project =
      typeof parsed.values.project === "string" ? parsed.values.project : process.cwd()
    const port = typeof parsed.values.port === "string" ? parsed.values.port : "3030"
    const mode = typeof parsed.values.mode === "string" ? parsed.values.mode : "web"
    const script = await resolveScript(context, "scripts/v45/studio.mjs")
    await runCommand(
      process.execPath,
      [script, `--project=${project}`, `--port=${port}`, `--mode=${mode}`],
      {
        env: { ...process.env, PORT: port },
      }
    )
  },
}
