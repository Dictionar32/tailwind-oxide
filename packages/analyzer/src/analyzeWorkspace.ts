import path from "node:path"

import type { ScanWorkspaceResult } from "@tailwind-styled/scanner"
import { scanWorkspaceAsync } from "@tailwind-styled/scanner"

import { requireNativeBinding } from "./binding"
import { parseAnalyzerOptions, parseNativeReport } from "./schemas"
import { buildSemanticReport } from "./semantic"
import type { AnalyzerOptions, AnalyzerReport, ClassUsage } from "./types"
import { debugLog, formatErrorMessage, sanitizeFrequentThreshold, sanitizeTopLimit } from "./utils"

function normalizeScan(
  scan: ScanWorkspaceResult,
  includeClass?: (className: string) => boolean
): ScanWorkspaceResult {
  if (!includeClass) return scan

  const filteredFiles = scan.files.map((file) => ({
    file: file.file,
    classes: file.classes.filter((className) => includeClass(className)),
  }))

  const unique = new Set<string>()
  for (const file of filteredFiles) {
    for (const className of file.classes) {
      unique.add(className)
    }
  }

  return {
    files: filteredFiles,
    totalFiles: scan.totalFiles,
    uniqueClasses: Array.from(unique).sort(),
  }
}

export function collectClassCounts(scan: ScanWorkspaceResult): Map<string, number> {
  const counts = new Map<string, number>()
  for (const file of scan.files) {
    for (const className of file.classes) {
      counts.set(className, (counts.get(className) ?? 0) + 1)
    }
  }
  return counts
}

function buildClassUsage(counts: Map<string, number>): ClassUsage[] {
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.name.localeCompare(right.name)
    })
}

export function buildDistribution(usages: ClassUsage[]): Record<string, number> {
  const distribution = {
    "1": 0,
    "2-3": 0,
    "4-7": 0,
    "8+": 0,
  }

  for (const usage of usages) {
    if (usage.count === 1) {
      distribution["1"] += 1
    } else if (usage.count <= 3) {
      distribution["2-3"] += 1
    } else if (usage.count <= 7) {
      distribution["4-7"] += 1
    } else {
      distribution["8+"] += 1
    }
  }

  return distribution
}

/**
 * Analyze Tailwind class usage in a workspace and return usage statistics.
 * Set `semantic.tailwindConfigPath` to override Tailwind config lookup.
 * @example
 * const report = await analyzeWorkspace("./src", {
 *   classStats: { top: 20, frequentThreshold: 2 },
 *   semantic: { tailwindConfigPath: "tailwind.config.js" },
 * })
 */
export async function analyzeWorkspace(
  root: string,
  options: AnalyzerOptions = {}
): Promise<AnalyzerReport> {
  const startedAtMs = Date.now()
  const resolvedRoot = path.resolve(root)
  const normalizedOptions = parseAnalyzerOptions(options)

  // 1. Scan workspace - const dengan IIFE async
  const scan = await (async () => {
    const scanStartedAtMs = Date.now()
    try {
      const result = await scanWorkspaceAsync(resolvedRoot, normalizedOptions.scanner)
      debugLog(
        `scanWorkspaceAsync processed ${result.totalFiles} files in ${Date.now() - scanStartedAtMs}ms`
      )
      return result
    } catch (error) {
      throw new Error(
        `Failed to scan workspace at "${resolvedRoot}": ${formatErrorMessage(error)}`,
        {
          cause: error,
        }
      )
    }
  })()

  const normalizedScan = normalizeScan(scan, normalizedOptions.includeClass)
  const topLimit = sanitizeTopLimit(normalizedOptions.classStats?.top)
  const frequentThreshold = sanitizeFrequentThreshold(
    normalizedOptions.classStats?.frequentThreshold
  )

  const binding = await requireNativeBinding()
  const filesJson = JSON.stringify(
    normalizedScan.files.map((file) => ({ file: file.file, classes: file.classes }))
  )

  // 2. Native report - const dengan IIFE
  const nativeReport = (() => {
    try {
      const report = binding.analyzeClasses(filesJson, resolvedRoot, topLimit)
      if (!report) {
        throw new Error(`Native analyzer returned no report for "${resolvedRoot}".`)
      }
      return parseNativeReport(report)
    } catch (error) {
      throw new Error(
        `Native analyzer failed for "${resolvedRoot}": ${formatErrorMessage(error)}`,
        {
          cause: error,
        }
      )
    }
  })()

  const counts = collectClassCounts(normalizedScan)
  const baseAll = buildClassUsage(counts)

  // 3. Semantic report - const dengan IIFE async
  const { all, semanticReport } = await (async () => {
    if (!normalizedOptions.semantic) {
      return { all: baseAll, semanticReport: undefined }
    }

    const semanticOption =
      typeof normalizedOptions.semantic === "object" ? normalizedOptions.semantic : undefined
    const semanticStartedAtMs = Date.now()

    try {
      const report = await buildSemanticReport(baseAll, resolvedRoot, semanticOption)
      debugLog(`semantic report built in ${Date.now() - semanticStartedAtMs}ms`)

      if (report.conflicts.length === 0) {
        return { all: baseAll, semanticReport: report }
      }

      const conflicted = new Set(report.conflicts.flatMap((conflict) => conflict.classes))
      const updatedAll = baseAll.map((usage) =>
        conflicted.has(usage.name) ? { ...usage, isConflict: true } : usage
      )
      return { all: updatedAll, semanticReport: report }
    } catch (error) {
      throw new Error(
        `Failed to build semantic report for "${resolvedRoot}": ${formatErrorMessage(error)}`,
        { cause: error }
      )
    }
  })()

  // 4. Statistics - semua const
  const top = all.slice(0, topLimit)
  const frequent = all.filter((usage) => usage.count >= frequentThreshold).slice(0, topLimit)
  const unique = all.filter((usage) => usage.count === 1)
  const totalClassOccurrences = all.reduce((sum, usage) => sum + usage.count, 0)

  debugLog(
    `analyzeWorkspace completed in ${Date.now() - startedAtMs}ms ` +
      `(files=${normalizedScan.totalFiles}, uniqueClasses=${all.length})`
  )

  return {
    root: nativeReport.root || resolvedRoot,
    totalFiles: nativeReport.totalFiles,
    uniqueClassCount: all.length,
    totalClassOccurrences,
    classStats: {
      all,
      top,
      frequent,
      unique,
      distribution: buildDistribution(all),
    },
    safelist: all.map((usage) => usage.name),
    ...(semanticReport ? { semantic: semanticReport } : {}),
  }
}
