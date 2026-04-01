import { parseArgs as parseNodeArgs } from "node:util"
import { CliUsageError } from "../utils/errors"
import type { CliOutput } from "../utils/output"
import { type WhyResult, whyClass } from "../utils/whyService"
import type { CommandContext, CommandDefinition } from "./types"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function printWhyOutput(result: WhyResult, output: CliOutput): void {
  const { className, bundleContribution, usedIn, variantChain, impact, suggestions, dependents } =
    result

  output.writeText("")
  output.writeText(`Class: ${className}`)
  output.writeText(`Bundle contribution: ${formatSize(bundleContribution)}`)
  output.writeText(`Used in: ${usedIn.length} location(s)`)

  if (usedIn.length > 0) {
    output.writeText("")
    output.subHeader("Usage")
    for (const usage of usedIn) {
      output.listItem(`${usage.file}:${usage.line}:${usage.column} (${usage.usage})`)
    }
  }

  output.writeText("")
  output.subHeader("Impact")
  output.listItem(`variant chain: ${variantChain.join(", ") || "none"}`)
  output.listItem(`risk: ${impact.risk}`)
  output.listItem(`components affected: ${impact.componentsAffected}`)
  output.listItem(`estimated savings: ${formatSize(impact.estimatedSavings)}`)

  output.writeText("")
  output.subHeader("Suggestions")
  if (suggestions.length === 0) {
    output.listItem("none")
  } else {
    for (const suggestion of suggestions) {
      output.listItem(suggestion)
    }
  }

  output.writeText("")
  output.subHeader("Dependents")
  if (dependents.length === 0) {
    output.listItem("none")
  } else {
    for (const dependent of dependents) {
      output.listItem(dependent)
    }
  }

  output.writeText("")
}

export async function runWhyCli(args: string[], context: CommandContext): Promise<void> {
  const parsed = parseNodeArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      cwd: { type: "string" },
      json: { type: "boolean" },
    },
  })

  const className = parsed.positionals[0]
  if (!className) {
    throw new CliUsageError("Usage: tw why <class-name>")
  }

  const root = typeof parsed.values.cwd === "string" ? parsed.values.cwd : context.cwd
  const json = context.json || parsed.values.json === true
  const result = await whyClass(className, { root })

  if (json) {
    context.output.jsonSuccess("why", result)
    return
  }

  printWhyOutput(result, context.output)
}

export const whyCommand: CommandDefinition = {
  name: "why",
  aliases: ["w"],
  async run(args, context) {
    await runWhyCli(args, context)
  },
}
