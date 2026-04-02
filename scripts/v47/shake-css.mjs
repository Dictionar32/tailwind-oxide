#!/usr/bin/env node
/**
 * tw shake <css-file> [--classes-from <source-dir>] [--json]
 *
 * Tree-shake CSS: remove rules whose selector class is not used in source.
 * Uses Rust scanner when available, JS regex fallback otherwise.
 *
 * Output (JSON to stdout):
 *   { cssFile, usedClassCount, originalRules, keptRules, removedRules,
 *     originalBytes, finalBytes, savedBytes, savedPercent }
 *
 * Side-effect: overwrites <css-file> with shaken output.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const cssFile = args[0]
if (!cssFile) {
  console.error('Usage: tw shake <css-file> [--classes-from <source-dir>]')
  process.exit(1)
}

const fromIdx = args.indexOf('--classes-from')
const sourceDir = fromIdx !== -1 ? args[fromIdx + 1] : process.cwd()
const jsonFlag  = args.includes('--json')

const cssAbs = path.resolve(process.cwd(), cssFile)
if (!fs.existsSync(cssAbs)) {
  console.error(`CSS file not found: ${cssAbs}`)
  process.exit(1)
}

// ── Step 1: Extract used classes via Rust scanner ─────────────────────────────
const usedClasses = new Set()

let scanWorkspace = null
try {
  scanWorkspace = require('@tailwind-styled/scanner').scanWorkspace
} catch {
  try {
    scanWorkspace = require(path.resolve(__dirname, '../../packages/scanner/dist/index.cjs')).scanWorkspace
  } catch {}
}

const sourceDirAbs = path.resolve(process.cwd(), sourceDir)

if (scanWorkspace) {
  try {
    // Redirect scanner logs to stderr to keep stdout clean for JSON output
    const origLog = console.log
    const origWarn = console.warn
    const origDebug = console.debug
    console.log = (...args) => process.stderr.write(args.join(' ') + '\n')
    console.warn = (...args) => process.stderr.write(args.join(' ') + '\n')
    console.debug = (...args) => process.stderr.write(args.join(' ') + '\n')
    const result = scanWorkspace(sourceDirAbs)
    console.log = origLog
    console.warn = origWarn
    console.debug = origDebug
    for (const cls of result.uniqueClasses) usedClasses.add(cls)
  } catch { /* fall through to JS */ }
}

if (usedClasses.size === 0) {
  // JS regex fallback
  const exts = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.html']
  function scanDir(d) {
    if (!fs.existsSync(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!['node_modules', '.next', 'dist', '.git', 'out', '.turbo'].includes(e.name))
          scanDir(path.join(d, e.name))
      } else if (exts.includes(path.extname(e.name))) {
        const src = fs.readFileSync(path.join(d, e.name), 'utf8')
        const matches = src.match(/["'`\s]([a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)*(?:\/\d+)?)/g) || []
        for (const m of matches) {
          const cls = m.trim().replace(/^["'`\s]+|["'`\s]+$/g, '')
          if (cls.length >= 2) usedClasses.add(cls)
        }
      }
    }
  }
  scanDir(sourceDirAbs)
}

// ── Step 2: Parse CSS into atomic rule blocks ─────────────────────────────────
const css = fs.readFileSync(cssAbs, 'utf8')
const originalBytes = css.length

// Extract @-rules first (always keep: @layer, @media, @keyframes, etc.)
const atRuleRe = /@[^{]+\{(?:[^{}]*(?:\{[^}]*\})?)*\}/g
const atRules = []
let atM
while ((atM = atRuleRe.exec(css)) !== null) atRules.push(atM[0])

// Match: .selector { ... } — selector must be a single Tailwind-like class
const ruleRe = /\.([\w:[\]./\\!@#-]+)\s*\{[^}]*\}/g
const allRules = []
let m
while ((m = ruleRe.exec(css)) !== null) {
  allRules.push({ full: m[0], selector: m[1] })
}

// ── Step 3: Filter kept rules (preserve @-rules always) ───────────────────────
const keptRules = allRules.filter(r => usedClasses.has(r.selector))
const removedRules = allRules.length - keptRules.length

const shaken = [...atRules, ...keptRules.map(r => r.full)].join('\n')
const finalBytes = shaken.length
const savedBytes = originalBytes - finalBytes
const savedPercent = originalBytes > 0
  ? Number(((savedBytes / originalBytes) * 100).toFixed(1))
  : 0

// ── Step 4: Overwrite CSS file ────────────────────────────────────────────────
fs.writeFileSync(cssAbs, shaken, 'utf8')

// ── Step 5: Output JSON ───────────────────────────────────────────────────────
const output = {
  cssFile: cssAbs,
  usedClassCount: usedClasses.size,
  originalRules: allRules.length,
  keptRules: keptRules.length,
  removedRules,
  originalBytes,
  finalBytes,
  savedBytes,
  savedPercent,
}

console.log(JSON.stringify(output))
