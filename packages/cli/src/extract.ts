/**
 * tailwind-styled-v4 style extraction suggestions.
 */
import path from "node:path"
import { parseArgs as parseNodeArgs } from "node:util"

import { loadAnalyzerModule } from "./utils/analyzer"
import { CliUsageError } from "./utils/errors"
import { pathExists } from "./utils/fs"
import { createCliOutput } from "./utils/output"

interface ExtractCandidate {
  pattern: string
  count: number
  suggestedName: string
  suggestedTag: string
  suggestedCode: string
  savings: number
}

function guessSuggestedName(pattern: string): string {
  if (pattern.includes("flex") && pattern.includes("items-center")) return "HStack"
  if (pattern.includes("flex") && pattern.includes("flex-col")) return "VStack"
  if (pattern.includes("rounded") && pattern.includes("shadow")) return "Card"
  if (
    pattern.includes("btn") ||
    (pattern.includes("px-") && pattern.includes("py-") && pattern.includes("rounded"))
  ) {
    return "Button"
  }
  if (pattern.includes("text-sm") || pattern.includes("text-xs")) return "Caption"
  const first = pattern.split(" ")[0]
  return `${first.replace(/[^a-zA-Z]/g, "").replace(/^(.)/, (char) => char.toUpperCase())}Base`
}

function guessSuggestedTag(pattern: string): string {
  if (pattern.includes("text-") && !pattern.includes("bg-")) return "span"
  if (pattern.includes("btn") || pattern.includes("cursor-pointer")) return "button"
  return "div"
}

export async function runExtractCli(args: string[]): Promise<void> {
  const parsed = parseNodeArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      json: { type: "boolean", default: false },
      min: { type: "string" },
    },
  })
  const jsonFlag = Boolean(parsed.values.json)
  const output = createCliOutput({
    json: jsonFlag,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1",
  })
  const minRaw = typeof parsed.values.min === "string" ? parsed.values.min : "2"
  const parsedMin = parseInt(minRaw, 10)
  const minCount = Number.isFinite(parsedMin) && parsedMin > 0 ? parsedMin : 2
  const dirArg = parsed.positionals[0] ?? "."
  const dir = path.resolve(process.cwd(), dirArg)

  if (!(await pathExists(dir))) {
    throw new CliUsageError(`Directory not found: ${dir}`)
  }

  const analyzer = await loadAnalyzerModule()
  const spinner = output.spinner()
  spinner.start(`Scanning extraction candidates in ${dir}`)
  const report = await analyzer.analyzeWorkspace(dir, {
    classStats: { top: 50, frequentThreshold: 2 },
  })
  spinner.stop(`Extraction scan complete: ${report.totalFiles} file(s)`)

  const candidates: ExtractCandidate[] = report.classStats.frequent
    .filter((usage) => usage.count >= minCount)
    .map((usage) => {
      const suggestedName = guessSuggestedName(usage.name)
      const suggestedTag = guessSuggestedTag(usage.name)
      const suggestedCode = `export const ${suggestedName} = tw.${suggestedTag}\`${usage.name}\``
      const savings = (usage.count - 1) * usage.name.length
      return {
        pattern: usage.name,
        count: usage.count,
        suggestedName,
        suggestedTag,
        suggestedCode,
        savings,
      }
    })
    .sort((left, right) => right.savings - left.savings)

  if (jsonFlag) {
    output.jsonSuccess("extract", {
      root: dir,
      totalFiles: report.totalFiles,
      candidates,
    })
    return
  }

  const bar = "-".repeat(55)
  output.writeText(`\n+${bar}+`)
  output.writeText(`|  tailwind-styled-v4 - Extract Suggestions${" ".repeat(13)}|`)
  output.writeText(`+${bar}+`)
  output.writeText(`|  Files scanned:     ${String(report.totalFiles).padEnd(34)}|`)
  output.writeText(`|  Candidates found:  ${String(candidates.length).padEnd(34)}|`)
  output.writeText(`+${bar}+`)

  if (candidates.length === 0) {
    output.writeText("\n  No extraction candidates found (all classes are unique).\n")
    return
  }

  for (const candidate of candidates.slice(0, 15)) {
    output.writeText(`\n  PATTERN: "${candidate.pattern}"`)
    output.writeText(`  Found ${candidate.count} times - ~${candidate.savings} chars saved`)
    output.writeText(`  -> ${candidate.suggestedCode}`)
  }

  output.writeText("")
}
