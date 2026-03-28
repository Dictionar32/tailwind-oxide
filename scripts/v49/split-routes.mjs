#!/usr/bin/env node
/**
 * tw split [root] [outDir] — Route-based CSS splitting via Rust scanner.
 * Extracts classes per route file and generates separate CSS chunks.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const [,, rootArg = '.', outDirArg = 'artifacts/route-css'] = process.argv
const root   = path.resolve(process.cwd(), rootArg)
const outDir = path.resolve(process.cwd(), outDirArg)

if (!fs.existsSync(root)) { console.error(`Root not found: ${root}`); process.exit(1) }
fs.mkdirSync(outDir, { recursive: true })

// Load Rust scanner
let scanWorkspace
try {
  scanWorkspace = require('@tailwind-styled/scanner').scanWorkspace
} catch {
  try {
    scanWorkspace = require(path.resolve(__dirname, '../../packages/scanner/dist/index.cjs')).scanWorkspace
  } catch { scanWorkspace = null }
}

if (!scanWorkspace) {
  console.error('[split] scanner not available — build packages/scanner first')
  process.exit(1)
}

console.log(`[split] Scanning ${root} (Rust scanner)...`)
const scan = scanWorkspace(root)
console.log(`[split] ${scan.totalFiles} files, ${scan.uniqueClasses.length} unique classes`)

// Group files by route (Next.js pages/app pattern, or just top-level dir)
const routeMap = new Map()
for (const f of scan.files) {
  const rel = path.relative(root, f.file)
  // Determine route key from file path
  const parts = rel.split(path.sep)
  let routeKey = 'global'
  if (parts[0] === 'pages' || parts[0] === 'app') {
    routeKey = parts.slice(0, 2).join('/').replace(/\.(tsx?|jsx?)$/, '')
  } else if (parts[0] === 'src' && (parts[1] === 'pages' || parts[1] === 'app')) {
    routeKey = parts.slice(1, 3).join('/').replace(/\.(tsx?|jsx?)$/, '')
  }
  if (!routeMap.has(routeKey)) routeMap.set(routeKey, new Set())
  for (const cls of f.classes) routeMap.get(routeKey).add(cls)
}

// Write one manifest file per route
const manifest = {}
for (const [route, classes] of routeMap) {
  const safeName = route.replace(/[/\\:*?"<>|]/g, '_')
  const outFile  = path.join(outDir, `${safeName}.classes.json`)
  const classList = Array.from(classes).sort()
  fs.writeFileSync(outFile, JSON.stringify({ route, classes: classList }, null, 2))
  manifest[route] = classList.length
}

// Write summary manifest
fs.writeFileSync(
  path.join(outDir, '_manifest.json'),
  JSON.stringify({ root, routes: Object.fromEntries(routeMap.entries().map(([r,s]) => [r, s.size])) }, null, 2)
)

console.log(`[split] ${routeMap.size} routes written to ${outDir}`)
for (const [route, count] of Object.entries(manifest)) {
  console.log(`  ${route.padEnd(40)} ${count} classes`)
}
