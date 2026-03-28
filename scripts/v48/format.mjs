#!/usr/bin/env node
/**
 * tw format <file> [--write] — Sort & deduplicate Tailwind classes via Rust.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const file = process.argv[2]
const writeFlag = process.argv.includes('--write')
if (!file) { console.error('Usage: tw format <file> [--write]'); process.exit(1) }

const abs = path.resolve(process.cwd(), file)
if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); process.exit(1) }

let parseClasses = null
try {
  const n = require(path.resolve(process.cwd(), 'native', 'tailwind_styled_parser.node'))
  parseClasses = n.parseClasses
} catch {
  try {
    const n = require(path.resolve(__dirname, '../../native/tailwind_styled_parser.node'))
    parseClasses = n.parseClasses
  } catch {}
}

/** Sort classes: no-variant first (alpha), then by variant depth (alpha within group) */
function formatClasses(raw) {
  if (parseClasses) {
    try {
      const parsed = parseClasses(raw)
      const seen = new Set()
      const unique = parsed.filter(p => { if (seen.has(p.raw)) return false; seen.add(p.raw); return true })
      const noVariant  = unique.filter(p => p.variants.length === 0).sort((a,b) => a.raw.localeCompare(b.raw))
      const withVariant = unique.filter(p => p.variants.length  > 0).sort((a,b) =>
        a.variants.length - b.variants.length || a.raw.localeCompare(b.raw))
      return [...noVariant, ...withVariant].map(p => p.raw).join(' ')
    } catch {}
  }
  // JS fallback: simple dedup + alpha sort
  const seen = new Set()
  return raw.split(/\s+/).filter(t => t && !seen.has(t) && seen.add(t))
    .sort((a, b) => {
      const av = (a.match(/:/g) || []).length
      const bv = (b.match(/:/g) || []).length
      return av - bv || a.localeCompare(b)
    }).join(' ')
}

const source = fs.readFileSync(abs, 'utf8')
let result = source
let changed = 0

// Format className="..." and tw`...` template strings
result = result.replace(/(className|class)=["']([^"']+)["']/g, (full, attr, content) => {
  const formatted = formatClasses(content)
  if (formatted !== content.replace(/\s+/g, ' ').trim()) changed++
  return `${attr}="${formatted}"`
})
result = result.replace(/\btw(?:\.\w+)?`([^`]*)`/g, (full, content) => {
  const formatted = formatClasses(content.trim())
  if (formatted !== content.replace(/\s+/g, ' ').trim()) changed++
  return full.replace(content, ' ' + formatted + ' ')
})

const engine = parseClasses ? 'Rust' : 'JS'
console.log(`[format] ${path.basename(abs)}: ${changed} strings reformatted [${engine}]`)

if (writeFlag) {
  fs.writeFileSync(abs, result, 'utf8')
  console.log(`[format] Written in-place`)
} else {
  console.log(result)
}
