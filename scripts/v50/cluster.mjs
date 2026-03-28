#!/usr/bin/env node
/**
 * tw cluster build [root] [--workers=N] — Distributed build via worker_threads.
 * Each worker uses Rust compiler via runLoaderTransform.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { cpus } from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (!isMainThread) {
  // Worker: compile a batch of files via Rust-first pipeline
  const { files } = workerData
  let runLoaderTransform
  try {
    runLoaderTransform = require('@tailwind-styled/compiler').runLoaderTransform
  } catch {
    try {
      runLoaderTransform = require(
        path.resolve(__dirname, '../../packages/compiler/dist/index.cjs')
      ).runLoaderTransform
    } catch { parentPort.postMessage({ error: 'compiler unavailable' }); process.exit(1) }
  }

  const results = []
  for (const file of files) {
    try {
      const source = fs.readFileSync(file, 'utf8')
      const output = runLoaderTransform({
        filepath: file,
        source,
        options: { hoist: false, incremental: false },
      })
      if (output.changed) {
        results.push({ file, classes: output.classes.length, engine: output.engine })
      }
    } catch (e) {
      results.push({ file, error: e.message })
    }
  }
  parentPort.postMessage({ results })
  process.exit(0)
}

// Main thread
const args = process.argv.slice(2)
const sub     = args[0]
const rootArg = args[1] ?? '.'
const wFlag   = args.find(a => a.startsWith('--workers='))
const nWorkers = wFlag ? parseInt(wFlag.split('=')[1], 10) : Math.max(1, cpus().length - 1)

if (sub !== 'build') {
  console.log('Usage: tw cluster build [root] [--workers=N]')
  process.exit(0)
}

const root = path.resolve(process.cwd(), rootArg)
if (!fs.existsSync(root)) { console.error(`Root not found: ${root}`); process.exit(1) }

// Get file list via Rust scanner
let files = []
try {
  const scanner = require('@tailwind-styled/scanner')
  const result = scanner.scanWorkspace(root)
  files = result.files.map(f => f.file)
} catch {
  try {
    const scanner = require(path.resolve(__dirname, '../../packages/scanner/dist/index.cjs'))
    files = scanner.scanWorkspace(root).files.map(f => f.file)
  } catch {
    function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory() && !['node_modules','.next','dist'].includes(e.name)) walk(path.join(d, e.name))
        else if (/\.[jt]sx?$/.test(e.name)) files.push(path.join(d, e.name))
      }
    }
    walk(root)
  }
}

const t0 = Date.now()
console.log(`[cluster] ${files.length} files, ${nWorkers} workers`)

const batchSize = Math.ceil(files.length / nWorkers)
const batches = []
for (let i = 0; i < files.length; i += batchSize) batches.push(files.slice(i, i + batchSize))

let totalChanged = 0, totalClasses = 0, done = 0
for (const batch of batches) {
  const w = new Worker(fileURLToPath(import.meta.url), { workerData: { files: batch } })
  w.on('message', msg => {
    if (msg.error) { console.error('[cluster] Worker error:', msg.error); return }
    for (const r of msg.results) {
      if (!r.error) { totalChanged++; totalClasses += r.classes }
    }
    if (++done === batches.length) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
      console.log(`[cluster] Done: ${totalChanged}/${files.length} files changed | ${totalClasses} total classes | ${elapsed}s`)
    }
  })
  w.on('error', () => { if (++done === batches.length) console.log('[cluster] Done (with errors)') })
}
