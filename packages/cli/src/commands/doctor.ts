import { parseArgs as parseNodeArgs } from "node:util"

import pc from "picocolors"
import {
  type DiagnosticInclude,
  type DiagnosticResult,
  runDiagnostics,
  SUPPORTED_DIAGNOSTIC_INCLUDES,
} from "../utils/doctorService"
import { CliUsageError } from "../utils/errors"
import type { CliOutput } from "../utils/output"
import type { CommandContext, CommandDefinition } from "./types"

function parseIncludeOption(value: string | undefined): DiagnosticInclude[] | undefined {
  if (!value) return undefined

  const includes = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)

  const invalid = includes.filter(
    (entry): entry is string => !SUPPORTED_DIAGNOSTIC_INCLUDES.includes(entry as DiagnosticInclude)
  )

  if (invalid.length > 0) {
    throw new CliUsageError(
      `Unsupported --include value: ${invalid.join(", ")}. ` +
        `Supported values: ${SUPPORTED_DIAGNOSTIC_INCLUDES.join(", ")}`
    )
  }

  return includes as DiagnosticInclude[]
}

export async function runDoctorCli(args: string[], context: CommandContext): Promise<void> {
  const parsed = parseNodeArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      cwd: { type: "string" },
      include: { type: "string" },
      json: { type: "boolean" },
      verbose: { type: "boolean", short: "v" },
    },
  })

  const verbose = context.verbose || parsed.values.verbose === true
  const json = context.json || parsed.values.json === true
  const root = typeof parsed.values.cwd === "string" ? parsed.values.cwd : context.cwd
  const include = parseIncludeOption(
    typeof parsed.values.include === "string" ? parsed.values.include : undefined
  )

  try {
    const result = await runDiagnostics({ root, verbose, include })
    process.exitCode = result.summary.exitCode

    if (json) {
      context.output.jsonSuccess("doctor", result)
      return
    }

    printDoctorOutput(result, context.output)
  } catch (error) {
    context.output.error(`Doctor failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function renderSeverityHeading(severity: "error" | "warning" | "info"): string {
  switch (severity) {
    case "error":
      return pc.red("Issues")
    case "warning":
      return pc.yellow("Warnings")
    case "info":
      return pc.blue("Info")
  }
}

function printDoctorOutput(result: DiagnosticResult, output: CliOutput): void {
  output.writeText("")
  output.writeText(pc.cyan("Tailwind Styled Doctor"))
  output.writeText(pc.dim(`root: ${result.root}`))
  output.writeText(pc.dim(`includes: ${result.includes.join(", ")}`))
  output.writeText("")

  output.subHeader("Checks")
  for (const check of result.checks) {
    const prefix =
      check.status === "pass"
        ? pc.green("[pass]")
        : check.status === "fail"
          ? pc.red("[fail]")
          : pc.dim("[skip]")
    output.listItem(`${prefix} ${check.id} - ${check.message}`)
  }
  output.writeText("")

  for (const severity of ["error", "warning", "info"] as const) {
    const issues = result.issues.filter((issue) => issue.severity === severity)
    if (issues.length === 0) continue

    output.writeText(renderSeverityHeading(severity))
    for (const issue of issues) {
      output.listItem(issue.message)
      if (issue.location) {
        output.listItem(pc.dim(`location: ${issue.location}`))
      }
      if (issue.suggestion) {
        output.listItem(pc.dim(`suggestion: ${issue.suggestion}`))
      }
    }
    output.writeText("")
  }

  const { errors, warnings, info, exitCode } = result.summary
  output.footer(
    `summary: ${errors} error(s), ${warnings} warning(s), ${info} info item(s), exit code ${exitCode}`
  )
}

const doctorCommand: CommandDefinition = {
  name: "doctor",
  aliases: ["d", "diagnose"],
  async run(args, context) {
    await runDoctorCli(args, context)
  },
}

export { doctorCommand }
