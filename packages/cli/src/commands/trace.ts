import type { CommandDefinition } from "./types"
import type { CommandContext } from "./types"
import type { CliOutput } from "../utils/output"
import { traceClass } from "../utils/traceService"
import pc from "picocolors"

// Note: Engine is bundled via tsup noExternal, no need to require at runtime

export async function runTraceCli(args: string[], context: CommandContext): Promise<void> {
  const className = args[0]

  if (!className) {
    context.output.error("Usage: tw trace <class-name>")
    context.output.info("Example: tw trace btn-primary")
    return
  }

  try {
    // Engine is already bundled, no need for dynamic require
    const traceResult = await performTrace(className, context)

    if (context.json) {
      context.output.jsonSuccess("trace", traceResult)
    } else {
      printTraceOutput(traceResult, context.output)
    }
  } catch (error) {
    context.output.error(`Failed to trace class: ${error}`)
  }
}

async function performTrace(className: string, context: CommandContext) {
  return await traceClass(className, { root: context.cwd })
}

interface TraceResult {
  class: string
  definedAt: { file: string; line: number; column: number }
  variants: Array<{ name: string; value: string; source: { file: string; line: number } }>
  rules: Array<{
    property: string
    value: string
    applied: boolean
    reason: string | null
    source: { file: string; line: number }
    specificity: number
  }>
  conflicts: Array<{
    property: string
    winner: string
    loser: string
    stage: string
    causes: string[]
  }>
  finalStyle: Array<{ property: string; value: string }>
}

function printTraceOutput(result: TraceResult, output: CliOutput) {
  const { class: className, definedAt, variants, rules, conflicts, finalStyle } = result

  // Pretty print header
  output.writeText("")
  output.writeText(`${pc.red("❌")} ${pc.bold(`.${className}`)}`)

  // Defined at - pretty format
  if (definedAt.file && definedAt.file !== ":0") {
    output.writeText(`${pc.gray("├─")} ${pc.cyan("defined in:")} ${pc.white(`${definedAt.file}:${definedAt.line}`)}`)
  } else {
    output.writeText(`${pc.gray("├─")} ${pc.yellow("defined in:")} ${pc.dim("(from Tailwind default)")}`)
  }

  // Variants - pretty format
  if (variants.length > 0) {
    output.writeText(`${pc.gray("├─")} ${pc.cyan("variants:")}`)
    for (const variant of variants) {
      output.writeText(`${pc.gray("│    ")}${pc.blue(variant.name)}: ${pc.green(variant.value)} ${pc.gray(`(${variant.source.file})`)}`)
    }
  }

  // Rules - pretty format
  if (rules.length > 0) {
    output.writeText(`${pc.gray("├─")} ${pc.cyan("rules:")}`)
    for (const rule of rules) {
      const status = rule.applied ? pc.green("✓") : pc.red("✗")
      const reason = rule.reason ? pc.gray(`(${rule.reason})`) : ""
      if (rule.applied) {
        output.writeText(`${pc.gray("│    ")}${pc.magenta(rule.property)}: ${pc.green(rule.value)} ${status} ${pc.gray("(applied)")}`)
      } else {
        output.writeText(`${pc.gray("│    ")}${pc.magenta(rule.property)}: ${pc.red(rule.value)} ${status} ${reason}`)
      }
    }
  }

  // Conflicts - pretty format
  if (conflicts.length > 0) {
    output.writeText(`${pc.gray("├─")} ${pc.yellow("conflicts:")}`)
    for (const conflict of conflicts) {
      output.writeText(`${pc.gray("│    ")}${pc.magenta(conflict.property)}: ${pc.green(conflict.winner)} ${pc.gray("overrides")} ${pc.red(conflict.loser)} ${pc.gray(`(${conflict.stage})`)}`)
      if (conflict.causes && conflict.causes.length) {
        for (const cause of conflict.causes.slice(0, 2)) {
          output.writeText(`${pc.gray("│      └─")} ${pc.dim(cause)}`)
        }
      }
    }
  }

  // Final style - pretty format
  if (finalStyle.length > 0) {
    output.writeText(`${pc.gray("└─")} ${pc.cyan("final:")}`)
    for (const style of finalStyle) {
      output.writeText(`${pc.gray("     ")}${pc.magenta(style.property)}: ${pc.green(style.value)}`)
    }
  }

  output.writeText("")
  output.info("Run 'tw doctor' for diagnostics")
}

const traceCommand: CommandDefinition = {
  name: "trace",
  aliases: ["t"],
  async run(args, context) {
    await runTraceCli(args, context)
  },
}

export { traceCommand }
