import fs from "node:fs"
import path from "node:path"
import { compileCssFromClasses } from "@tailwind-styled/compiler/internal"
import { BundleAnalyzer, ImpactTracker, ReverseLookup } from "@tailwind-styled/engine/internal"
import { scanWorkspace } from "@tailwind-styled/scanner"

export interface WhyResult {
  className: string
  bundleContribution: number
  usedIn: Array<{
    file: string
    line: number
    column: number
    usage: string
  }>
  variantChain: string[]
  impact: {
    risk: "low" | "medium" | "high"
    componentsAffected: number
    estimatedSavings: number
  }
  suggestions: string[]
  dependents: string[]
}

function extractVariantChain(usage: string): string[] {
  const segments = normalizeScannedClass(usage).split(":").filter(Boolean)
  return segments.length > 1 ? segments.slice(0, -1) : []
}

function normalizeScannedClass(value: string): string {
  const normalized = value.startsWith(".") ? value.slice(1) : value
  return normalized.trim()
}

function matchesClassUsage(scannedClass: string, className: string): boolean {
  const normalized = normalizeScannedClass(scannedClass)
  if (normalized === className) return true

  const segments = normalized.split(":").filter(Boolean)
  return segments.length > 0 && segments[segments.length - 1] === className
}

function locateUsage(source: string, candidates: string[]): { line: number; column: number } {
  for (const candidate of candidates) {
    if (!candidate) continue
    const index = source.indexOf(candidate)
    if (index === -1) continue

    const beforeMatch = source.slice(0, index)
    const lines = beforeMatch.split(/\r?\n/)
    return {
      line: lines.length,
      column: (lines[lines.length - 1]?.length ?? 0) + 1,
    }
  }

  return { line: 1, column: 1 }
}

export async function whyClass(className: string, options?: { root?: string }): Promise<WhyResult> {
  const root = options?.root ?? process.cwd()

  const scanResult = scanWorkspace(root, {
    includeExtensions: [".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"],
    ignoreDirectories: ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"],
    useCache: true,
  })

  const uniqueClasses = scanResult.uniqueClasses
  const classFoundInScan = uniqueClasses.includes(className)

  if (!classFoundInScan) {
    throw new Error(
      `Class "${className}" not found in workspace scan. ` +
        `Available classes: ${uniqueClasses.slice(0, 10).join(", ")}${uniqueClasses.length > 10 ? "..." : ""}`
    )
  }

  const usedIn: WhyResult["usedIn"] = []
  for (const file of scanResult.files) {
    const source = (() => {
      try {
        return fs.readFileSync(file.file, "utf8")
      } catch {
        return ""
      }
    })()

    for (let i = 0; i < file.classes.length; i++) {
      const fileClass = file.classes[i]
      if (matchesClassUsage(fileClass, className)) {
        const location = locateUsage(source, [
          normalizeScannedClass(fileClass),
          fileClass,
          className,
        ])
        usedIn.push({
          file: path.relative(root, file.file) || path.basename(file.file),
          line: location.line,
          column: location.column,
          usage: normalizeScannedClass(fileClass),
        })
      }
    }
  }

  if (usedIn.length === 0) {
    throw new Error(
      `Class "${className}" was found in scan and CSS but no actual usage locations could be determined.`
    )
  }

  const compiledCss = (() => {
    try {
      return compileCssFromClasses(uniqueClasses, {}).css
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })()

  if (typeof compiledCss !== "string") {
    return {
      className,
      bundleContribution: 0,
      usedIn,
      variantChain: Array.from(
        new Set(usedIn.flatMap((usage) => extractVariantChain(usage.usage)))
      ),
      impact: {
        risk: "low",
        componentsAffected: usedIn.length,
        estimatedSavings: 0,
      },
      suggestions: [
        `Native CSS compiler unavailable. ${compiledCss.error}`,
        "Build the native module to enable bundle contribution and dependent analysis.",
      ],
      dependents: [],
    }
  }

  const css = compiledCss

  if (!css || css.trim() === "") {
    throw new Error(
      `Class "${className}" not found in compiled CSS. ` +
        `The class may not generate any CSS rules.`
    )
  }

  const bundleAnalyzer = new BundleAnalyzer()
  const bundleAnalysis = bundleAnalyzer.analyzeClass(className, scanResult, css)

  const classInCss = css.includes(`.${className}`) || css.includes(`.${className}:`)
  if (!classInCss) {
    throw new Error(
      `Class "${className}" found in scan but not in compiled CSS. ` +
        `This may indicate a configuration issue.`
    )
  }

  const impactTracker = new ImpactTracker()
  const impactReport = impactTracker.calculateImpact(className, bundleAnalysis, scanResult)

  const reverseLookup = new ReverseLookup()
  const dependents = reverseLookup.findDependents(className, css)

  return {
    className: bundleAnalysis.className,
    bundleContribution: bundleAnalysis.bundleSizeBytes,
    usedIn,
    variantChain: bundleAnalysis.variantChains,
    impact: {
      risk: impactReport.riskLevel,
      componentsAffected: impactReport.totalComponents,
      estimatedSavings: impactReport.estimatedSavings,
    },
    suggestions: impactReport.suggestions,
    dependents,
  }
}
