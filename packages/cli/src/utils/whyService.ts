import { scanWorkspace } from "@tailwind-styled/scanner"
import { compileCssFromClasses } from "@tailwind-styled/compiler"
import { BundleAnalyzer, ImpactTracker, ReverseLookup } from "@tailwind-styled/engine/internal"

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

  const css = compileCssFromClasses(uniqueClasses, { prefix: root }).css

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

  const usedIn: WhyResult["usedIn"] = []
  for (const file of scanResult.files) {
    for (let i = 0; i < file.classes.length; i++) {
      const fileClass = file.classes[i]
      const normalizedFileClass = fileClass.startsWith(".") ? fileClass.slice(1) : fileClass
      if (normalizedFileClass === className || normalizedFileClass.startsWith(`${className}:`)) {
        usedIn.push({
          file: file.file,
          line: 1,
          column: 1,
          usage: fileClass,
        })
      }
    }
  }

  if (usedIn.length === 0) {
    throw new Error(
      `Class "${className}" was found in scan and CSS but no actual usage locations could be determined.`
    )
  }

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
