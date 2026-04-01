import * as vscode from "vscode"
import type { EngineService } from "../services/engineService"

export function registerWhyCommand(engineService: EngineService) {
  return vscode.commands.registerCommand("tailwind-styled.why", async () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      vscode.window.showInformationMessage("No active editor")
      return
    }

    const selection = editor.selection
    const text = editor.document.getText(selection)

    if (!text || text.trim().length === 0) {
      vscode.window.showInformationMessage("No class selected")
      return
    }

    const classMatch = text.match(/[\w-]+/)
    if (!classMatch) {
      vscode.window.showInformationMessage("No valid class name in selection")
      return
    }

    const className = classMatch[0]

    try {
      const result = await engineService.why(className)

      if (result) {
        const panel = vscode.window.createWebviewPanel(
          "tailwind-styled-why",
          `Why: ${className}`,
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
    .section { margin: 16px 0; }
    .label { font-weight: bold; color: #666; }
    .risk { display: inline-block; padding: 4px 12px; border-radius: 4px; }
    .risk-low { background: #dcfce7; color: #166534; }
    .risk-medium { background: #fef9c3; color: #854d0e; }
    .risk-high { background: #fee2e2; color: #991b1b; }
    ul { padding-left: 20px; }
    li { margin: 4px 0; }
  </style>
</head>
<body>
  <h1>.${className}</h1>`,
        ]

        parts.push(`
  <div class="section">
    <div class="label">Bundle Contribution:</div>
    <div>${result.bundleContribution}</div>
  </div>`)

        if (result.usedIn && result.usedIn.length > 0) {
          parts.push(`
  <div class="section">
    <div class="label">Used in (${result.usedIn.length} locations):</div>
    <ul>
      ${result.usedIn.map((u) => `<li>${u.file}:${u.line}</li>`).join("")}
    </ul>
  </div>`)
        } else {
          parts.push(`
  <div class="section">
    <div class="label">Used in:</div>
    <div>Not used in any files</div>
  </div>`)
        }

        const riskClass =
          result.impact.risk === "low"
            ? "risk-low"
            : result.impact.risk === "medium"
              ? "risk-medium"
              : "risk-high"

        parts.push(`
  <div class="section">
    <div class="label">Impact:</div>
    <div>Risk: <span class="risk ${riskClass}">${result.impact.risk}</span></div>
    <div>Components affected: ${result.impact.componentsAffected}</div>
  </div>
</body>
</html>`)

        panel.webview.html = parts.join("")
      } else {
        vscode.window.showInformationMessage(`Class "${className}" not found`)
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error getting why info: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  })
}
