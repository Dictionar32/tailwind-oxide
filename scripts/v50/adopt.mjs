#!/usr/bin/env node
/**
 * tw adopt <feature> [project] — Incremental feature adoption (v5.0 upgraded)
 * Menggunakan Rust scanner untuk analisis compatibility.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const [feature, projectArg] = process.argv.slice(2)
const dryRun = process.argv.includes('--dry-run')
const jsonFlag = process.argv.includes('--json')

const FEATURES = ['route-css','atomic-css','static-variants','oxc-parser','vue-adapter','svelte-adapter','rust-compiler']
if (!feature || !FEATURES.includes(feature)) {
  console.error(`Usage: tw adopt <feature> [project]\nFeatures: ${FEATURES.join(', ')}`)
  process.exit(1)
}

const root = path.resolve(process.cwd(), projectArg ?? '.')

// Load Rust scanner
let native = null, scanner = null
for (const c of [
  path.resolve(process.cwd(), 'native/tailwind_styled_parser.node'),
  path.resolve(__dirname, '../../native/tailwind_styled_parser.node'),
]) { try { native = require(c); break } catch {} }
for (const c of [
  path.resolve(process.cwd(), 'packages/scanner/dist/index.cjs'),
  path.resolve(__dirname, '../../packages/scanner/dist/index.cjs'),
]) { try { scanner = require(c); break } catch {} }

console.log(`\n🔍 Analyzing project for '${feature}' adoption...`)
console.log(`   Root: ${root}`)
console.log(`   Engine: ${native ? 'Rust' : 'JS fallback'}`)

// Scan dengan Rust
let scanResult = null
try {
  scanResult = native?.scanWorkspace?.(root, null)
    ?? scanner?.scanWorkspace?.(root)
    ?? { files: [], totalFiles: 0, uniqueClasses: [] }
} catch { scanResult = { files: [], totalFiles: 0, uniqueClasses: [] } }

const report = {
  feature,
  project: root,
  engine: native ? 'rust' : 'js',
  scannedFiles: scanResult.totalFiles,
  uniqueClasses: (scanResult.uniqueClasses ?? []).length,
  compatibility: {},
  steps: [],
  warnings: [],
}

// Feature-specific analysis
switch (feature) {
  case 'oxc-parser':
    report.compatibility.ready = native?.oxcExtractClasses != null
    report.compatibility.binaryAvailable = native != null
    report.steps = [
      'Pastikan native binary tersedia: ls native/tailwind_styled_parser.node',
      'Set TWS_NO_NATIVE=0 di .env',
      'Gunakan scanSourceOxc() dari @tailwind-styled/scanner',
    ]
    if (!native) report.warnings.push('Native binary tidak ditemukan — build dulu dengan: cd native && cargo build --release')
    break

  case 'rust-compiler':
    report.compatibility.ready = native?.compileCss != null
    report.steps = [
      'Import compileCssFromClasses dari @tailwind-styled/compiler',
      'Ganti CSS generation dengan: compileCssFromClasses(classes)',
      'Dukung 200+ class mappings + color palette 22×11 shade',
    ]
    // Cek berapa kelas yang bisa di-compile
    if (native?.compileCss && scanResult.uniqueClasses?.length > 0) {
      const sample = scanResult.uniqueClasses.slice(0, 50)
      const compiled = native.compileCss(sample, null)
      const pct = ((compiled.resolvedClasses.length / sample.length) * 100).toFixed(1)
      report.compatibility.resolveRate = pct + '%'
      report.compatibility.sample = `${compiled.resolvedClasses.length}/${sample.length} classes dapat di-compile ke CSS`
    }
    break

  case 'atomic-css':
    report.steps = [
      'Tambahkan atomic: true ke opsi bundler plugin',
      'Setiap kelas akan menghasilkan 1 CSS rule',
      'Direkomendasikan untuk production build',
    ]
    report.compatibility.ready = true
    break

  case 'route-css':
    const hasPages = fs.existsSync(path.join(root, 'pages')) || fs.existsSync(path.join(root, 'app'))
    report.compatibility.hasRoutingDir = hasPages
    report.compatibility.ready = hasPages
    report.steps = [
      'Aktifkan routeCss: true di Next.js plugin config',
      'Jalankan tw split untuk generate per-route CSS',
    ]
    if (!hasPages) report.warnings.push('Tidak ditemukan folder pages/ atau app/ — mungkin bukan Next.js project')
    break

  default:
    report.compatibility.ready = true
    report.steps = [`Adopsi ${feature} — ikuti panduan di dokumentasi`]
}

if (jsonFlag) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`\n📦 Feature: ${feature}`)
  console.log(`   Files scanned:    ${report.scannedFiles}`)
  console.log(`   Unique classes:   ${report.uniqueClasses}`)
  console.log(`   Ready:            ${report.compatibility.ready ? '✅' : '⚠️  Perlu setup'}`)
  if (report.compatibility.resolveRate) console.log(`   Resolve rate:     ${report.compatibility.resolveRate}`)
  if (report.compatibility.sample)     console.log(`   Sample:           ${report.compatibility.sample}`)

  if (report.steps.length) {
    console.log(`\n📋 Steps:`)
    report.steps.forEach((s, i) => console.log(`   ${i+1}. ${s}`))
  }
  if (report.warnings.length) {
    console.log(`\n⚠️  Warnings:`)
    report.warnings.forEach(w => console.log(`   • ${w}`))
  }
  if (dryRun) console.log(`\n   [dry-run mode — tidak ada perubahan yang dibuat]`)
}
