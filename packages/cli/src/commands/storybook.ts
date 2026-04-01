import path from "node:path"
import { parseArgs as parseNodeArgs } from "node:util"
import { CliUsageError } from "../utils/errors"
import { pathExists } from "../utils/fs"
import { writeJsonSuccess } from "../utils/json"
import { npxCommandName, runCommand } from "../utils/process"
import { enumerateVariantProps } from "./helpers"
import type { CommandDefinition } from "./types"

export const storybookCommand: CommandDefinition = {
  name: "storybook",
  async run(args, context) {
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        variants: { type: "string" },
        port: { type: "string" },
        "no-open": { type: "boolean", default: false },
      },
    })

    const variantsRaw = typeof parsed.values.variants === "string" ? parsed.values.variants : null
    const port = typeof parsed.values.port === "string" ? parsed.values.port : "6006"
    const open = !parsed.values["no-open"]

    if (variantsRaw) {
      try {
        const matrix = JSON.parse(variantsRaw) as Record<string, Array<string | number | boolean>>
        const rows = enumerateVariantProps(matrix)
        if (context.json) {
          writeJsonSuccess("storybook.variants", { count: rows.length, rows })
        } else {
          context.output.writeText(JSON.stringify(rows, null, 2))
        }
      } catch (error) {
        throw new CliUsageError("Invalid JSON in --variants flag", { cause: error })
      }
      return
    }

    if (context.json) {
      throw new CliUsageError("[tw storybook] --json is only supported with --variants")
    }

    context.output.writeText(`[tw storybook] Starting Storybook on port ${port}...`)
    context.output.writeText(
      `[tw storybook] Tip: use --variants='{"size":["sm","lg"]}' to enumerate variant combinations`
    )

    const localBin = path.join(
      process.cwd(),
      "node_modules",
      ".bin",
      process.platform === "win32" ? "storybook.cmd" : "storybook"
    )
    const storybookArgs = ["dev", "-p", port]
    if (!open) storybookArgs.push("--no-open")

    if (await pathExists(localBin)) {
      await runCommand(localBin, storybookArgs)
      return
    }

    await runCommand(npxCommandName(), ["storybook", ...storybookArgs])
  },
}
