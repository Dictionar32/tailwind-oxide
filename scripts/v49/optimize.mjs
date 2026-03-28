#!/usr/bin/env node
/**
 * tw optimize <file> — Compile-time CSS optimization via Rust (v4.9 upgraded)
 * Menggunakan Rust: parse_classes (dedup+sort), compile_css (static eval)
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const constantFolding = args.includes('--constant-folding')
const dedup = args.includes('--dedup') || true  // default on
const writeFlag = args.includes('--write')

if (!file) {
  console.error('Usage: tw optimize <file> [--constant-folding] [--dedup] [--write]')
  process.exit(1)
}

const abs = path.resolve(process.cwd(), file)
if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); process.exit(1) }

let native = null
for (const c of [
  path.resolve(process.cwd(), 'native/tailwind_styled_parser.node'),
  path.resolve(__dirname, '../../native/tailwind_styled_parser.node'),
]) { try { native = require(c); break } catch {} }

const source = fs.readFileSync(abs, 'utf8')
let result = source
let stats = { deduped: 0, compiled: 0, savedBytes: 0 }

// 1. Dedup + sort classes via Rust parse_classes
if (dedup && native?.parseClasses) {
  const classRe = /\btw(?:\.server)?\.(?:\w+)`([^`]*)`/g
  result = result.replace(classRe, (full, content) => {
    if (content.includes('${')) return full
    const parsed = native.parseClasses(content)
    if (!parsed?.length) return full
    const seen = new Set()
    const deduped = parsed
      .filter(p => !seen.has(p.raw) && seen.add(p.raw))
      .sort((a, b) => a.variants.length - b.variants.length || a.raw.localeCompare(b.raw))
      .map(p => p.raw).join(' ')
    if (deduped !== content.trim()) stats.deduped++
    return full.replace(content, ' ' + deduped + ' ')
  })
}

// 2. Constant folding: hapus ternary yang selalu sama
if (constantFolding) {
  // Pattern: condition ? "same-classes" : "same-classes" → "same-classes"
  const ternaryRe = /\(([^)]+)\)\s*\?\s*["']([^"']+)["']\s*:\s*["']\2["']/g
  result = result.replace(ternaryRe, (_, _cond, cls) => {
    stats.compiled++
    return `"${cls}"`
  })
}

// 3. Pre-compile static classes ke CSS atomic (jika --compile flag)
if (args.includes('--compile') && native?.compileCss) {
  const allClasses = new Set()
  const re = /\btw(?:\.server)?\.(?:\w+)`([^`]*)`/g
  let m
  while ((m = re.exec(result)) !== null) {
    if (!m[1].includes('${')) m[1].split(/\s+/).filter(Boolean).forEach(c => allClasses.add(c))
  }
  if (allClasses.size > 0) {
    const cssResult = native.compileCss([...allClasses], null)
    stats.compiled += cssResult.resolvedClasses.length
    // Prepend CSS comment for SSR injection
    result = `// @tw-precompiled-css\n// ${JSON.stringify(cssResult.css.slice(0, 200))}...\n` + result
  }
}

const saved = source.length - result.length
stats.savedBytes = saved

const engine = native?.parseClasses ? 'Rust' : 'JS'
console.log(`[optimize] ${path.basename(abs)} [${engine}]`)
console.log(`  Classes deduped:    ${stats.deduped}`)
console.log(`  Branches folded:    ${stats.compiled}`)
console.log(`  Bytes saved:        ${saved >= 0 ? saved : 0}`)

if (writeFlag) {
  fs.writeFileSync(abs, result)
  console.log(`  Written in-place: ${abs}`)
} else {
  const out = abs.replace(/(\.[^.]+)$/, '.optimized$1')
  fs.writeFileSync(out, result)
  console.log(`  Written: ${out}`)
}
