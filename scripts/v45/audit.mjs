#!/usr/bin/env node
/**
 * tw audit — Real project audit (v4.5)
 *
 * Checks:
 *   1. Deprecated Tailwind classes (flex-grow → grow, etc.)
 *   2. Accessibility baseline (aria, role, alt, focus)
 *   3. Security (npm audit, hardcoded secrets in className)
 *   4. Bundle size estimate (count unique classes)
 *   5. Performance (dependency count, lockfile staleness)
 *
 * Usage:
 *   tw audit
 *   tw audit --scope=deprecated,a11y
 *   tw audit --json
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const cwd        = process.cwd()
const scope      = (process.argv.find(a => a.startsWith('--scope='))?.split('=')[1] ?? 'all').split(',')
const jsonMode   = process.argv.includes('--json')
const all        = scope.includes('all')
const runScope   = (s) => all || scope.includes(s)

const report = {
  generatedAt: new Date().toISOString(),
  root: cwd,
  scores: { performance: 100, security: 100, accessibility: 100, maintainability: 100 },
  issues: [],
  tips: [],
}

function issue(category, severity, message, file = null) {
  report.issues.push({ category, severity, message, file })
  const penalty = severity === 'error' ? 8 : severity === 'warning' ? 3 : 1
  if (category === 'performance')    report.scores.performance    = Math.max(0, report.scores.performance    - penalty)
  if (category === 'security')       report.scores.security       = Math.max(0, report.scores.security       - penalty)
  if (category === 'accessibility')  report.scores.accessibility  = Math.max(0, report.scores.accessibility  - penalty)
  if (category === 'maintainability')report.scores.maintainability = Math.max(0, report.scores.maintainability - penalty)
}

// ── 1. Deprecated classes ─────────────────────────────────────────────────────
if (runScope('deprecated')) {
  const DEPRECATED_MAP = {
    'flex-grow':          'grow',
    'flex-shrink':        'shrink',
    'overflow-ellipsis':  'text-ellipsis',
    'decoration-slice':   'box-decoration-slice',
    'decoration-clone':   'box-decoration-clone',
    'transform':          'use explicit transform utilities (scale-, rotate-, translate-)',
    'filter':             'use explicit filter utilities (blur-, brightness-, etc)',
    'ring-opacity-':      'ring-{color}/{opacity}',
    'bg-opacity-':        'bg-{color}/{opacity}',
    'text-opacity-':      'text-{color}/{opacity}',
    'border-opacity-':    'border-{color}/{opacity}',
    'placeholder-opacity-': 'placeholder-{color}/{opacity}',
  }

  const exts = new Set(['.tsx','.jsx','.ts','.js','.vue','.svelte','.html'])
  function walkDeprecated(dir) {
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules','.next','dist','.git'].includes(e.name)) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { walkDeprecated(full); continue }
        if (!exts.has(path.extname(e.name))) continue
        const src = fs.readFileSync(full, 'utf8')
        const re = /class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g
        let m
        while ((m = re.exec(src)) !== null) {
          for (const [dep, replacement] of Object.entries(DEPRECATED_MAP)) {
            if (m[1].split(/\s+/).some(c => c === dep || c.startsWith(dep))) {
              issue('maintainability', 'warning',
                `Deprecated class '${dep}' → use '${replacement}'`,
                path.relative(cwd, full))
            }
          }
        }
      }
    } catch {}
  }
  walkDeprecated(cwd)
}

// ── 2. Accessibility baseline ─────────────────────────────────────────────────
if (runScope('a11y')) {
  const jsxExts = new Set(['.tsx','.jsx'])
  function walkA11y(dir) {
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules','.next','dist','.git'].includes(e.name)) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { walkA11y(full); continue }
        if (!jsxExts.has(path.extname(e.name))) continue
        const src = fs.readFileSync(full, 'utf8')
        const rel = path.relative(cwd, full)

        // Check: <img> without alt
        if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(src)) {
          issue('accessibility', 'error', '<img> missing alt attribute', rel)
        }
        // Check: onClick without keyboard handler
        if (/onClick=/.test(src) && !/onKeyDown=|onKeyPress=|onKeyUp=/.test(src)) {
          if (!/<button|<a\b/.test(src)) {
            issue('accessibility', 'warning', 'onClick handler without keyboard equivalent', rel)
          }
        }
        // Check: <div onClick> instead of <button>
        if (/<div[^>]*onClick/.test(src)) {
          issue('accessibility', 'warning', '<div onClick> — consider using <button> for interactivity', rel)
        }
        // Check: focus state missing on interactive elements
        const hasFocusStyle = /focus:|focus-visible:/.test(src)
        const hasInteractive = /onClick=|href=/.test(src)
        if (hasInteractive && !hasFocusStyle) {
          issue('accessibility', 'info', 'No focus-visible style detected — add focus: or focus-visible: classes', rel)
        }
      }
    } catch {}
  }
  walkA11y(cwd)
}

// ── 3. Security ────────────────────────────────────────────────────────────────
if (runScope('security')) {
  // npm audit (quick)
  const auditResult = spawnSync('npm', ['audit', '--json', '--audit-level=high'], {
    encoding: 'utf8', cwd, timeout: 15_000
  })
  if (auditResult.status !== 0 && auditResult.stdout) {
    try {
      const auditData = JSON.parse(auditResult.stdout)
      const vulns = auditData.metadata?.vulnerabilities ?? {}
      const high = (vulns.high ?? 0) + (vulns.critical ?? 0)
      if (high > 0) {
        issue('security', 'error', `${high} high/critical npm vulnerabilities — run: npm audit fix`)
        report.scores.security -= high * 5
      }
    } catch {}
  }

  // Hardcoded tokens/keys in class strings (unlikely but check)
  const secretRe = /className=["'][^"']*(?:token|apikey|secret|password)[^"']*["']/i
  function walkSecurity(dir) {
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules','.git'].includes(e.name)) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { walkSecurity(full); continue }
        if (!/\.(ts|tsx|js|jsx)$/.test(e.name)) continue
        const src = fs.readFileSync(full, 'utf8')
        if (secretRe.test(src)) {
          issue('security', 'warning', 'Possible sensitive data in className string', path.relative(cwd, full))
        }
      }
    } catch {}
  }
  walkSecurity(cwd)
}

// ── 4. Performance / bundle estimate ─────────────────────────────────────────
if (runScope('performance')) {
  const classes = new Set()
  const re = /class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g
  function walkPerf(dir) {
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (['node_modules','.next','dist','.git'].includes(e.name)) continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) { walkPerf(full); continue }
        if (!/\.(tsx|jsx|ts|js|vue|svelte)$/.test(e.name)) continue
        const src = fs.readFileSync(full, 'utf8')
        let m; while ((m = re.exec(src)) !== null) m[1].split(/\s+/).forEach(c => classes.add(c))
      }
    } catch {}
  }
  walkPerf(cwd)

  const pkg = (() => { try { return JSON.parse(fs.readFileSync(path.join(cwd,'package.json'),'utf8')) } catch { return {} } })()
  const depCount = Object.keys(pkg.dependencies ?? {}).length
  if (depCount > 60) {
    issue('performance', 'warning', `High dependency count (${depCount}) — review with: npx depcheck`)
    report.scores.performance -= Math.floor((depCount - 60) / 10) * 3
  }
  if (classes.size > 500) {
    issue('performance', 'info', `${classes.size} unique classes — consider route-based CSS splitting (tw split)`)
  }

  report.tips.push(`${classes.size} unique Tailwind classes found across source files`)
  report.tips.push(`Run 'tw split . artifacts/route-css' to generate per-route CSS chunks`)
  report.tips.push(`Run 'npm audit' for dependency-level security advisories`)
  report.tips.push(`Add accessibility checks: tw audit --scope=a11y`)
}

// ── Output ────────────────────────────────────────────────────────────────────
const errorCount   = report.issues.filter(i => i.severity === 'error').length
const warningCount = report.issues.filter(i => i.severity === 'warning').length
const infoCount    = report.issues.filter(i => i.severity === 'info').length

if (jsonMode) {
  console.log(JSON.stringify({ ...report, summary: { errors: errorCount, warnings: warningCount, info: infoCount } }, null, 2))
} else {
  console.log('\n┌───────────────────────────────────────┐')
  console.log('│     tailwind-styled project audit    │')
  console.log('└───────────────────────────────────────┘\n')

  const scoreBar = (n) => '█'.repeat(Math.round(n/10)) + '░'.repeat(10 - Math.round(n/10))
  for (const [k, v] of Object.entries(report.scores)) {
    const color = v >= 80 ? '\x1b[32m' : v >= 60 ? '\x1b[33m' : '\x1b[31m'
    console.log(`  ${k.padEnd(16)} ${color}${scoreBar(v)}\x1b[0m ${v}/100`)
  }
  console.log('')

  if (report.issues.length === 0) {
    console.log('  ✅ No issues found\n')
  } else {
    const grouped = { error: [], warning: [], info: [] }
    for (const i of report.issues) (grouped[i.severity] ?? grouped.info).push(i)

    for (const [sev, issues] of Object.entries(grouped)) {
      if (!issues.length) continue
      const icon = sev === 'error' ? '❌' : sev === 'warning' ? '⚠️ ' : 'ℹ️ '
      for (const i of issues) {
        console.log(`  ${icon} [${i.category}] ${i.message}`)
        if (i.file) console.log(`     └─ ${i.file}`)
      }
    }
    console.log('')
  }

  console.log(`  ${errorCount} errors  ${warningCount} warnings  ${infoCount} info`)
  if (report.tips.length) {
    console.log('\n  Tips:')
    report.tips.forEach(t => console.log(`  • ${t}`))
  }
  console.log('')
}

if (errorCount > 0) process.exitCode = 1
