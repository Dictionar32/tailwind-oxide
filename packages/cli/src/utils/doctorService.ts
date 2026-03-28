import { scanWorkspace } from "@tailwind-styled/scanner"
import { analyzeWorkspace, type AnalyzerReport } from "@tailwind-styled/analyzer"

export interface DiagnosticIssue {
  severity: "error" | "warning" | "info"
  type: string
  message: string
  location?: string
  suggestion?: string
}

export interface DiagnosticResult {
  timestamp: string
  issues: DiagnosticIssue[]
  summary: {
    errors: number
    warnings: number
    info: number
  }
}

export interface RunDiagnosticsOptions {
  root?: string
  verbose?: boolean
}

const calculateBundleSizeEstimate = (classes: string[]): number => {
  const avgClassSize = 15
  const avgRuleSize = 80
  return classes.length * (avgClassSize + avgRuleSize)
}

const getTopUnusedClasses = (
  unusedClasses: Array<{ name: string; count: number }>,
  limit: number
) => {
  return unusedClasses.slice(0, limit)
}

export const runDiagnostics = async (options?: RunDiagnosticsOptions): Promise<DiagnosticResult> => {
  const root = options?.root ?? process.cwd()
  const issues: DiagnosticIssue[] = []

  const scanResult = scanWorkspace(root, {
    includeExtensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
    ignoreDirectories: ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"],
    useCache: true,
  })

  const analyzerReport = await (async () => {
    try {
      return await analyzeWorkspace(root, {
        semantic: true,
        classStats: {
          top: 100,
          frequentThreshold: 5,
        },
      })
    } catch (error) {
      throw new Error(
        `Analyzer is unavailable. ${error instanceof Error ? error.message : String(error)}. ` +
          `Ensure @tailwind-styled/analyzer is properly installed and the native binding is built. ` +
          `Try running: npm run build -w @tailwind-styled/analyzer`
      )
    }
  })()

  if (analyzerReport.semantic) {
    const semantic = analyzerReport.semantic

    const topUnused = getTopUnusedClasses(
      semantic.unusedClasses.filter((c) => c.count > 0),
      10
    )

    // Unused classes warnings
    const unusedClassIssues = topUnused.map((unusedClass) => ({
      severity: "warning" as const,
      type: "unused-class",
      message: `Unused class "${unusedClass.name}" appears ${unusedClass.count} time(s) in your codebase.`,
      suggestion:
        "Consider removing this class or adding it to your safelist if dynamically generated.",
    }))
    issues.push(...unusedClassIssues)

    // Conflicts issues
    const conflictIssues = semantic.conflicts.map((conflict) => ({
      severity: "error" as const,
      type: "class-conflict",
      message: conflict.message,
      location:
        conflict.variants.length > 0 ? `Variant: ${conflict.variants.join(", ")}` : undefined,
      suggestion: `Classes: ${conflict.classes.join(", ")}`,
    }))
    issues.push(...conflictIssues)

    // Unknown class issues (info)
    const unknownClassIssues = semantic.unknownClasses.slice(0, 20).map((unknownClass) => ({
      severity: "info" as const,
      type: "unknown-class",
      message: `Unknown class "${unknownClass.name}" - not found in Tailwind default utilities.`,
      suggestion: "This might be a custom utility or a typo.",
    }))
    issues.push(...unknownClassIssues)
  }

  const bundleSizeEstimate = calculateBundleSizeEstimate(analyzerReport.safelist)
  const bundleSizeKB = Math.round(bundleSizeEstimate / 1024)

  // Workspace stats issue
  issues.push({
    severity: "info",
    type: "workspace-stats",
    message: `Workspace scan complete: ${analyzerReport.totalFiles} files, ${analyzerReport.uniqueClassCount} unique classes, ${analyzerReport.totalClassOccurrences} total occurrences.`,
  })

  // Bundle estimate issue
  issues.push({
    severity: "info",
    type: "bundle-estimate",
    message: `Estimated CSS bundle size: ~${bundleSizeKB}KB (${analyzerReport.safelist.length} classes).`,
  })

  // Tailwind config info
  if (analyzerReport.semantic?.tailwindConfig) {
    const config = analyzerReport.semantic.tailwindConfig
    const configIssue = config.loaded
      ? {
          severity: "info" as const,
          type: "tailwind-config",
          message: `Tailwind config loaded: ${config.safelistCount} safelist entries, ${config.customUtilityCount} custom utilities.`,
        }
      : config.warning
        ? {
            severity: "warning" as const,
            type: "tailwind-config",
            message: `Tailwind config warning: ${config.warning}`,
          }
        : null
    
    if (configIssue) issues.push(configIssue)
  }

  if (options?.verbose) {
    issues.push({
      severity: "info",
      type: "verbose",
      message: `Full class list (${analyzerReport.safelist.length} classes) available in analyzer report.`,
    })
  }

  const summary = {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  }

  return {
    timestamp: new Date().toISOString(),
    issues,
    summary,
  }
}