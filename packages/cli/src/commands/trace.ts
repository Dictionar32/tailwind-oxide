import { parseArgs as parseNodeArgs } from "node:util"

import pc from "picocolors"
import { CliUsageError } from "../utils/errors"
import type { CliOutput } from "../utils/output"
import { type TraceResult, traceClass } from "../utils/traceService"
import { type TraceTargetResult, traceTarget } from "../utils/traceTargetService"
import type { CommandContext, CommandDefinition } from "./types"

type TraceFormat = "text" | "json" | "mermaid"

type TraceCommandResult =
  | {
      mode: "class"
      payload: TraceResult
    }
  | {
      mode: "target"
      payload: TraceTargetResult
    }

function parseTraceFormat(value: string | undefined, context: CommandContext): TraceFormat {
  if (context.json) return "json"
  if (!value) return "text"
  if (value === "text" || value === "json" || value === "mermaid") return value
  throw new CliUsageError(`Unsupported trace format "${value}". Use text, json, or mermaid.`)
}

export async function runTraceCli(args: string[], context: CommandContext): Promise<void> {
  const parsed = parseNodeArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      cwd: { type: "string" },
      format: { type: "string" },
      json: { type: "boolean" },
      target: { type: "string" },
    },
  })

  const root = typeof parsed.values.cwd === "string" ? parsed.values.cwd : context.cwd
  const format = parseTraceFormat(
    typeof parsed.values.format === "string" ? parsed.values.format : undefined,
    context
  )
  const target = typeof parsed.values.target === "string" ? parsed.values.target : undefined
  const className = parsed.positionals[0]

  if (!target && !className) {
    throw new CliUsageError("Usage: tw trace <class-name> or tw trace --target <path>")
  }

  const result: TraceCommandResult = target
    ? {
        mode: "target",
        payload: await traceTarget(target, { root }),
      }
    : {
        mode: "class",
        payload: await traceClass(className, { root }),
      }

  if (format === "json") {
    context.output.jsonSuccess("trace", result.payload)
    return
  }

  if (result.mode === "target" && format === "mermaid") {
    context.output.writeText(renderTargetTraceMermaid(result.payload))
    return
  }

  if (result.mode === "target") {
    printTargetTraceOutput(result.payload, context.output)
    return
  }

  printClassTraceOutput(result.payload, context.output)
}

function printTargetTraceOutput(result: TraceTargetResult, output: CliOutput): void {
  output.writeText("")
  output.writeText(pc.cyan(`Trace target: ${result.target}`))
  output.writeText(
    pc.dim(
      `type: ${result.targetType} | files: ${result.filesScanned} | classes: ${result.classCount}`
    )
  )
  output.writeText(pc.dim(`css bytes: ${result.cssBytes} | resolved: ${result.resolvedClassCount}`))

  if (!result.compilerAvailable && result.compilerError) {
    output.writeText(pc.yellow("Compiler fallback"))
    output.listItem(result.compilerError)
  }

  if (result.imports.length > 0) {
    output.writeText("")
    output.writeText(pc.bold("Imports"))
    for (const item of result.imports.slice(0, 20)) {
      output.listItem(`${item.kind} ${item.source}`)
    }
  }

  if (result.classes.length > 0) {
    output.writeText("")
    output.writeText(pc.bold("Classes"))
    for (const className of result.classes.slice(0, 20)) {
      output.listItem(className)
    }
  }

  if (result.files.length > 0) {
    output.writeText("")
    output.writeText(pc.bold("Files"))
    for (const file of result.files.slice(0, 10)) {
      output.listItem(`${file.file} (${file.classCount} class(es), ${file.importCount} import(s))`)
    }
  }

  if (result.unknownClasses.length > 0) {
    output.writeText("")
    output.writeText(pc.yellow("Unknown classes"))
    for (const className of result.unknownClasses.slice(0, 20)) {
      output.listItem(className)
    }
  }

  output.writeText("")
}

function renderTargetTraceMermaid(result: TraceTargetResult): string {
  const lines = ["flowchart TD", `  target["${result.target}"]`]

  result.imports.slice(0, 12).forEach((entry, index) => {
    const id = `import${index}`
    lines.push(`  ${id}["${entry.kind}: ${entry.source}"]`)
    lines.push(`  target --> ${id}`)
  })

  result.classes.slice(0, 12).forEach((className, index) => {
    const id = `class${index}`
    lines.push(`  ${id}["${className}"]`)
    lines.push(`  target --> ${id}`)
  })

  return lines.join("\n")
}

function printClassTraceOutput(result: TraceResult, output: CliOutput) {
  const { class: className, definedAt, variants, rules, conflicts, finalStyle } = result

  output.writeText("")
  output.writeText(`${pc.bold(`.${className}`)}`)

  if (definedAt.file && definedAt.file !== ":0") {
    output.writeText(`${pc.gray("defined in:")} ${definedAt.file}:${definedAt.line}`)
  } else {
    output.writeText(`${pc.gray("defined in:")} ${pc.dim("(from Tailwind default)")}`)
  }

  if (variants.length > 0) {
    output.writeText("")
    output.writeText(pc.bold("Variants"))
    for (const variant of variants) {
      output.listItem(`${variant.name}: ${variant.value} (${variant.source.file})`)
    }
  }

  if (rules.length > 0) {
    output.writeText("")
    output.writeText(pc.bold("Rules"))
    for (const rule of rules) {
      const state = rule.applied ? "[applied]" : `[skipped${rule.reason ? `: ${rule.reason}` : ""}]`
      output.listItem(`${rule.property}: ${rule.value} ${state}`)
    }
  }

  if (conflicts.length > 0) {
    output.writeText("")
    output.writeText(pc.bold("Conflicts"))
    for (const conflict of conflicts) {
      output.listItem(
        `${conflict.property}: ${conflict.winner} overrides ${conflict.loser} (${conflict.stage})`
      )
    }
  }

  if (finalStyle.length > 0) {
    output.writeText("")
    output.writeText(pc.bold("Final style"))
    for (const style of finalStyle) {
      output.listItem(`${style.property}: ${style.value}`)
    }
  }

  output.writeText("")
  output.info("Use --target <path> to trace a file or directory")
}

const traceCommand: CommandDefinition = {
  name: "trace",
  aliases: ["t"],
  async run(args, context) {
    await runTraceCli(args, context)
  },
}

export { traceCommand }
