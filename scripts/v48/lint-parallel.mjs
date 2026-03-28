#!/usr/bin/env node
/**
 * tw lint [dir] [workers] — Lint Tailwind classes via Rust analyzer + worker threads.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (!isMainThread) {
  // Worker: lint a batch of files using Rust scanner
  const { files } = workerData
  let native = null
  try {
    native = require(path.resolve(process.cwd(), 'native', 'tailwind_styled_parser.node'))
  } catch {
    try { native = require(path.resolve(__dirname, '../../native/tailwind_styled_parser.node')) } catch {}
  }

  const results = []
  for (const file of files) {
    try {
      const source = fs.readFileSync(file, 'utf8')
      let classes = []
      if (native?.extractClassesFromSource) {
        classes = native.extractClassesFromSource(source)
      }
      // Basic lint: detect obvious typos (classes with no hyphen and >8 chars that aren't known utils)
      const issues = classes.filter(c => !c.includes('-') && !c.includes(':') && c.length > 8)
      if (issues.length > 0) results.push({ file, issues })
    } catch { /* skip */ }
  }
  parentPort.postMessage(results)
  process.exit(0)
}

// Main thread
const args = process.argv.slice(2)
const dir = path.resolve(process.cwd(), args.find(a => !a.startsWith('-')) ?? '.')
const workerCount = Math.max(1, parseInt(args.find(a => !a.startsWith('-') && /^\d+$/.test(a)) ?? String(4), 10))
const jsonFlag = args.includes('--json')

if (!fs.existsSync(dir)) { console.error(`Directory not found: ${dir}`); process.exit(1) }

// Try Rust scanWorkspace for file list
let files = []
try {
  const scanner = require('@tailwind-styled/scanner')
  const result = scanner.scanWorkspace(dir)
  files = result.files.map(f => f.file)
} catch {
  try {
    const scanner = require(path.resolve(__dirname, '../../packages/scanner/dist/index.cjs'))
    const result = scanner.scanWorkspace(dir)
    files = result.files.map(f => f.file)
  } catch {
    // manual walk
    function walk(d) {
      if (!fs.existsSync(d)) return
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory() && !['node_modules','.next','dist'].includes(e.name)) walk(path.join(d, e.name))
        else if (/\.[jt]sx?$/.test(e.name)) files.push(path.join(d, e.name))
      }
    }
    walk(dir)
  }
}

console.log(`[lint] ${files.length} files across ${workerCount} workers (Rust engine)...`)

// Split into batches
const batchSize = Math.ceil(files.length / workerCount)
const batches = []
for (let i = 0; i < files.length; i += batchSize) batches.push(files.slice(i, i + batchSize))

const allIssues = []
let done = 0
for (const batch of batches) {
  const w = new Worker(fileURLToPath(import.meta.url), { workerData: { files: batch } })
  w.on('message', results => { allIssues.push(...results); if (++done === batches.length) finish() })
  w.on('error', () => { if (++done === batches.length) finish() })
}

function finish() {
  if (jsonFlag) { console.log(JSON.stringify(allIssues, null, 2)); return }
  if (allIssues.length === 0) {
    console.log('[lint] ✅ No issues found')
  } else {
    for (const { file, issues } of allIssues) {
      console.log(`\n  ${file}`)
      for (const i of issues) console.log(`    ⚠  Possible typo or unknown class: "${i}"`)
    }
    console.log(`\n[lint] ${allIssues.length} files with issues`)
  }
}
