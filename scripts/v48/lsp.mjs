#!/usr/bin/env node
/**
 * tw lsp — Language Server Protocol server untuk tailwind-styled
 *
 * Menggunakan vscode-languageserver-node untuk komunikasi LSP.
 * Fallback ke stdio mode jika tidak ada koneksi.
 *
 * Features yang diimplementasikan:
 *   - textDocument/hover → show class info on hover
 *   - textDocument/completion → class name autocomplete
 *   - textDocument/diagnostics → unknown class warnings
 *
 * Features Sprint 7+ (next increment):
 *   - Go to definition untuk styled components
 *   - Rename symbol (refactor class names)
 *   - Code actions (extract to component)
 */

import { createConnection, TextDocuments, ProposedFeatures,
         TextDocumentSyncKind, CompletionItemKind, DiagnosticSeverity }
  from 'vscode-languageserver/node.js'
import { TextDocument } from 'vscode-languageserver-textdocument'

// ─── Check dependencies ──────────────────────────────────────────────────────
async function checkDeps() {
  try {
    await import('vscode-languageserver/node.js')
    return true
  } catch {
    console.error('[tw lsp] Missing dependency: vscode-languageserver')
    console.error('[tw lsp] Install with: npm install vscode-languageserver vscode-languageserver-textdocument')
    console.error('[tw lsp] For now, running in stub mode...')
    return false
  }
}

// --help or smoke test mode
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: tw lsp")
  console.log("Run with --stdio to start the server transport")
  console.log("Requires: npm install vscode-languageserver vscode-languageserver-textdocument")
  process.exit(0)
}

const wantsStdio = process.argv.includes("--stdio") || process.argv.includes("--node-ipc")
if (!wantsStdio) {
  console.log("tw lsp: stub mode (pass --stdio to run full LSP server)")
  process.exit(0)
}

const hasDeps = await checkDeps()
if (!hasDeps) {
  // Stub mode — stays alive untuk tidak crash vscode extension
  // In smoke/test mode (no stdin TTY), exit immediately
  if (!process.stdin.isTTY) {
    console.log('tw lsp: stub mode (no deps — install vscode-languageserver for full support)')
    process.exit(0)
  }
  console.log('tw lsp: running in stub mode (install vscode-languageserver for full support)')
  process.stdin.resume()
  process.on('SIGTERM', () => process.exit(0))
  process.on('SIGINT', () => process.exit(0))
  setInterval(() => {}, 60_000)
}

// ─── Known Tailwind classes (minimal set untuk demo) ────────────────────────
// Dalam implementasi penuh ini akan di-generate dari Tailwind config
const COMMON_CLASSES = [
  // spacing
  ...['p','px','py','pt','pr','pb','pl','m','mx','my','mt','mr','mb','ml'].flatMap(p =>
    ['0','1','2','3','4','5','6','7','8','9','10','11','12','14','16','20','24','28','32','36','40','48','56','64','72','80','96'].map(v => `${p}-${v}`)
  ),
  // colors
  ...['red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose','slate','gray','zinc','neutral','stone'].flatMap(c =>
    ['50','100','200','300','400','500','600','700','800','900','950'].flatMap(v => [
      `bg-${c}-${v}`, `text-${c}-${v}`, `border-${c}-${v}`, `ring-${c}-${v}`
    ])
  ),
  // layout
  'flex','flex-col','flex-row','flex-wrap','flex-nowrap','flex-1','flex-auto','flex-none',
  'grid','grid-cols-1','grid-cols-2','grid-cols-3','grid-cols-4',
  'block','inline','inline-block','hidden',
  'relative','absolute','fixed','sticky',
  'w-full','w-auto','h-full','h-auto','h-screen','w-screen',
  // typography
  'font-thin','font-light','font-normal','font-medium','font-semibold','font-bold','font-extrabold',
  'text-xs','text-sm','text-base','text-lg','text-xl','text-2xl','text-3xl','text-4xl',
  'text-left','text-center','text-right','text-justify',
  // effects
  'rounded','rounded-sm','rounded-md','rounded-lg','rounded-xl','rounded-full',
  'shadow','shadow-sm','shadow-md','shadow-lg','shadow-xl',
  'opacity-0','opacity-25','opacity-50','opacity-75','opacity-100',
  'transition','transition-all','duration-150','duration-200','duration-300',
  'hover:opacity-75','hover:scale-105','focus:outline-none','focus:ring-2',
  'dark:bg-gray-900','dark:text-white',
]

// ─── LSP Server ──────────────────────────────────────────────────────────────
const connection = createConnection(ProposedFeatures.all)
const documents = new TextDocuments(TextDocument)

connection.onInitialize((params) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['"', "'", '`', ' '],
      },
      hoverProvider: true,
    },
    serverInfo: { name: 'tailwind-styled-lsp', version: '4.2.0' },
  }
})

// ─── Completion ──────────────────────────────────────────────────────────────
connection.onCompletion((params) => {
  const doc = documents.get(params.textDocument.uri)
  if (!doc) return []

  const text = doc.getText()
  const offset = doc.offsetAt(params.position)

  // Cek apakah cursor ada di dalam class="" / className=""
  const before = text.slice(0, offset)
  const classMatch = before.match(/class(?:Name)?\s*=\s*["'`]([^"'`]*)$/)
  if (!classMatch) return []

  const partial = classMatch[1].split(/\s+/).pop() ?? ''

  return COMMON_CLASSES
    .filter(c => c.startsWith(partial))
    .slice(0, 50)
    .map(c => ({
      label: c,
      kind: CompletionItemKind.Value,
      detail: 'Tailwind CSS class',
      insertText: c,
    }))
})

// ─── Hover ───────────────────────────────────────────────────────────────────
connection.onHover((params) => {
  const doc = documents.get(params.textDocument.uri)
  if (!doc) return null

  const text = doc.getText()
  const offset = doc.offsetAt(params.position)

  // Find word at cursor
  let start = offset, end = offset
  while (start > 0 && /[a-zA-Z0-9_:\/-]/.test(text[start - 1])) start--
  while (end < text.length && /[a-zA-Z0-9_:\/-]/.test(text[end])) end++
  const word = text.slice(start, end)

  if (!COMMON_CLASSES.includes(word)) return null

  return {
    contents: {
      kind: 'markdown',
      value: `**${word}** — Tailwind CSS class\n\n_Hover info powered by tailwind-styled LSP_`,
    },
  }
})

// ─── Diagnostics (unknown classes) ───────────────────────────────────────────
const classSet = new Set(COMMON_CLASSES)

function validateDocument(doc) {
  const diagnostics = []
  const text = doc.getText()
  const re = /class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g
  let m
  while ((m = re.exec(text)) !== null) {
    const classes = m[1].split(/\s+/).filter(Boolean)
    for (const cls of classes) {
      // Strip variants (hover:, dark:, md:, etc.)
      const base = cls.replace(/^(?:[a-z]+:)+/, '')
      if (base && !classSet.has(cls) && !classSet.has(base)) {
        const idx = text.indexOf(cls, m.index)
        diagnostics.push({
          severity: DiagnosticSeverity.Information,
          range: {
            start: doc.positionAt(idx),
            end: doc.positionAt(idx + cls.length),
          },
          message: `'${cls}' — not in known Tailwind classes (may be custom or dynamic)`,
          source: 'tailwind-styled',
        })
      }
    }
  }
  return diagnostics
}

documents.onDidChangeContent((change) => {
  const diagnostics = validateDocument(change.document)
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics })
})

documents.listen(connection)
connection.listen()

console.error('[tw lsp] tailwind-styled LSP server running on stdio')
