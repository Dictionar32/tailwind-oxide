#!/usr/bin/env node
/**
 * tw minify <file> — Minify/normalize Tailwind classes via Rust parse_classes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const file = process.argv[2]
const writeFlag = process.argv.includes('--write')
if (!file) { console.error('Usage: tw minify <file> [--write]'); process.exit(1) }

const abs = path.resolve(process.cwd(), file)
if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); process.exit(1) }

// Load native binding
let parseClasses = null
try {
  const native = require(path.resolve(process.cwd(), 'native', 'tailwind_styled_parser.node'))
  parseClasses = native.parseClasses
} catch {
  try {
    const native = require(path.resolve(__dirname, '../../native/tailwind_styled_parser.node'))
    parseClasses = native.parseClasses
  } catch { /* JS fallback below */ }
}

// Normalize a class string: deduplicate, sort by variant depth then alpha
function normalizeClasses(raw) {
  if (parseClasses) {
    try {
      const parsed = parseClasses(raw)
      const seen = new Set()
      return parsed
        .filter(p => { if (seen.has(p.raw)) return false; seen.add(p.raw); return true })
        .sort((a, b) => a.variants.length - b.variants.length || a.raw.localeCompare(b.raw))
        .map(p => p.raw)
        .join(' ')
    } catch { /* fall through */ }
  }
  // JS fallback
  const seen = new Set()
  return raw.split(/\s+/).filter(t => t && !seen.has(t) && seen.add(t)).join(' ')
}

const source = fs.readFileSync(abs, 'utf8')

// Replace tw template literals class strings
let result = source
let count = 0
result = result.replace(/\btw(?:\.\w+)?`([^`]*)`/g, (full, content) => {
  const normalized = normalizeClasses(content)
  if (normalized !== content.trim()) count++
  return full.replace(content, ' ' + normalized + ' ')
})
// Replace className="..."
result = result.replace(/className=["']([^"']+)["']/g, (full, content) => {
  const normalized = normalizeClasses(content)
  if (normalized !== content.trim()) count++
  return full.replace(content, normalized)
})

const engine = parseClasses ? 'Rust' : 'JS'
console.log(`[minify] ${path.basename(abs)}: ${count} class strings normalized [${engine}]`)

if (writeFlag) {
  fs.writeFileSync(abs, result, 'utf8')
  console.log(`[minify] Written in-place: ${abs}`)
} else {
  const outFile = abs.replace(/(\.[^.]+)$/, '.minified$1')
  fs.writeFileSync(outFile, result, 'utf8')
  console.log(`[minify] Written: ${outFile}`)
}
