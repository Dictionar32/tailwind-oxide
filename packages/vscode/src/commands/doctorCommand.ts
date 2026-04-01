import * as vscode from "vscode"
import type { EngineService } from "../services/engineService"

export function registerDoctorCommand(engineService: EngineService) {
  return vscode.commands.registerCommand("tailwind-styled.doctor", async () => {
    try {
      const result = await engineService.doctor()

      const panel = vscode.window.createWebviewPanel(
        "tailwind-styled-doctor",
        "Tailwind Styled Doctor",
        vscode.ViewColumn.Two,
        {}
      )

      const parts: string[] = [
        `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; }
    h1 { color: #333; }
    .summary { display: flex; gap: 16px; margin: 16px 0; }
    .summary-item { padding: 12px 20px; border-radius: 8px; font-weight: bold; }
    .errors { background: #fee2e2; color: #991b1b; }
    .warnings { background: #fef9c3; color: #854d0e; }
    .info { background: #dbeafe; color: #1e40af; }
    .issue { padding: 12px; margin: 8px 0; border-radius: 4px; border-left: 4px solid; }
    .issue-error { background: #fef2f2; border-color: #ef4444; }
    .issue-warning { background: #fefce8; border-color: #eab308; }
    .issue-info { background: #eff6ff; border-color: #3b82f6; }
    .issue-message { font-weight: 500; }
    .issue-suggestion { color: #666; font-size: 0.9em; margin-top: 4px; }
    .issue-location { color: #888; font-size: 0.85em; font-family: monospace; }
  </style>
</head>
<body>
  <h1>Tailwind Styled Doctor</h1>
  
  <div class="summary">
    <div class="summary-item errors">${result.summary.errors} Error${result.summary.errors !== 1 ? "s" : ""}</div>
    <div class="summary-item warnings">${result.summary.warnings} Warning${result.summary.warnings !== 1 ? "s" : ""}</div>
    <div class="summary-item info">${result.summary.info} Info</div>
  </div>`,
      ]

      if (result.issues.length === 0) {
        parts.push(`
  <div style="text-align: center; padding: 40px; color: #22c55e;">
    <h2>No issues found!</h2>
    <p>Your Tailwind Styled setup looks good.</p>
  </div>`)
      } else {
        for (const issue of result.issues) {
          const issueClass =
            issue.severity === "error"
              ? "issue-error"
              : issue.severity === "warning"
                ? "issue-warning"
                : "issue-info"

          parts.push(`
  <div class="issue ${issueClass}">
    <div class="issue-message">${issue.message}</div>`)

          if (issue.location) {
            parts.push(`
    <div class="issue-location">${issue.location}</div>`)
          }

          if (issue.suggestion) {
            parts.push(`
    <div class="issue-suggestion">${issue.suggestion}</div>`)
          }

          parts.push(`
  </div>`)
        }
      }

      parts.push(`
</body>
</html>`)

      panel.webview.html = parts.join("")
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error running doctor: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  })
}
