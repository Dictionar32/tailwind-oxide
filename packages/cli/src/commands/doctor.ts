import type { CommandDefinition } from "./types"
import type { CommandContext } from "./types"
import type { CliOutput } from "../utils/output"
import { runDiagnostics } from "../utils/doctorService"
import pc from "picocolors"
import fs from "node:fs"
import path from "node:path"

export async function runDoctorCli(args: string[], context: CommandContext): Promise<void> {
  const verbose = args.includes("--verbose") || args.includes("-v")
  const json = context.json || args.includes("--json")

  try {
    // Try advanced diagnostics first, fall back to basic if native binding not available
    const issues: DiagnosticResult = await executeDiagnostics(context, { verbose }).catch(() => runBasicDiagnostics())

    if (json) {
      context.output.jsonSuccess("doctor", issues)
      return
    }

    printDoctorOutput(issues, context.output, verbose)
  } catch (error) {
    context.output.error(`Doctor failed: ${error}`)
  }
}

interface DiagnosticIssue {
  severity: "error" | "warning" | "info"
  type: string
  message: string
  location?: string
  suggestion?: string
}

interface DiagnosticResult {
  timestamp: string
  issues: DiagnosticIssue[]
  summary: {
    errors: number
    warnings: number
    info: number
  }
}

async function executeDiagnostics(
  context: CommandContext,
  options: { verbose: boolean }
): Promise<DiagnosticResult> {
  return await runDiagnostics({ root: process.cwd(), verbose: options.verbose })
}

// Basic diagnostics without native binding
async function runBasicDiagnostics(): Promise<DiagnosticResult> {
  const issues: DiagnosticIssue[] = []

  // 1. Check package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    if (!deps["tailwindcss"]) {
      issues.push({
        severity: "error",
        type: "missing-tailwind",
        message: "Tailwind CSS not installed",
        suggestion: "npm install -D tailwindcss"
      })
    }

    if (!deps["tailwind-styled-v4"]) {
      issues.push({
        severity: "warning",
        type: "missing-tailwind-styled",
        message: "tailwind-styled-v4 not in dependencies",
        suggestion: "npm install tailwind-styled-v4"
      })
    }
  } catch {
    issues.push({
      severity: "error",
      type: "no-package-json",
      message: "package.json not found",
      suggestion: "Run in a project directory with package.json"
    })
  }

  // 2. Check for CSS files with Tailwind imports
  try {
    const cssFiles = findFiles(".", ".css")
    const hasTailwindImport = cssFiles.slice(0, 5).some(file => {
      const content = fs.readFileSync(file, "utf8")
      return content.includes("@tailwind") || content.includes('@import "tailwindcss"')
    })

    if (!hasTailwindImport && cssFiles.length > 0) {
      issues.push({
        severity: "warning",
        type: "no-tailwind-import",
        message: "Tailwind CSS imports not found in CSS files",
        suggestion: "Add @tailwind base; @tailwind components; @tailwind utilities to your CSS"
      })
    }
  } catch {
    // Skip if can't scan
  }

  // 3. Check for Tailwind config
  const configFiles = ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs"]
  const hasConfig = configFiles.some(config => fs.existsSync(config))

  if (!hasConfig) {
    issues.push({
      severity: "info",
      type: "no-config",
      message: "No tailwind.config found",
      suggestion: "Run npx tailwindcss init to create one (optional for v4)"
    })
  }

  // 4. Check TypeScript setup
  if (fs.existsSync("tsconfig.json")) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf8"))
      if (!tsconfig.compilerOptions?.jsx) {
        issues.push({
          severity: "info",
          type: "jsx-config",
          message: "JSX not configured in tsconfig.json",
          suggestion: 'Add "jsx": "react-jsx" to compilerOptions'
        })
      }
    } catch {
      // Invalid JSON
    }
  }

  // 5. Framework detection
  if (fs.existsSync("next.config.js") || fs.existsSync("next.config.ts")) {
    issues.push({
      severity: "info",
      type: "framework-next",
      message: "Next.js detected",
      suggestion: "Run npx tw setup to configure Next.js plugin"
    })
  }

  if (fs.existsSync("vite.config.js") || fs.existsSync("vite.config.ts")) {
    issues.push({
      severity: "info",
      type: "framework-vite",
      message: "Vite detected",
      suggestion: "Run npx tw setup to configure Vite plugin"
    })
  }

  // 6. Info about native binding
  issues.push({
    severity: "info",
    type: "native-binding",
    message: "Native Rust binding not found (optional)",
    suggestion: "For advanced deep analysis, run npm run build:rust"
  })

  return {
    timestamp: new Date().toISOString(),
    issues,
    summary: {
      errors: issues.filter(i => i.severity === "error").length,
      warnings: issues.filter(i => i.severity === "warning").length,
      info: issues.filter(i => i.severity === "info").length
    }
  }
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
    // Ignore permission errors
  }
  return files
}

function printDoctorOutput(result: DiagnosticResult, output: CliOutput, verbose: boolean) {
  output.writeText("")
  output.writeText(pc.cyan("🔍 Tailwind Styled Doctor"))
  output.writeText("")

  const { errors, warnings, info } = result.summary
  
  if (errors === 0 && warnings === 0 && info <= 2) {
    output.writeText(pc.green("✅ All checks passed! Your project looks good."))
    output.writeText("")
  }

  const errorIssues = result.issues.filter((i) => i.severity === "error")
  const warningIssues = result.issues.filter((i) => i.severity === "warning")
  const infoIssues = result.issues.filter((i) => i.severity === "info")

  if (errorIssues.length > 0) {
    output.writeText(pc.red("❌ Issues"))
    for (const issue of errorIssues) {
      output.writeText(`  ${pc.white(issue.message)}`)
      if (issue.suggestion) {
        output.writeText(`  ${pc.gray("→")} ${pc.dim(issue.suggestion)}`)
      }
    }
    output.writeText("")
  }

  if (warningIssues.length > 0) {
    output.writeText(pc.yellow("⚠️ Warnings"))
    for (const issue of warningIssues) {
      output.writeText(`  ${pc.white(issue.message)}`)
      if (issue.suggestion) {
        output.writeText(`  ${pc.gray("→")} ${pc.dim(issue.suggestion)}`)
      }
    }
    output.writeText("")
  }

  if (infoIssues.length > 0) {
    output.writeText(pc.blue("ℹ️ Info"))
    for (const issue of infoIssues) {
      output.writeText(`  ${pc.white(issue.message)}`)
      if (issue.suggestion) {
        output.writeText(`  ${pc.gray("→")} ${pc.dim(issue.suggestion)}`)
      }
    }
    output.writeText("")
  }

  output.writeText(pc.gray("Run 'npx tw trace <class>' to inspect specific classes"))
  output.writeText("")
}

const doctorCommand: CommandDefinition = {
  name: "doctor",
  aliases: ["d", "diagnose"],
  async run(args, context) {
    await runDoctorCli(args, context)
  },
}

export { doctorCommand }
