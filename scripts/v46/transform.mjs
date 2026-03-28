#!/usr/bin/env node
/**
 * tw transform <file> [outFile] — Transform source via Rust-first pipeline.
 * Uses compileWithCore → nativeStep (Rust) → jsStep (JS fallback).
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const file = process.argv[2]
const out  = process.argv[3]

if (!file) {
  console.error('Usage: node scripts/v46/transform.mjs <file> [outFile]')
  process.exit(1)
}

const abs = path.resolve(process.cwd(), file)
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`)
  process.exit(1)
}

// Load compiler from built dist
let compileWithCore, runLoaderTransform
try {
  const mod = require('@tailwind-styled/compiler')
  compileWithCore     = mod.compileWithCore
  runLoaderTransform  = mod.runLoaderTransform
} catch {
  // Try relative path (monorepo dev)
  const mod = require(path.resolve(__dirname, '../../packages/compiler/dist/index.cjs'))
  compileWithCore     = mod.compileWithCore
  runLoaderTransform  = mod.runLoaderTransform
}

const source = fs.readFileSync(abs, 'utf8')

const output = runLoaderTransform({
  filepath: abs,
  source,
  options: { hoist: false, incremental: false, verbose: true },
})

const result = output.code
const engine = output.engine ?? 'js'

console.log(`[transform] ${path.basename(abs)} → ${output.classes.length} classes [${engine}]`)

if (out) {
  const outAbs = path.resolve(process.cwd(), out)
  fs.writeFileSync(outAbs, result, 'utf8')
  console.log(`[transform] Written to ${outAbs}`)
} else {
  console.log(result)
}
