/**
 * tailwind-styled-v4 — Component Hoister
 *
 * Problem: Component yang didefinisikan di dalam fungsi lain
 * akan direcreate setiap render — sangat buruk untuk performa.
 *
 * BEFORE (buruk):
 *   export default function Page() {
 *     const Box = tw.div`p-4`   ← dibuat ulang tiap render!
 *     return <Box/>
 *   }
 *
 * AFTER (benar):
 *   const Box = tw.div`p-4`    ← module scope, dibuat sekali
 *   export default function Page() {
 *     return <Box/>
 *   }
 *
 * Hoister mendeteksi pola ini dan memindahkan deklarasi ke module scope.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Patterns
// ─────────────────────────────────────────────────────────────────────────────

// Match: const Name = tw.tag`...` atau const Name = tw.tag({...})
// yang ada di dalam function body (indent > 0)
const INDENTED_TW_DECL_RE = /^([ \t]+)(const|let)\s+([A-Z]\w*)\s*=\s*tw\.[\w]+[`(]/gm

// ─────────────────────────────────────────────────────────────────────────────
// Hoist analysis
// ─────────────────────────────────────────────────────────────────────────────

export interface HoistResult {
  code: string
  hoisted: string[]
  warnings: string[]
}

export const hoistComponents = (source: string): HoistResult => {
  const hoisted: string[] = []
  const warnings: string[] = []

  // Cari semua tw declarations yang indented (di dalam function body)
  const indentedDecls: Array<{
    fullMatch: string
    indent: string
    keyword: string
    name: string
    startIndex: number
  }> = []

  const matches = [...source.matchAll(INDENTED_TW_DECL_RE)]
  
  for (const match of matches) {
    const indent = match[1]
    const keyword = match[2]
    const name = match[3]

    // Hanya hoist components (PascalCase), bukan variables biasa
    if (!/^[A-Z]/.test(name)) continue
    // Hanya hoist jika di dalam function (indent > 0)
    if (indent.length === 0) continue

    indentedDecls.push({
      fullMatch: match[0],
      indent,
      keyword,
      name,
      startIndex: match.index,
    })
  }

  if (indentedDecls.length === 0) {
    return { code: source, hoisted: [], warnings: [] }
  }

  // Untuk setiap indented declaration, extract full statement
  // dan pindahkan ke top of file — using reduce to avoid let (Zero Let!)
  const reversedDecls = [...indentedDecls].reverse()
  const hoistedDecls: string[] = []

  const { code: codeAfterRemoval } = reversedDecls.reduce(
    (acc, decl) => {
      const { startIndex, indent, name } = decl

      // Cari end of the tw statement (sampai semicolon atau newline setelah `)`)
      const lineStart = acc.code.lastIndexOf("\n", startIndex) + 1
      const restFromDecl = acc.code.slice(lineStart)

      // Extract full statement — bisa multi-line untuk template literals
      const fullStmt = extractFullStatement(restFromDecl)
      if (!fullStmt) return acc

      // Dedent statement
      const dedented = fullStmt
        .split("\n")
        .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
        .join("\n")
        .trim()

      // Collect for hoisting
      hoistedDecls.unshift(dedented)
      hoisted.push(name)

      warnings.push(
        `[tw-hoist] '${name}' moved to module scope for better performance. ` +
          `Avoid defining tw components inside render functions.`
      )

      // Remove from original position
      return { code: acc.code.slice(0, lineStart) + acc.code.slice(lineStart + fullStmt.length) }
    },
    { code: source }
  )

  // Inject hoisted declarations after imports
  const code = hoistedDecls.length > 0
    ? (() => {
        const insertPoint = findAfterImports(codeAfterRemoval)
        const hoistBlock = `\n${hoistedDecls.join("\n\n")}\n`
        return codeAfterRemoval.slice(0, insertPoint) + hoistBlock + codeAfterRemoval.slice(insertPoint)
      })()
    : codeAfterRemoval

  return { code, hoisted, warnings }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const extractFullStatement = (source: string): string | null => {
  // Match tw template literal statement
  const templateRe = /^[ \t]*(const|let)\s+\w+\s*=\s*tw\.\w+`[^`]*`.*\n?/
  const templateMatch = source.match(templateRe)
  if (templateMatch) return templateMatch[0]

  // Match tw object config statement — may span multiple lines
  const objStart = source.indexOf("tw.")
  if (objStart === -1) return null

  const parenStart = source.indexOf("(", objStart)
  if (parenStart === -1) return null

  // Find balancing parentheses — using reduce over character indices (Zero Let!)
  const findMatchingParen = (start: number): number => {
    const result = Array.from({ length: source.length - start }, (_, k) => start + k).reduce(
      (state, i) => {
        if (state.found) return state
        const depth = state.depth + (source[i] === "(" ? 1 : source[i] === ")" ? -1 : 0)
        if (depth === 0 && source[i] === ")") return { depth: 0, found: true, index: i }
        return { depth, found: false, index: -1 }
      },
      { depth: 0, found: false, index: -1 }
    )
    return result.index
  }

  const endParen = findMatchingParen(parenStart)
  if (endParen === -1) return null

  // Include trailing semicolon and newline
  const end = source.indexOf("\n", endParen)
  return source.slice(0, end === -1 ? endParen + 1 : end + 1)
}

const findAfterImports = (source: string): number => {
  const lines = source.split("\n")
  
  const lastImportLine = lines.reduce((lastIdx, line, idx) => {
    const trimmed = line.trim()
    if (
      trimmed.startsWith("import ") ||
      trimmed.startsWith("'use client'") ||
      trimmed.startsWith('"use client"')
    ) {
      return idx
    }
    return lastIdx
  }, 0)

  // Return character index after last import line
  return lines.slice(0, lastImportLine + 1).join("\n").length + 1
}