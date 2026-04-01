import * as vscode from "vscode"
import type { EngineService } from "../services/engineService"

const TAILWIND_CLASS_REGEX =
  /(?<=class[=:]["'`]([^"'`]*?\s+)?)[a-zA-Z][a-zA-Z0-9:/-]*(?=[^"'`]*?["'`])/g
const MAX_CLASSES_TO_SCAN = 500
const DEBOUNCE_DELAY = 300

interface DecorationsMap {
  [documentUri: string]: {
    decorations: vscode.TextEditorDecorationType
    disposables: vscode.Disposable[]
  }
}

const activeDecorations: DecorationsMap = {}
const _state = { debounceTimer: null as NodeJS.Timeout | null }

function extractClassesFromDocument(document: vscode.TextDocument): string[] {
  const text = document.getText()
  const classes = new Set<string>()

  const matches = text.matchAll(TAILWIND_CLASS_REGEX)
  const scan = { count: 0 }

  for (const match of matches) {
    if (scan.count >= MAX_CLASSES_TO_SCAN) {
      break
    }
    if (match[0]) {
      classes.add(match[0])
      scan.count++
    }
  }

  return Array.from(classes)
}

function findClassPositions(document: vscode.TextDocument, className: string): vscode.Range[] {
  const ranges: vscode.Range[] = []
  const text = document.getText()

  const regex = new RegExp(TAILWIND_CLASS_REGEX.source, "g")

  for (const m of text.matchAll(regex)) {
    if (m[0] === className) {
      const startPos = document.positionAt(m.index)
      const endPos = document.positionAt(m.index + m[0].length)
      ranges.push(new vscode.Range(startPos, endPos))
    }
  }

  return ranges
}

async function updateDecorations(
  document: vscode.TextDocument,
  engineService: EngineService
): Promise<void> {
  try {
    const uriString = document.uri.toString()

    if (activeDecorations[uriString]) {
      for (const disposable of activeDecorations[uriString].disposables) {
        disposable.dispose()
      }
      delete activeDecorations[uriString]
    }

    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document.uri.toString() !== uriString) {
      return
    }

    const classes = extractClassesFromDocument(document)

    if (classes.length === 0) {
      return
    }

    const decorations: { range: vscode.Range; message: string }[] = []

    for (const className of classes) {
      const result = await engineService.trace(className)

      if (result?.conflicts && result.conflicts.length > 0) {
        const positions = findClassPositions(document, className)

        const message = result.conflicts
          .map((c) => `.${c.winner} overrides ${c.property}`)
          .join("\n")

        for (const pos of positions) {
          decorations.push({ range: pos, message })
        }
      }
    }

    if (decorations.length === 0) {
      return
    }

    const _hoverMessage = decorations.map((d) => d.message).join("\n\n")

    const decorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: "underline wavy #D97706",
    } as vscode.DecorationRenderOptions)

    const decorationRanges = decorations.map((d) => d.range)

    editor.setDecorations(decorationType, decorationRanges)

    activeDecorations[uriString] = {
      decorations: decorationType,
      disposables: [decorationType],
    }
  } catch (error) {
    console.error("[InlineDecorationProvider] Error updating decorations:", error)
  }
}

function debounceUpdate(document: vscode.TextDocument, engineService: EngineService): void {
  if (_state.debounceTimer) {
    clearTimeout(_state.debounceTimer)
  }

  _state.debounceTimer = setTimeout(() => {
    updateDecorations(document, engineService)
    _state.debounceTimer = null
  }, DEBOUNCE_DELAY)
}

export function createInlineDecorationProvider(engineService: EngineService): void {
  const _changeListener = vscode.workspace.onDidChangeTextDocument(
    (event: vscode.TextDocumentChangeEvent) => {
      try {
        const document = event.document

        if (!document) {
          return
        }

        const languageId = document.languageId
        const validLanguages = [
          "html",
          "javascript",
          "javascriptreact",
          "typescript",
          "typescriptreact",
          "vue",
          "svelte",
        ]

        if (!validLanguages.includes(languageId)) {
          return
        }

        if (document.uri.scheme === "git") {
          return
        }

        if (document.getText().length > 500000) {
          console.log("[InlineDecorationProvider] Skipping large file")
          return
        }

        debounceUpdate(document, engineService)
      } catch (error) {
        console.error("[InlineDecorationProvider] Error handling document change:", error)
      }
    }
  )

  const _visibleTextEditorsChangeListener = vscode.window.onDidChangeVisibleTextEditors(
    (editors: readonly vscode.TextEditor[]) => {
      try {
        for (const editor of editors) {
          const document = editor.document

          if (document) {
            const languageId = document.languageId
            const validLanguages = [
              "html",
              "javascript",
              "javascriptreact",
              "typescript",
              "typescriptreact",
              "vue",
              "svelte",
            ]

            if (validLanguages.includes(languageId)) {
              debounceUpdate(document, engineService)
            }
          }
        }
      } catch (error) {
        console.error("[InlineDecorationProvider] Error handling visible editors change:", error)
      }
    }
  )

  const initialEditors = vscode.window.visibleTextEditors
  for (const editor of initialEditors) {
    const document = editor.document

    if (document) {
      const languageId = document.languageId
      const validLanguages = [
        "html",
        "javascript",
        "javascriptreact",
        "typescript",
        "typescriptreact",
        "vue",
        "svelte",
      ]

      if (validLanguages.includes(languageId)) {
        debounceUpdate(document, engineService)
      }
    }
  }
}
