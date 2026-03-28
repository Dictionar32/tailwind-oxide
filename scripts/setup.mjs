#!/usr/bin/env node
/**
 * tailwind-styled-v4 — Setup Script
 *
 * Deteksi environment, install dependencies yang diperlukan,
 * dan validasi semua tool siap digunakan.
 *
 * Usage:
 *   node scripts/setup.mjs              # full setup
 *   node scripts/setup.mjs --check      # cek saja, tidak install
 *   node scripts/setup.mjs --minimal    # hanya core deps
 *   node scripts/setup.mjs --all        # termasuk oxc + electron + lsp
 */

import { spawnSync, execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const checkOnly = args.has('--check')
const minimal   = args.has('--minimal')
const all       = args.has('--all')

const results = { ok: [], warn: [], fail: [] }

function check(label) { results.ok.push(label) }
function warn(label)  { results.warn.push(label) }
function fail(label)  { results.fail.push(label) }

function run(cmd, opts = {}) {
  const r = spawnSync('sh', ['-c', cmd], { encoding: 'utf8', ...opts })
  return { ok: r.status === 0, stdout: r.stdout?.trim(), stderr: r.stderr?.trim() }
}

function hasPackage(name) {
  const r = run(`node -e "require('${name}')"`, { cwd: process.cwd() })
  return r.ok
}

function npmInstall(packages, cwd = process.cwd(), dev = false, optional = false) {
  if (checkOnly) return false
  const flag = dev ? '--save-dev' : optional ? '--save-optional' : '--save'
  const r = spawnSync('npm', ['install', flag, ...packages], { cwd, stdio: 'inherit' })
  return r.status === 0
}

console.log('\n🔧 tailwind-styled-v4 Setup\n')

// ── 1. Node.js version ────────────────────────────────────────────────────────
const nodeVer = process.version
const major = parseInt(nodeVer.slice(1))
if (major >= 18) {
  check(`Node.js ${nodeVer} ✓`)
} else {
  fail(`Node.js ${nodeVer} — need >= 18 (install from nodejs.org)`)
}

// ── 2. Core monorepo deps ─────────────────────────────────────────────────────
console.log('📦 Core dependencies...')
if (!fs.existsSync('node_modules')) {
  if (!checkOnly) {
    console.log('   Running npm install...')
    spawnSync('npm', ['install'], { stdio: 'inherit' })
  }
  warn('node_modules missing — run: npm install')
} else {
  check('node_modules present')
}

// ── 3. Oxc tools (optional, improves tw parse/transform/minify) ───────────────
console.log('\n⚡ Oxc tools (optional — improves parse/transform/minify performance)...')
const oxcPackages = ['oxc-parser', 'oxc-transform', 'oxc-minify']
const missingOxc = oxcPackages.filter(p => !hasPackage(p))

if (missingOxc.length === 0) {
  check('oxc-parser, oxc-transform, oxc-minify ✓')
} else {
  warn(`Missing oxc tools: ${missingOxc.join(', ')} (fallback available)`)
  if ((all || !minimal) && !checkOnly) {
    console.log(`   Installing ${missingOxc.join(' ')}...`)
    const ok = npmInstall(missingOxc, process.cwd(), false, true)
    ok ? check('oxc tools installed') : warn('oxc install failed — fallback will be used')
  } else {
    console.log(`   Skip (run with --all to install): npm install --save-optional ${missingOxc.join(' ')}`)
  }
}

// ── 4. LSP server deps ────────────────────────────────────────────────────────
console.log('\n🔍 LSP server (optional — enables tw lsp)...')
const lspPackages = ['vscode-languageserver', 'vscode-languageserver-textdocument']
const missingLsp = lspPackages.filter(p => !hasPackage(p))

if (missingLsp.length === 0) {
  check('vscode-languageserver ✓')
} else {
  warn('vscode-languageserver not installed — tw lsp will run in stub mode')
  if (all && !checkOnly) {
    console.log('   Installing vscode-languageserver...')
    const ok = npmInstall(lspPackages, process.cwd(), false, true)
    ok ? check('LSP deps installed') : warn('LSP install failed')
  } else {
    console.log(`   To enable: npm install --save-optional ${lspPackages.join(' ')}`)
    console.log('   Or run: node scripts/setup.mjs --all')
  }
}

// ── 5. @tailwindcss/postcss (for tw split --full) ────────────────────────────
console.log('\n🎨 @tailwindcss/postcss (optional — enables tw split --full)...')
if (hasPackage('@tailwindcss/postcss')) {
  check('@tailwindcss/postcss ✓')
} else {
  warn('@tailwindcss/postcss not installed — tw split will use atomic CSS fallback')
  if ((all || !minimal) && !checkOnly) {
    console.log('   Installing @tailwindcss/postcss...')
    const ok = npmInstall(['@tailwindcss/postcss'], process.cwd(), true)
    ok ? check('@tailwindcss/postcss installed') : warn('@tailwindcss/postcss install failed')
  } else {
    console.log('   To enable: npm install --save-dev @tailwindcss/postcss')
  }
}

// ── 6. Electron (for Studio Desktop) ─────────────────────────────────────────
console.log('\n🖥️  Electron (optional — enables Studio Desktop app)...')
const desktopDir = path.join(process.cwd(), 'packages/studio-desktop')
const electronInstalled = fs.existsSync(path.join(desktopDir, 'node_modules/electron'))

if (electronInstalled) {
  check('electron ✓ (packages/studio-desktop)')
} else {
  warn('electron not installed — Studio Desktop unavailable (web studio works without it)')
  if (all && !checkOnly && fs.existsSync(desktopDir)) {
    console.log('   Installing electron in packages/studio-desktop...')
    const ok = npmInstall(['electron', 'electron-builder', 'electron-updater'], desktopDir, true)
    ok ? check('electron installed') : warn('electron install failed')
  } else {
    console.log('   To enable: cd packages/studio-desktop && npm install')
    console.log('   Or run: node scripts/setup.mjs --all')
  }
}

// ── 7. Redis (for remote cache) ────────────────────────────────────────────────
console.log('\n🗄️  Redis (optional — enables tw cache redis://)...')
const redisCheck = run('redis-cli --version')
if (redisCheck.ok) {
  check(`redis-cli ${redisCheck.stdout.split(' ')[1] ?? ''} ✓`)
} else {
  warn('redis-cli not found — tw cache redis:// unavailable')
  console.log('   To enable: brew install redis  OR  docker run -d -p 6379:6379 redis')
}

// ── 8. AWS CLI (for S3 cache) ─────────────────────────────────────────────────
console.log('\n☁️  AWS CLI (optional — enables tw cache s3://)...')
const awsCheck = run('aws --version')
if (awsCheck.ok) {
  check('aws cli ✓')
} else {
  warn('aws cli not found — tw cache s3:// unavailable')
  console.log('   To enable: https://aws.amazon.com/cli/')
}

// ── 9. Verify key commands work ───────────────────────────────────────────────
console.log('\n🧪 Verifying core commands...')
const cliPath = path.join(process.cwd(), 'packages/cli/dist/index.js')
if (fs.existsSync(cliPath)) {
  const r = run(`node ${cliPath} --help`)
  r.ok ? check('tw CLI available ✓') : fail('tw CLI not working — run: npm run build:packages')
} else {
  warn('packages not built yet — run: npm run build:packages')
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60))
console.log('Setup Summary:')
results.ok.forEach(m =>   console.log(`  ✅ ${m}`))
results.warn.forEach(m => console.log(`  ⚠️  ${m}`))
results.fail.forEach(m => console.log(`  ❌ ${m}`))
console.log('─'.repeat(60))

if (results.fail.length > 0) {
  console.log('\n❌ Setup has errors. Fix above issues before proceeding.\n')
  process.exit(1)
} else if (results.warn.length > 0) {
  console.log('\n⚠️  Setup complete with warnings. Optional features may be limited.')
  console.log('   Run: node scripts/setup.mjs --all  to install all optional deps\n')
} else {
  console.log('\n✅ All setup checks passed!\n')
}
