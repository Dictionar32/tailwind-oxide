import path from "node:path"

import { scanWorkspaceAsync } from "@tailwind-styled/scanner"
import { createCliOutput } from "./utils/output"

export interface ScanCliResult {
  root: string
  totalFiles: number
  uniqueClassCount: number
  topClasses: Array<{ name: string; count: number }>
}

function buildTopClasses(
  files: Array<{ classes: string[] }>
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const file of files) {
    for (const className of file.classes) {
      counts.set(className, (counts.get(className) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }))
}

export async function runScanCli(rawArgs: string[]): Promise<void> {
  const target = rawArgs.find((arg) => !arg.startsWith("-")) ?? "."
  const asJson = rawArgs.includes("--json")
  const output = createCliOutput({
    json: asJson,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1",
  })

  const root = path.resolve(process.cwd(), target)
  const spinner = output.spinner()
  spinner.start(`Scanning ${root}`)
  const scanned = await scanWorkspaceAsync(root)
  spinner.stop(`Scan complete: ${scanned.totalFiles} file(s)`)

  const result: ScanCliResult = {
    root,
    totalFiles: scanned.totalFiles,
    uniqueClassCount: scanned.uniqueClasses.length,
    topClasses: buildTopClasses(scanned.files),
  }

  if (asJson) {
    output.jsonSuccess("scan", result)
    return
  }

  output.writeText(`\nScan root       : ${result.root}`)
  output.writeText(`Total files     : ${result.totalFiles}`)
  output.writeText(`Unique classes  : ${result.uniqueClassCount}`)
  output.writeText("\nTop classes:")
  for (const item of result.topClasses.slice(0, 10)) {
    output.writeText(`  - ${item.name}: ${item.count}`)
  }
}
