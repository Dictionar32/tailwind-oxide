#!/usr/bin/env node
/**
 * tw critical <html-file> <css-file> [--inline] [--out=file]
 * Critical CSS extraction backed by Rust extractClassesFromSource.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const [htmlFile, cssFile] = process.argv.slice(2).filter(a => !a.startsWith('--'))
const inline = process.argv.includes('--inline')
const outArg = process.argv.find(a => a.startsWith('--out='))?.split('=')[1]

if (!htmlFile || !cssFile) {
  console.error('Usage: tw critical <html-file> <css-file> [--inline] [--out=file]')
  process.exit(1)
}

const html = fs.readFileSync(path.resolve(process.cwd(), htmlFile), 'utf8')
const css  = fs.readFileSync(path.resolve(process.cwd(), cssFile),  'utf8')

// Load Rust native for class extraction
let extractClasses = null
try {
  const n = require(path.resolve(process.cwd(), 'native', 'tailwind_styled_parser.node'))
  extractClasses = n.extractClassesFromSource
} catch {
  try {
    const n = require(path.resolve(__dirname, '../../native/tailwind_styled_parser.node'))
    extractClasses = n.extractClassesFromSource
  } catch {}
}

// Extract used classes from HTML
let usedClasses
if (extractClasses) {
  usedClasses = new Set(extractClasses(html))
  console.log(`[critical] Rust: ${usedClasses.size} classes found in HTML`)
} else {
  // JS fallback
  usedClasses = new Set()
  const re = /class(?:Name)?=["']([^"']+)["']/g
  let m
  while ((m = re.exec(html)) !== null) {
    for (const cls of m[1].split(/\s+/)) if (cls) usedClasses.add(cls)
  }
  console.log(`[critical] JS: ${usedClasses.size} classes found in HTML`)
}

// Extract matching CSS rules
const usedIds     = new Set(html.match(/id=["']([^"']+)["']/g)?.map(m => m.replace(/id=["']|["']/g, '')) ?? [])
const usedTags    = new Set(html.match(/<([a-z][a-z0-9]*)/g)?.map(m => m.slice(1)) ?? [])

const criticalRules = []
const cssBlocks = css.split(/(?=\.[a-zA-Z]|#[a-zA-Z]|[a-z][a-z0-9][\s{])/)

for (const block of cssBlocks) {
  const selectorMatch = block.match(/^([.#]?[a-zA-Z0-9_:[\]/\\.!@-]+)\s*\{/)
  if (!selectorMatch) continue
  const sel = selectorMatch[1]

  const keep =
    (sel.startsWith('.') && usedClasses.has(sel.slice(1))) ||
    (sel.startsWith('#') && usedIds.has(sel.slice(1))) ||
    (!sel.startsWith('.') && !sel.startsWith('#') && usedTags.has(sel))

  if (keep) criticalRules.push(block.trim())
}

const critical = criticalRules.join('\n')
const savings = (((css.length - critical.length) / css.length) * 100).toFixed(1)
console.log(`[critical] ${criticalRules.length} rules kept | saved ${savings}% (${((css.length-critical.length)/1024).toFixed(1)}kB)`)

if (inline) {
  const styled = html.replace('</head>', `<style>\n${critical}\n</style>\n</head>`)
  const out = outArg ?? htmlFile.replace(/\.html$/, '.critical.html')
  fs.writeFileSync(path.resolve(process.cwd(), out), styled)
  console.log(`[critical] Inlined into ${out}`)
} else {
  const out = outArg ?? cssFile.replace(/\.css$/, '.critical.css')
  fs.writeFileSync(path.resolve(process.cwd(), out), critical)
  console.log(`[critical] Written to ${out}`)
}
