import * as vscode from "vscode"
import type { ScriptName } from "./constants"
import { findAllScripts, findLspScript } from "./utils/resolve-script"

export interface HealthCheckResult {
  healthy: boolean
  missing: ScriptName[]
  resolved: Map<ScriptName, string>
  lspPath: string | null
}

export function runHealthCheck(workspaceRoot: string, bundledLspPath: string): HealthCheckResult {
  const missing: ScriptName[] = []
  const resolved = new Map<ScriptName, string>()

  const scriptResults = findAllScripts(workspaceRoot)
  for (const [name, path] of scriptResults) {
    if (path) {
      resolved.set(name, path)
    } else {
      missing.push(name)
    }
  }

  const lspPath = findLspScript(workspaceRoot, bundledLspPath)

  const allHealthy = missing.length === 0 && lspPath !== null

  return {
    healthy: allHealthy,
    missing,
    resolved,
    lspPath,
  }
}

export function reportHealth(result: HealthCheckResult, output: vscode.OutputChannel): void {
  output.appendLine("[Health Check] Starting system validation...")

  if (result.healthy) {
    output.appendLine("[Health Check] ✅ All components ready")
    vscode.window.showInformationMessage("@tailwind-styled: All components ready. v5 active.")
    return
  }

  if (result.missing.length > 0) {
    const missingList = result.missing.join(", ")
    output.appendLine(`[Health Check] ⚠️ Missing scripts: ${missingList}`)
    vscode.window.showWarningMessage(
      `@tailwind-styled: Scripts not found: ${missingList}. Some features may not work.`
    )
  }

  if (!result.lspPath) {
    output.appendLine("[Health Check] ⚠️ LSP server script not found")
  } else {
    output.appendLine(`[Health Check] ✅ LSP: ${result.lspPath}`)
  }

  for (const [name, path] of result.resolved) {
    output.appendLine(`[Health Check] ✅ ${name}: ${path}`)
  }
}

export function getHealthWarnings(result: HealthCheckResult): string[] {
  const warnings: string[] = []

  if (result.missing.length > 0) {
    warnings.push(`Missing scripts: ${result.missing.join(", ")}`)
  }

  if (!result.lspPath) {
    warnings.push("LSP server not found")
  }

  return warnings
}
