import fs from "node:fs"
import path from "node:path"

import { analyzeWorkspace } from "@tailwind-styled/analyzer"
import { scanWorkspace } from "@tailwind-styled/scanner"

export type DiagnosticSeverity = "error" | "warning" | "info"
export type DiagnosticInclude = "workspace" | "tailwind" | "analysis"

export const SUPPORTED_DIAGNOSTIC_INCLUDES: readonly DiagnosticInclude[] = [
  "workspace",
  "tailwind",
  "analysis",
]

export interface DiagnosticIssue {
  severity: DiagnosticSeverity
  type: string
  message: string
  location?: string
  suggestion?: string
}

export interface DiagnosticCheck {
  id: string
  category: DiagnosticInclude
  status: "pass" | "fail" | "skip"
  severity: DiagnosticSeverity
  message: string
  details?: Record<string, unknown>
}

export interface DiagnosticResult {
  timestamp: string
  root: string
  includes: DiagnosticInclude[]
  issues: DiagnosticIssue[]
  checks: DiagnosticCheck[]
  summary: {
    errors: number
    warnings: number
    info: number
    exitCode: 0 | 1 | 2
  }
}

export interface RunDiagnosticsOptions {
  root?: string
  verbose?: boolean
  include?: DiagnosticInclude[]
}

function calculateBundleSizeEstimate(classes: string[]): number {
  const avgClassSize = 15
  const avgRuleSize = 80
  return classes.length * (avgClassSize + avgRuleSize)
}

function getTopUnusedClasses(unusedClasses: Array<{ name: string; count: number }>, limit: number) {
  return unusedClasses.slice(0, limit)
}

function parseIncludes(include?: DiagnosticInclude[]): DiagnosticInclude[] {
  if (!include || include.length === 0) {
    return [...SUPPORTED_DIAGNOSTIC_INCLUDES]
  }

  const invalid = include.filter((value) => !SUPPORTED_DIAGNOSTIC_INCLUDES.includes(value))
  if (invalid.length > 0) {
    throw new Error(
      `Unsupported diagnostic include: ${invalid.join(", ")}. ` +
        `Supported values: ${SUPPORTED_DIAGNOSTIC_INCLUDES.join(", ")}`
    )
  }

  return Array.from(new Set(include))
}

function addCheck(
  checks: DiagnosticCheck[],
  category: DiagnosticInclude,
  id: string,
  status: DiagnosticCheck["status"],
  severity: DiagnosticSeverity,
  message: string,
  details?: Record<string, unknown>
): void {
  checks.push({ id, category, status, severity, message, details })
}

function addIssue(
  issues: DiagnosticIssue[],
  severity: DiagnosticSeverity,
  type: string,
  message: string,
  suggestion?: string,
  location?: string
): void {
  issues.push({ severity, type, message, suggestion, location })
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>
  } catch {
    return null
  }
}

function findWorkspacePackageJsonFiles(root: string): string[] {
  const packagesDir = path.join(root, "packages")
  if (!fs.existsSync(packagesDir)) return []

  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packagesDir, entry.name, "package.json"))
    .filter((filePath) => fs.existsSync(filePath))
}

function findFiles(dir: string, ext: string): string[] {
  const files: string[] = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        files.push(...findFiles(fullPath, ext))
      } else if (entry.isFile() && entry.name.endsWith(ext)) {
        files.push(fullPath)
      }
    }
  } catch {
    return files
  }
  return files
}

function runWorkspaceDiagnostics(
  root: string,
  issues: DiagnosticIssue[],
  checks: DiagnosticCheck[]
): void {
  const rootPackageJsonPath = path.join(root, "package.json")
  const rootPackageJson = readJsonFile(rootPackageJsonPath)
  if (!rootPackageJson) {
    addCheck(
      checks,
      "workspace",
      "workspace-root",
      "fail",
      "error",
      "package.json not found in the selected working directory."
    )
    addIssue(
      issues,
      "error",
      "workspace-root",
      "package.json not found",
      "Run doctor in a project directory that contains a package.json",
      root
    )
    return
  }

  const workspaces = Array.isArray(rootPackageJson.workspaces) ? rootPackageJson.workspaces : []
  const packageFiles = findWorkspacePackageJsonFiles(root)

  if (workspaces.length === 0) {
    addCheck(
      checks,
      "workspace",
      "workspace-root",
      "skip",
      "info",
      "No npm workspaces declared in package.json."
    )
  } else {
    addCheck(
      checks,
      "workspace",
      "workspace-root",
      "pass",
      "info",
      `Workspace root detected with ${packageFiles.length} package(s).`,
      {
        patterns: workspaces,
        packages: packageFiles.length,
      }
    )
  }

  const requiredScripts = ["build", "test", "check", "clean", "pack:check"]
  const missingScripts = packageFiles.flatMap((filePath) => {
    const manifest = readJsonFile(filePath)
    if (!manifest) return []
    const scripts =
      typeof manifest.scripts === "object" && manifest.scripts !== null
        ? (manifest.scripts as Record<string, unknown>)
        : {}
    const missing = requiredScripts.filter((name) => typeof scripts[name] !== "string")
    if (missing.length === 0) return []

    const packageName =
      typeof manifest.name === "string" && manifest.name.length > 0
        ? manifest.name
        : path.basename(path.dirname(filePath))
    return [{ packageName, missing }]
  })

  if (missingScripts.length === 0) {
    addCheck(
      checks,
      "workspace",
      "workspace-scripts",
      "pass",
      "info",
      "All discovered workspace packages expose the minimum script set."
    )
    return
  }

  addCheck(
    checks,
    "workspace",
    "workspace-scripts",
    "fail",
    "warning",
    `${missingScripts.length} workspace package(s) are missing required scripts.`,
    {
      requiredScripts,
      missing: missingScripts,
    }
  )

  addIssue(
    issues,
    "warning",
    "workspace-scripts",
    `${missingScripts.length} workspace package(s) are missing one or more required scripts.`,
    "Add build, test, check, clean, and pack:check to each workspace package.json"
  )
}

function runTailwindProjectDiagnostics(
  root: string,
  issues: DiagnosticIssue[],
  checks: DiagnosticCheck[]
): void {
  const packageJsonPath = path.join(root, "package.json")
  const packageJson = readJsonFile(packageJsonPath)

  if (!packageJson) {
    addCheck(
      checks,
      "tailwind",
      "project-manifest",
      "fail",
      "error",
      "package.json not found for Tailwind diagnostics."
    )
    return
  }

  const dependencies = {
    ...((packageJson.dependencies as Record<string, unknown> | undefined) ?? {}),
    ...((packageJson.devDependencies as Record<string, unknown> | undefined) ?? {}),
  }

  const hasTailwind = typeof dependencies.tailwindcss === "string"
  const hasTailwindStyled =
    typeof dependencies["tailwind-styled-v4"] === "string" ||
    Object.keys(dependencies).some((name) => name.startsWith("@tailwind-styled/"))

  if (hasTailwind && hasTailwindStyled) {
    addCheck(
      checks,
      "tailwind",
      "project-dependencies",
      "pass",
      "info",
      "Tailwind CSS and tailwind-styled dependencies were detected."
    )
  } else {
    addCheck(
      checks,
      "tailwind",
      "project-dependencies",
      "fail",
      "warning",
      "Tailwind CSS or tailwind-styled dependency is missing."
    )

    if (!hasTailwind) {
      addIssue(
        issues,
        "error",
        "missing-tailwind",
        "Tailwind CSS not installed",
        "npm install -D tailwindcss"
      )
    }

    if (!hasTailwindStyled) {
      addIssue(
        issues,
        "warning",
        "missing-tailwind-styled",
        "tailwind-styled package not found in dependencies",
        "Install tailwind-styled-v4 or the package-specific @tailwind-styled/* dependency"
      )
    }
  }

  const cssFiles = findFiles(root, ".css")
  const hasTailwindImport = cssFiles.slice(0, 10).some((filePath) => {
    try {
      const content = fs.readFileSync(filePath, "utf8")
      return content.includes("@tailwind") || content.includes('@import "tailwindcss"')
    } catch {
      return false
    }
  })

  addCheck(
    checks,
    "tailwind",
    "css-entry",
    hasTailwindImport ? "pass" : "fail",
    hasTailwindImport ? "info" : "warning",
    hasTailwindImport
      ? "Tailwind CSS entry was detected in project styles."
      : "Tailwind CSS entry was not detected in scanned CSS files."
  )

  if (!hasTailwindImport && cssFiles.length > 0) {
    addIssue(
      issues,
      "warning",
      "no-tailwind-import",
      "Tailwind CSS imports not found in CSS files",
      'Add @import "tailwindcss" or Tailwind directives to your CSS entry file'
    )
  }

  const configFiles = ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs"]
  const hasConfig = configFiles.some((name) => fs.existsSync(path.join(root, name)))
  addCheck(
    checks,
    "tailwind",
    "tailwind-config",
    hasConfig ? "pass" : "skip",
    "info",
    hasConfig ? "Tailwind config file detected." : "No tailwind.config file found."
  )

  const tsconfig = readJsonFile(path.join(root, "tsconfig.json"))
  const jsx = (tsconfig?.compilerOptions as Record<string, unknown> | undefined)?.jsx
  addCheck(
    checks,
    "tailwind",
    "tsconfig-jsx",
    typeof jsx === "string" ? "pass" : "skip",
    "info",
    typeof jsx === "string"
      ? `TypeScript JSX mode detected: ${jsx}.`
      : "TypeScript JSX mode not configured."
  )
}

async function runAnalysisDiagnostics(
  root: string,
  issues: DiagnosticIssue[],
  checks: DiagnosticCheck[],
  verbose: boolean
): Promise<void> {
  const scanResult = (() => {
    try {
      return scanWorkspace(root, {
        includeExtensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
        ignoreDirectories: ["node_modules", ".git", ".next", "dist", "out", ".turbo", ".cache"],
        useCache: true,
      })
    } catch (error) {
      addCheck(
        checks,
        "analysis",
        "workspace-scan",
        "fail",
        "error",
        `Workspace scan failed: ${error instanceof Error ? error.message : String(error)}`
      )
      addIssue(
        issues,
        "error",
        "workspace-scan",
        `Workspace scan failed: ${error instanceof Error ? error.message : String(error)}`
      )
      return null
    }
  })()

  if (!scanResult) return

  addCheck(
    checks,
    "analysis",
    "workspace-scan",
    "pass",
    "info",
    `Workspace scan completed for ${scanResult.totalFiles} file(s) and ${scanResult.uniqueClasses.length} unique class(es).`
  )

  const analyzerReport = await (async () => {
    try {
      const report = await analyzeWorkspace(root, {
        semantic: true,
        classStats: {
          top: 100,
          frequentThreshold: 5,
        },
      })
      addCheck(
        checks,
        "analysis",
        "analyzer",
        "pass",
        "info",
        "Analyzer semantic report generated successfully."
      )
      return report
    } catch (error) {
      addCheck(
        checks,
        "analysis",
        "analyzer",
        "fail",
        "warning",
        `Analyzer unavailable: ${error instanceof Error ? error.message : String(error)}`
      )
      addIssue(
        issues,
        "warning",
        "analyzer-unavailable",
        `Analyzer is unavailable. ${error instanceof Error ? error.message : String(error)}`,
        "Build @tailwind-styled/analyzer and the native binding to enable deep semantic diagnostics"
      )
      return null
    }
  })()

  if (!analyzerReport) return

  if (analyzerReport.semantic) {
    const semantic = analyzerReport.semantic
    const topUnused = getTopUnusedClasses(
      semantic.unusedClasses.filter((entry) => entry.count > 0),
      10
    )

    for (const unusedClass of topUnused) {
      addIssue(
        issues,
        "warning",
        "unused-class",
        `Unused class "${unusedClass.name}" appears ${unusedClass.count} time(s) in your codebase.`,
        "Remove the class or add it to your safelist if it is generated dynamically"
      )
    }

    for (const conflict of semantic.conflicts) {
      addIssue(
        issues,
        "error",
        "class-conflict",
        conflict.message,
        `Classes: ${conflict.classes.join(", ")}`,
        conflict.variants.length > 0 ? `Variant: ${conflict.variants.join(", ")}` : undefined
      )
    }

    for (const unknownClass of semantic.unknownClasses.slice(0, 20)) {
      addIssue(
        issues,
        "info",
        "unknown-class",
        `Unknown class "${unknownClass.name}" was detected.`,
        "This may be a custom utility or a typo"
      )
    }

    if (semantic.tailwindConfig) {
      const config = semantic.tailwindConfig
      if (config.loaded) {
        addCheck(
          checks,
          "analysis",
          "tailwind-config-analysis",
          "pass",
          "info",
          `Tailwind config loaded with ${config.safelistCount} safelist entries and ${config.customUtilityCount} custom utilities.`
        )
      } else if (config.warning) {
        addCheck(
          checks,
          "analysis",
          "tailwind-config-analysis",
          "fail",
          "warning",
          `Tailwind config warning: ${config.warning}`
        )
        addIssue(issues, "warning", "tailwind-config", `Tailwind config warning: ${config.warning}`)
      }
    }
  }

  const bundleSizeEstimate = calculateBundleSizeEstimate(analyzerReport.safelist)
  const bundleSizeKB = Math.round(bundleSizeEstimate / 1024)
  addIssue(
    issues,
    "info",
    "workspace-stats",
    `Workspace scan complete: ${analyzerReport.totalFiles} files, ${analyzerReport.uniqueClassCount} unique classes, ${analyzerReport.totalClassOccurrences} total occurrences.`
  )
  addIssue(
    issues,
    "info",
    "bundle-estimate",
    `Estimated CSS bundle size: ~${bundleSizeKB}KB (${analyzerReport.safelist.length} classes).`
  )

  if (verbose) {
    addIssue(
      issues,
      "info",
      "verbose",
      `Full class list (${analyzerReport.safelist.length} classes) is available from the analyzer report.`
    )
  }
}

export const runDiagnostics = async (
  options: RunDiagnosticsOptions = {}
): Promise<DiagnosticResult> => {
  const root = path.resolve(options.root ?? process.cwd())
  const includes = parseIncludes(options.include)
  const issues: DiagnosticIssue[] = []
  const checks: DiagnosticCheck[] = []

  if (includes.includes("workspace")) {
    runWorkspaceDiagnostics(root, issues, checks)
  }

  if (includes.includes("tailwind")) {
    runTailwindProjectDiagnostics(root, issues, checks)
  }

  if (includes.includes("analysis")) {
    await runAnalysisDiagnostics(root, issues, checks, options.verbose ?? false)
  }

  const summary = {
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
    exitCode: 0 as 0 | 1 | 2,
  }

  summary.exitCode = summary.errors > 0 ? 1 : summary.warnings > 0 ? 2 : 0

  return {
    timestamp: new Date().toISOString(),
    root,
    includes,
    issues,
    checks,
    summary,
  }
}
