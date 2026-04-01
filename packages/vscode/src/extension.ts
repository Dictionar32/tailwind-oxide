import * as vscode from "vscode"
import { registerDoctorCommand } from "./commands/doctorCommand"
import { registerTraceCommand } from "./commands/traceCommand"
import { registerWhyCommand } from "./commands/whyCommand"
import { EngineService } from "./services/engineService"

export function activate(context: vscode.ExtensionContext) {
  console.log("Tailwind Styled VS Code extension is now active!")

  const config = vscode.workspace.getConfiguration("tailwindStyled")
  const enableTraceHover = config.get<boolean>("enableTraceHover", true)
  const enableAutocomplete = config.get<boolean>("enableAutocomplete", true)
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ""
  const engineService = new EngineService(workspacePath)

  context.subscriptions.push(registerTraceCommand(engineService))
  context.subscriptions.push(registerWhyCommand(engineService))
  context.subscriptions.push(registerDoctorCommand(engineService))

  if (enableTraceHover) {
    const hoverProvider = new HoverProvider()
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        ["javascript", "javascriptreact", "typescript", "typescriptreact", "vue", "svelte"],
        hoverProvider
      )
    )
  }

  if (enableAutocomplete) {
    const completionProvider = new CompletionProvider()
    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        ["javascript", "javascriptreact", "typescript", "typescriptreact", "vue", "svelte"],
        completionProvider,
        '"',
        "'",
        " "
      )
    )
  }
}

export function deactivate() {}

class HoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const range = document.getWordRangeAtPosition(position)
    if (!range) {
      return null
    }

    const word = document.getText(range)
    const classNameMatch = word.match(/^([a-zA-Z0-9:-]+)$/)

    if (classNameMatch) {
      const hoverText = new vscode.MarkdownString()
      hoverText.appendCodeblock(`class="${word}"`, "html")
      hoverText.appendText(`\nTailwind class: ${word}`)
      return new vscode.Hover(hoverText, range)
    }

    return null
  }
}

class CompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionList> {
    const line = document.lineAt(position.line).text
    const beforeCursor = line.substring(0, position.character)

    const classAttrMatch = beforeCursor.match(/class=["'][^"']*$/)
    if (!classAttrMatch) {
      return null
    }

    const commonClasses = [
      "flex",
      "flex-col",
      "flex-row",
      "inline",
      "block",
      "inline-block",
      "grid",
      "absolute",
      "relative",
      "fixed",
      "sticky",
      "p-1",
      "p-2",
      "p-3",
      "p-4",
      "p-5",
      "p-6",
      "p-8",
      "p-10",
      "p-12",
      "p-16",
      "m-1",
      "m-2",
      "m-3",
      "m-4",
      "m-5",
      "m-auto",
      "m-0",
      "mt-1",
      "mt-2",
      "mt-3",
      "mt-4",
      "mt-5",
      "mt-auto",
      "mb-1",
      "mb-2",
      "mb-3",
      "mb-4",
      "mb-5",
      "ml-1",
      "ml-2",
      "ml-3",
      "ml-4",
      "ml-auto",
      "mr-1",
      "mr-2",
      "mr-3",
      "mr-4",
      "mr-auto",
      "mx-auto",
      "my-auto",
      "mx-0",
      "my-0",
      "w-1",
      "w-2",
      "w-3",
      "w-4",
      "w-5",
      "w-6",
      "w-8",
      "w-10",
      "w-12",
      "w-16",
      "w-full",
      "w-auto",
      "w-screen",
      "h-1",
      "h-2",
      "h-3",
      "h-4",
      "h-5",
      "h-6",
      "h-8",
      "h-10",
      "h-12",
      "h-16",
      "h-full",
      "h-screen",
      "h-auto",
      "text-xs",
      "text-sm",
      "text-base",
      "text-lg",
      "text-xl",
      "text-2xl",
      "text-3xl",
      "text-4xl",
      "font-bold",
      "font-semibold",
      "font-medium",
      "font-normal",
      "font-light",
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-gray-100",
      "bg-gray-200",
      "bg-gray-300",
      "bg-gray-400",
      "bg-gray-500",
      "bg-gray-600",
      "bg-gray-700",
      "bg-gray-800",
      "bg-gray-900",
      "bg-white",
      "bg-black",
      "bg-transparent",
      "text-white",
      "text-black",
      "text-gray-500",
      "text-red-500",
      "text-blue-500",
      "rounded",
      "rounded-sm",
      "rounded-md",
      "rounded-lg",
      "rounded-xl",
      "rounded-full",
      "rounded-t",
      "rounded-b",
      "rounded-l",
      "rounded-r",
      "border",
      "border-2",
      "border-4",
      "border-gray-300",
      "border-gray-500",
      "shadow",
      "shadow-sm",
      "shadow-md",
      "shadow-lg",
      "shadow-xl",
      "opacity-0",
      "opacity-25",
      "opacity-50",
      "opacity-75",
      "opacity-100",
      "z-0",
      "z-10",
      "z-20",
      "z-30",
      "z-40",
      "z-50",
      "top-0",
      "top-auto",
      "bottom-0",
      "bottom-auto",
      "left-0",
      "left-auto",
      "right-0",
      "right-auto",
      "inset-0",
      "inset-auto",
      "gap-1",
      "gap-2",
      "gap-3",
      "gap-4",
      "gap-5",
      "gap-6",
      "gap-8",
      "space-x-1",
      "space-x-2",
      "space-x-3",
      "space-x-4",
      "space-y-1",
      "space-y-2",
      "space-y-3",
      "space-y-4",
      "overflow-hidden",
      "overflow-visible",
      "overflow-auto",
      "overflow-scroll",
      "cursor-pointer",
      "cursor-default",
      "cursor-not-allowed",
      "transition",
      "transition-all",
      "duration-100",
      "duration-200",
      "duration-300",
      "hover:bg-blue-500",
      "hover:text-white",
      "hover:opacity-100",
      "focus:outline-none",
      "focus:ring",
      "focus:ring-2",
      "focus:ring-blue-500",
      "active:bg-blue-600",
      "disabled:opacity-50",
      "sm:",
      "md:",
      "lg:",
      "xl:",
      "2xl:",
      "dark:bg-gray-800",
      "dark:text-white",
      "dark:border-gray-700",
    ]

    const completionItems: vscode.CompletionItem[] = commonClasses.map((className) => {
      const item = new vscode.CompletionItem(className, vscode.CompletionItemKind.Property)
      item.insertText = className
      item.detail = "Tailwind class"
      return item
    })

    return new vscode.CompletionList(completionItems, false)
  }
}
