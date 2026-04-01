import * as vscode from "vscode"
import type { EngineService } from "../services/engineService"

const TAILWIND_PREFIXES = [
  "bg-",
  "text-",
  "flex-",
  "grid-",
  "block-",
  "inline-",
  "hidden-",
  "p-",
  "px-",
  "py-",
  "pt-",
  "pr-",
  "pb-",
  "pl-",
  "m-",
  "mx-",
  "my-",
  "mt-",
  "mr-",
  "mb-",
  "ml-",
  "w-",
  "h-",
  "min-w-",
  "min-h-",
  "max-w-",
  "max-h-",
  "font-",
  "text-",
  "leading-",
  "tracking-",
  "font-",
  "border-",
  "rounded-",
  "shadow-",
  "opacity-",
  "z-",
  "top-",
  "right-",
  "bottom-",
  "left-",
  "absolute",
  "relative",
  "fixed",
  "space-x-",
  "space-y-",
  "divide-",
  "gap-",
  "hover:",
  "focus:",
  "active:",
  "disabled:",
  "group-",
  "sm-",
  "md-",
  "lg-",
  "xl-",
  "2xl-",
  "dark:",
  "container",
  "mx-auto",
  "justify-",
  "items-",
  "self-",
  "aspect-",
  "object-",
  "overflow-",
  "cursor-",
  "select-",
  "transition-",
  "duration-",
  "ease-",
  "transform",
  "translate-",
  "rotate-",
  "scale-",
  "btn-",
  "badge-",
  "card-",
  "input-",
  "modal-",
  "dropdown-",
  "navbar-",
]

const CLASS_ATTRIBUTE_TRIGGERS = ["className=", "class=", "class={"]

export function createCompletionProvider(
  engineService: EngineService
): vscode.CompletionItemProvider {
  return {
    provideCompletionItems(
      document: vscode.TextDocument,
      position: vscode.Position,
      _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
      return (async () => {
        try {
          const lineText = document.lineAt(position.line).text
          const textUntilCursor = lineText.substring(0, position.character)

          const triggerMatch = CLASS_ATTRIBUTE_TRIGGERS.find((trigger) =>
            textUntilCursor.includes(trigger)
          )

          if (!triggerMatch) {
            return []
          }

          const triggerIndex = textUntilCursor.lastIndexOf(triggerMatch)
          const prefixStart = triggerIndex + triggerMatch.length
          const prefix = textUntilCursor.substring(prefixStart)

          if (prefix.length === 0) {
            return getFallbackCompletions()
          }

          const completions = await engineService.getCompletions(prefix)

          if (completions.length === 0) {
            return getFallbackCompletions(prefix)
          }

          return completions.map((className) => {
            const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Property)
            item.detail = `class: ${className}`
            item.insertText = className
            return item
          })
        } catch (error) {
          console.error("[CompletionProvider] Error providing completions:", error)
          return getFallbackCompletions()
        }
      })()
    },
  }
}

function getFallbackCompletions(prefix?: string): vscode.CompletionItem[] {
  const items: vscode.CompletionItem[] = []
  const matchingPrefixes = prefix
    ? TAILWIND_PREFIXES.filter((p) => p.startsWith(prefix))
    : TAILWIND_PREFIXES

  for (const p of matchingPrefixes) {
    const item = new vscode.CompletionItem(p, vscode.CompletionItemKind.Property)
    item.detail = `prefix: ${p}`
    item.insertText = p
    items.push(item)
  }

  return items
}
