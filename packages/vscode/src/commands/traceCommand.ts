import * as vscode from "vscode"
import type { EngineService } from "../services/engineService"

export function registerTraceCommand(engineService: EngineService) {
  return vscode.commands.registerCommand("tailwind-styled.trace", async () => {
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
      const result = await engineService.trace(className)

      if (result) {
        const panel = vscode.window.createWebviewPanel(
          "tailwind-styled-trace",
          `Trace: ${className}`,
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
    pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
    .variant { display: inline-block; background: #e0e7ff; padding: 2px 8px; border-radius: 4px; margin: 2px; }
  </style>
</head>
<body>
  <h1>.${className}</h1>`,
        ]

        if (result.definedAt) {
          parts.push(`
  <div class="section">
    <div class="label">Defined at:</div>
    <div>${result.definedAt.file}:${result.definedAt.line}:${result.definedAt.column}</div>
  </div>`)
        }

        if (result.variants && result.variants.length > 0) {
          parts.push(`
  <div class="section">
    <div class="label">Variants:</div>
    <div>${result.variants.map((v) => `<span class="variant">${v}</span>`).join(" ")}</div>
  </div>`)
        }

        if (result.rules && result.rules.length > 0) {
          parts.push(`
  <div class="section">
    <div class="label">Rules:</div>
    <pre>${JSON.stringify(result.rules, null, 2)}</pre>
  </div>`)
        }

        if (result.finalStyle && result.finalStyle.length > 0) {
          parts.push(`
  <div class="section">
    <div class="label">Final Style:</div>
    <pre>${JSON.stringify(result.finalStyle, null, 2)}</pre>
  </div>`)
        }

        if (result.conflicts && result.conflicts.length > 0) {
          parts.push(`
  <div class="section">
    <div class="label">Conflicts:</div>
    <pre>${JSON.stringify(result.conflicts, null, 2)}</pre>
  </div>`)
        }

        parts.push(`
</body>
</html>`)

        panel.webview.html = parts.join("")
      } else {
        vscode.window.showInformationMessage(`Class "${className}" not found`)
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error tracing class: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  })
}
