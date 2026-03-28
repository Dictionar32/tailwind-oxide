import type { CommandDefinition } from "./types"
import type { CommandContext } from "./types"
import type { CliOutput } from "../utils/output"
import { whyClass, type WhyResult } from "../utils/whyService"

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function printWhyOutput(result: WhyResult, output: CliOutput): void {
  const { className, bundleContribution, usedIn, variantChain, impact, suggestions, dependents } =
    result

  output.writeText(`📦 ${className}`)
  output.writeText(`├─ Bundle contribution: ${formatSize(bundleContribution)}`)

  const usedInCount = usedIn.length
  output.writeText(`├─ Used in: ${usedInCount} components`)
  if (usedIn.length > 0) {
    for (let i = 0; i < usedIn.length; i++) {
      const usage = usedIn[i]
      const prefix = i === usedIn.length - 1 ? "│   └─" : "│   ├─"
      output.writeText(`${prefix} ${usage.file}:${usage.line} (${usage.usage})`)
    }
  }

  output.writeText(`├─ Variant chain: ${variantChain.join(", ")}`)

  const riskLabel = impact.risk.charAt(0).toUpperCase() + impact.risk.slice(1)
  output.writeText(`├─ Impact: ${riskLabel} risk (${impact.componentsAffected} components)`)
  output.writeText(`│   ├─ Potential savings: ${formatSize(impact.estimatedSavings)}`)
  if (suggestions.length > 0) {
    output.writeText(`│   └─ Suggestions:`)
    for (let i = 0; i < suggestions.length; i++) {
      const prefix = i === suggestions.length - 1 ? "│       └─" : "│       ├─"
      output.writeText(`${prefix} ${suggestions[i]}`)
    }
  } else {
    output.writeText(`│   └─ Suggestions: none`)
  }

  output.writeText(`└─ Dependents: ${dependents.length > 0 ? dependents.join(", ") : "none"}`)
  if (dependents.length > 0) {
    for (let i = 0; i < dependents.length; i++) {
      const prefix = i === dependents.length - 1 ? "    └─" : "    ├─"
      output.writeText(`${prefix} ${dependents[i]}`)
    }
  }
}

export async function runWhyCli(args: string[], context: CommandContext): Promise<void> {
  const className = args[0]

  if (!className) {
    context.output.error("Usage: tw why <class-name>")
    context.output.info("Example: tw why btn-primary")
    return
  }

  try {
    const result = await whyClass(className, { root: process.cwd() })

    if (context.json) {
      context.output.jsonSuccess("why", result)
    } else {
      printWhyOutput(result, context.output)
    }
  } catch (error) {
    context.output.error(`Failed to analyze class: ${error}`)
  }
}

export const whyCommand: CommandDefinition = {
  name: "why",
  aliases: ["w"],
  async run(args, context) {
    await runWhyCli(args, context)
  },
}
