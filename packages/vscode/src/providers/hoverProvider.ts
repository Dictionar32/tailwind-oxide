import * as vscode from "vscode"
import type { EngineService, TraceHoverResult } from "../services/engineService"

const TAILWIND_CLASS_REGEX =
  /(?<=class[=:]["'`]([^"'`]*?\s+)?)[a-zA-Z][a-zA-Z0-9:/-]*(?=[^"'`]*?["'`])/g

export function createHoverProvider(engineService: EngineService): vscode.HoverProvider {
  return {
    provideHover(
      document: vscode.TextDocument,
      position: vscode.Position,
      _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
      return (async () => {
        try {
          const lineText = document.lineAt(position.line).text

          const classMatches = lineText.match(TAILWIND_CLASS_REGEX)
          if (!classMatches) {
            return null
          }

          const word = document.getWordRangeAtPosition(position)
          if (!word) {
            return null
          }

          const hoveredWord = document.getText(word)
          const className = classMatches.find((c) => c === hoveredWord || hoveredWord.includes(c))

          if (!className) {
            return null
          }

          const result = await engineService.trace(className)

          if (!result) {
            const noResult = new vscode.MarkdownString()
            noResult.appendCodeblock(`class="${className}"`, "html")
            noResult.appendText(`\nNo trace information available for: ${className}`)
            return new vscode.Hover(noResult, word)
          }

          const markdown = formatHoverContent(result)
          return new vscode.Hover(markdown, word)
        } catch (error) {
          console.error("[HoverProvider] Error providing hover:", error)
          return null
        }
      })()
    },
  }
}

function formatHoverContent(result: TraceHoverResult): vscode.MarkdownString {
  const markdown = new vscode.MarkdownString()

  if (!result) {
    markdown.appendText("No information available")
    return markdown
  }

  markdown.appendMarkdown(`# .${result.className}\n\n`)

  if (result.definedAt) {
    markdown.appendMarkdown(
      `**Defined in:** \`${result.definedAt.file}:${result.definedAt.line}\`\n\n`
    )
  }

  if (result.variants && result.variants.length > 0) {
    markdown.appendMarkdown(`**Variants:** ${result.variants.join(", ")}\n\n`)
  }

  if (result.finalStyle && result.finalStyle.length > 0) {
    markdown.appendMarkdown("**Final Style:**\n")
    for (const style of result.finalStyle) {
      markdown.appendMarkdown(`- \`${style.property}: ${style.value}\`\n`)
    }
    markdown.appendText("\n")
  }

  if (result.conflicts && result.conflicts.length > 0) {
    markdown.appendMarkdown("**Conflicts:** ⚠️\n")
    for (const conflict of result.conflicts) {
      markdown.appendMarkdown(`- overridden by .${conflict.winner} (${conflict.property})\n`)
    }
  }

  return markdown
}
