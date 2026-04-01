import { parseArgs as parseNodeArgs } from "node:util"

import { CliUsageError } from "../utils/errors"
import { pathExists } from "../utils/fs"
import { npmCommandName, runCommand } from "../utils/process"
import { resolveScript } from "./helpers"
import type { CommandDefinition } from "./types"

export const dashboardCommand: CommandDefinition = {
  name: "dashboard",
  async run(args, context) {
    if (context.json) {
      throw new CliUsageError(
        "[tw dashboard] --json is not supported for long-running dashboard output"
      )
    }

    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        port: { type: "string" },
      },
    })
    const port =
      typeof parsed.values.port === "string" ? parsed.values.port : (process.env.PORT ?? "3000")
    const serverScript = await resolveScript(context, "packages/dashboard/src/server.mjs")

    if (await pathExists(serverScript)) {
      context.output.writeText(`[tw dashboard] Starting on http://localhost:${port}`)
      await runCommand(process.execPath, [serverScript], {
        env: { ...process.env, PORT: port },
      })
      return
    }

    await runCommand(npmCommandName(), ["run", "dev", "-w", "@tailwind-styled/dashboard"], {
      env: { ...process.env, PORT: port },
    })
  },
}
