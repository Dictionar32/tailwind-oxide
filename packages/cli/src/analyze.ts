/**
 * tailwind-styled-v4 CLI analyzer output.
 */
import path from "node:path"
import { parseArgs as parseNodeArgs } from "node:util"
import type { AnalyzerReport } from "@tailwind-styled/analyzer"
import { loadAnalyzerModule } from "./utils/analyzer"
import { CliUsageError } from "./utils/errors"
import { pathExists } from "./utils/fs"
import { type CliOutput, createCliOutput } from "./utils/output"

export type { AnalyzerReport as AnalysisReport } from "@tailwind-styled/analyzer"

// Keep ComponentDef for extract.ts and stats.ts compatibility.
export interface ComponentDef {
  name: string
  file: string
  base: string
  variants: Record<string, string[]>
  classes: string[]
}

export async function analyzeProject(dir: string): Promise<AnalyzerReport> {
  const analyzer = await loadAnalyzerModule()
  return analyzer.analyzeWorkspace(dir, { classStats: { top: 20, frequentThreshold: 2 } })
}

export function printAnalysisReport(report: AnalyzerReport, output: CliOutput): void {
  const bar = "-".repeat(55)
  output.writeText(`\n+${bar}+`)
  output.writeText(`|  tailwind-styled-v4 - CSS Analyzer${" ".repeat(21)}|`)
  output.writeText(`+${bar}+`)
  output.writeText(`|  Files scanned:     ${String(report.totalFiles).padEnd(34)}|`)
  output.writeText(`|  Unique classes:    ${String(report.uniqueClassCount).padEnd(34)}|`)
  output.writeText(`|  Total occurrences: ${String(report.totalClassOccurrences).padEnd(34)}|`)
  output.writeText(`|  Frequent classes:  ${String(report.classStats.frequent.length).padEnd(34)}|`)
  output.writeText(`+${bar}+`)

  if (report.classStats.frequent.length > 0) {
    output.writeText("\n  MOST FREQUENT (top 10)")
    output.writeText(`  ${"-".repeat(52)}`)
    for (const usage of report.classStats.frequent.slice(0, 10)) {
      const chart = "#".repeat(Math.min(usage.count * 2, 20))
      output.writeText(`  ${usage.name.padEnd(32)} ${chart} ${usage.count}`)
    }
  }

  if (report.classStats.top.length > 0) {
    output.writeText("\n  TOP CLASSES")
    output.writeText(`  ${"-".repeat(52)}`)
    for (const usage of report.classStats.top.slice(0, 10)) {
      const chart = "#".repeat(Math.min(usage.count * 2, 20))
      output.writeText(`  ${usage.name.padEnd(32)} ${chart} ${usage.count}`)
    }
  }

  output.writeText("")
}

export async function runAnalyzeCli(args: string[]): Promise<void> {
  const parsed = parseNodeArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      json: { type: "boolean", default: false },
    },
  })
  const jsonFlag = Boolean(parsed.values.json)
  const output = createCliOutput({
    json: jsonFlag,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1",
  })
  const dirArg = parsed.positionals[0] ?? "."
  const dir = path.resolve(process.cwd(), dirArg)

  if (!(await pathExists(dir))) {
    throw new CliUsageError(`Directory not found: ${dir}`)
  }

  const analyzer = await loadAnalyzerModule()
  const spinner = output.spinner()
  spinner.start(`Analyzing ${dir}`)
  const report = await analyzer.analyzeWorkspace(dir, {
    classStats: { top: 20, frequentThreshold: 2 },
  })
  spinner.stop(`Analysis complete: ${report.totalFiles} file(s)`)
  if (jsonFlag) {
    output.jsonSuccess("analyze", report)
    return
  }
  printAnalysisReport(report, output)
}
