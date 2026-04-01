/**
 * tailwind-styled-v4 bundle stats visualizer.
 */
import path from "node:path"
import { parseArgs as parseNodeArgs } from "node:util"

import { loadAnalyzerModule } from "./utils/analyzer"
import { CliUsageError } from "./utils/errors"
import { pathExists } from "./utils/fs"
import { createCliOutput } from "./utils/output"

function estimateClassBytes(className: string): number {
  const base = 20
  if (className.startsWith("bg-")) return base + 28
  if (className.startsWith("text-")) return base + 22
  if (className.startsWith("border-")) return base + 20
  if (className.startsWith("p-") || className.startsWith("px-") || className.startsWith("py-"))
    return base + 18
  if (className.startsWith("m-") || className.startsWith("mx-") || className.startsWith("my-"))
    return base + 18
  if (className.startsWith("w-") || className.startsWith("h-")) return base + 12
  if (className.startsWith("flex")) return base + 16
  if (className.startsWith("grid")) return base + 20
  if (className.startsWith("rounded")) return base + 18
  if (className.startsWith("shadow")) return base + 24
  if (className.startsWith("hover:") || className.startsWith("focus:")) return base + 35
  return base + 15
}

export async function runStatsCli(args: string[]): Promise<void> {
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
  spinner.start(`Computing stats for ${dir}`)
  const report = await analyzer.analyzeWorkspace(dir, {
    classStats: { top: 30, frequentThreshold: 2 },
  })
  spinner.stop(`Stats complete: ${report.totalFiles} file(s)`)
  const totalBytes = report.safelist.reduce(
    (sum, className) => sum + estimateClassBytes(className),
    0
  )
  const duplicateBytes = report.classStats.frequent.reduce(
    (sum, usage) => sum + estimateClassBytes(usage.name) * Math.max(usage.count - 1, 0),
    0
  )

  if (jsonFlag) {
    output.jsonSuccess("stats", { ...report, estimatedCssBytes: totalBytes, duplicateBytes })
    return
  }

  const bar = "-".repeat(55)
  output.writeText(`\n+${bar}+`)
  output.writeText(`|  tailwind-styled-v4 - Bundle Stats${" ".repeat(20)}|`)
  output.writeText(`+${bar}+`)
  output.writeText(`|  Files scanned:     ${String(report.totalFiles).padEnd(34)}|`)
  output.writeText(`|  Unique classes:    ${String(report.uniqueClassCount).padEnd(34)}|`)
  output.writeText(
    `|  Est. CSS size:     ${String(`${(totalBytes / 1024).toFixed(1)} kB`).padEnd(34)}|`
  )
  output.writeText(
    `|  Duplicate waste:   ${String(`${(duplicateBytes / 1024).toFixed(1)} kB`).padEnd(34)}|`
  )
  output.writeText(`+${bar}+`)

  if (report.classStats.top.length > 0) {
    output.writeText("\n  TOP CLASSES BY CSS WEIGHT")
    output.writeText(`  ${"-".repeat(52)}`)
    const sorted = [...report.classStats.top]
      .map((usage) => ({ ...usage, bytes: estimateClassBytes(usage.name) * usage.count }))
      .sort((left, right) => right.bytes - left.bytes)

    for (const usage of sorted.slice(0, 10)) {
      output.writeText(
        `  ${usage.name.padEnd(32)} ${String(`${usage.count}x`).padEnd(6)} ~${(
          usage.bytes / 1024
        ).toFixed(1)}kB`
      )
    }
  }

  output.writeText("")
}
