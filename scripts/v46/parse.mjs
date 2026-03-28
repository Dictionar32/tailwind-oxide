#!/usr/bin/env node
/**
 * tw parse <file> — Real Oxc AST class extractor (v4.6 upgraded)
 * Sekarang menggunakan oxcExtractClasses dari Rust native binary.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const file = process.argv[2]
const jsonFlag = !process.argv.includes('--pretty')
if (!file) { console.error('Usage: tw parse <file> [--json]'); process.exit(1) }

const t0 = Date.now()
const abs = path.resolve(process.cwd(), file)
if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); process.exit(1) }

const source = fs.readFileSync(abs, 'utf8')
const filename = path.basename(abs)

// Load Rust native
let native = null
for (const c of [
  path.resolve(process.cwd(), 'native/tailwind_styled_parser.node'),
  path.resolve(__dirname, '../../native/tailwind_styled_parser.node'),
]) {
  try { native = require(c); break } catch {}
}

let result
if (native?.oxcExtractClasses) {
  // Rust Oxc + regex hybrid
  result = native.oxcExtractClasses(source, filename)
  result.engine = 'rust-oxc'
} else if (native?.extractClassesFromSource) {
  // Rust regex fallback
  const classes = native.extractClassesFromSource(source)
  result = { classes, componentNames: [], hasTwUsage: classes.length > 0, hasUseClient: false, imports: [], engine: 'rust-regex' }
} else {
  // Pure JS fallback
  const classes = []
  const re = /\btw(?:\.server)?\.(?:\w+)`([^`]*)`/g
  const cn = /className=["']([^"']+)["']/g
  let m
  while ((m = re.exec(source)) !== null) classes.push(...m[1].split(/\s+/).filter(Boolean))
  while ((m = cn.exec(source)) !== null) classes.push(...m[1].split(/\s+/).filter(Boolean))
  result = { classes: [...new Set(classes)], componentNames: [], hasTwUsage: source.includes('tw.'), hasUseClient: false, imports: [], engine: 'js-fallback' }
}

if (jsonFlag) {
  // JSON output (default) — format yang diharapkan oleh test suite
  const output = {
    classes: result.classes,
    classCount: result.classes.length,
    componentNames: result.componentNames ?? [],
    hasTwUsage: result.hasTwUsage ?? false,
    hasUseClient: result.hasUseClient ?? false,
    imports: result.imports ?? [],
    engine: result.engine ?? 'js-fallback',
    // Fields yang diharapkan test suite
    mode: result.engine?.includes('rust') ? 'oxc-parser' : result.engine?.includes('regex') ? 'regex-fallback' : 'regex-fallback',
    parseMs: parseFloat((Date.now() - t0).toFixed(2)),
    file: abs,
  }
  console.log(JSON.stringify(output, null, 2))
} else {
  // Human-readable output (--pretty flag)
  console.log(`\n📄 ${filename} [${result.engine}]`)
  console.log(`   Classes (${result.classes.length}): ${result.classes.slice(0,10).join(', ')}${result.classes.length > 10 ? '...' : ''}`)
  if (result.componentNames?.length) console.log(`   Components: ${result.componentNames.join(', ')}`)
  if (result.hasUseClient) console.log(`   ✓ "use client" directive`)
  if (result.imports?.length) console.log(`   Imports: ${result.imports.join(', ')}`)
}
