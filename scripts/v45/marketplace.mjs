#!/usr/bin/env node
/**
 * tw plugin marketplace — Public plugin marketplace (Sprint 9)
 *
 * Publish plugin ke marketplace publik dan search/discover plugins dari komunitas.
 *
 * Usage:
 *   tw plugin marketplace publish [--token=TOKEN]
 *   tw plugin marketplace search <query> [--category=animation|layout|theme]
 *   tw plugin marketplace featured
 *   tw plugin marketplace info <plugin-name>
 *   tw plugin marketplace unpublish <plugin-name> [--token=TOKEN]
 *
 * Marketplace endpoint: https://registry.tailwind-styled.dev (atau self-hosted)
 * Fallback: tw registry serve untuk local/team marketplace
 */

import fs from 'node:fs'
import https from 'node:https'
import http from 'node:http'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const cmd           = process.argv[2]
const tokenArg      = process.argv.find(a => a.startsWith('--token='))?.split('=')[1]
  ?? process.env.TW_MARKETPLACE_TOKEN
const categoryArg   = process.argv.find(a => a.startsWith('--category='))?.split('=')[1]
const registryUrl   = process.argv.find(a => a.startsWith('--registry='))?.split('=').slice(1).join('=')
  ?? process.env.TW_MARKETPLACE_URL ?? 'https://registry.tailwind-styled.dev'
const isDryRun      = process.argv.includes('--dry-run')
const isJson        = process.argv.includes('--json')

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function apiRequest(method, endpoint, body = null) {
  const url = new URL(endpoint, registryUrl)
  const client = url.protocol === 'https:' ? https : http
  const payload = body ? JSON.stringify(body) : null

  return new Promise((resolve, reject) => {
    const req = client.request(url, {
      method,
      headers: {
        'content-type': 'application/json',
        'user-agent': 'tailwind-styled-cli/4.2.0',
        ...(tokenArg ? { authorization: `Bearer ${tokenArg}` } : {}),
        ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), raw: data }) }
        catch { resolve({ status: res.statusCode, body: null, raw: data }) }
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ─── Publish ─────────────────────────────────────────────────────────────────

async function publish() {
  const pkgPath = path.join(process.cwd(), 'package.json')
  if (!fs.existsSync(pkgPath)) {
    console.error('[marketplace] No package.json found in current directory')
    process.exit(1)
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

  // Validate it's a tailwind-styled plugin
  const isTwPlugin = pkg.keywords?.includes('tailwind-styled-plugin')
    || pkg.name?.includes('tailwind-styled')
    || pkg.peerDependencies?.['tailwind-styled-v4']

  if (!isTwPlugin) {
    console.warn('[marketplace] ⚠️  Package does not appear to be a tailwind-styled plugin')
    console.warn('[marketplace]    Add "tailwind-styled-plugin" to keywords in package.json')
    if (!process.argv.includes('--force')) {
      console.error('[marketplace] Use --force to publish anyway')
      process.exit(1)
    }
  }

  const manifest = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description ?? '',
    keywords: pkg.keywords ?? [],
    author: typeof pkg.author === 'string' ? pkg.author : pkg.author?.name ?? '',
    license: pkg.license ?? 'MIT',
    repository: typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url ?? '',
    homepage: pkg.homepage ?? '',
    category: categoryArg ?? inferCategory(pkg),
    peerDependencies: pkg.peerDependencies ?? {},
    publishedAt: new Date().toISOString(),
  }

  if (isDryRun) {
    console.log('[marketplace] DRY RUN — would publish:')
    console.log(JSON.stringify(manifest, null, 2))
    return
  }

  if (!tokenArg) {
    console.error('[marketplace] Token required. Set TW_MARKETPLACE_TOKEN or use --token=TOKEN')
    console.error('[marketplace] Get a token at https://registry.tailwind-styled.dev/tokens')
    process.exit(1)
  }

  process.stderr.write(`[marketplace] Publishing ${manifest.name}@${manifest.version}...\n`)

  try {
    const res = await apiRequest('PUT', `/marketplace/${encodeURIComponent(manifest.name)}`, manifest)
    if (res.status === 200 || res.status === 201) {
      console.log(`[marketplace] ✅ Published: ${manifest.name}@${manifest.version}`)
      console.log(`[marketplace] View: ${registryUrl}/marketplace/${manifest.name}`)
    } else if (res.status === 0 || res.body === null) {
      // Offline fallback — publish to local registry
      console.warn('[marketplace] ⚠️  Marketplace unreachable — publishing to local registry')
      const localR = spawnSync(process.execPath, ['scripts/v45/registry-tarball.mjs', 'publish'], {
        stdio: 'inherit', cwd: process.cwd(), encoding: 'utf8'
      })
      if (localR.status !== 0) process.exit(1)
    } else {
      console.error(`[marketplace] ❌ Failed: HTTP ${res.status}: ${res.raw?.slice(0, 200)}`)
      process.exit(1)
    }
  } catch (e) {
    console.warn(`[marketplace] ⚠️  Network error: ${e.message}`)
    console.warn('[marketplace]    Fallback: run `tw registry serve` for local marketplace')
    process.exit(1)
  }
}

function inferCategory(pkg) {
  const kw = (pkg.keywords ?? []).join(' ').toLowerCase()
  if (kw.includes('animation') || kw.includes('motion')) return 'animation'
  if (kw.includes('layout') || kw.includes('grid') || kw.includes('flex')) return 'layout'
  if (kw.includes('theme') || kw.includes('color') || kw.includes('dark')) return 'theme'
  if (kw.includes('form') || kw.includes('input') || kw.includes('button')) return 'ui'
  if (kw.includes('typography') || kw.includes('font') || kw.includes('text')) return 'typography'
  return 'utilities'
}

// ─── Search ───────────────────────────────────────────────────────────────────

async function search(query) {
  const params = new URLSearchParams({ q: query ?? '' })
  if (categoryArg) params.set('category', categoryArg)

  try {
    const res = await apiRequest('GET', `/marketplace/search?${params}`)
    if (res.status === 200 && Array.isArray(res.body)) {
      if (isJson) { console.log(JSON.stringify(res.body, null, 2)); return }
      if (res.body.length === 0) { console.log('No plugins found'); return }
      console.log(`Found ${res.body.length} plugin(s):\n`)
      for (const p of res.body) {
        console.log(`  ${p.name}@${p.version}`)
        if (p.description) console.log(`    ${p.description}`)
        if (p.category) console.log(`    Category: ${p.category}`)
        console.log()
      }
      return
    }
  } catch {}

  // Offline fallback — search in local plugin-registry JSON
  console.warn('[marketplace] Marketplace unreachable — searching local registry cache')
  const localRegistry = path.join(process.cwd(), '.tw-registry')
  if (!fs.existsSync(localRegistry)) {
    console.log('No local registry. Start one: tw registry serve')
    return
  }
  const pkgs = fs.readdirSync(localRegistry)
    .filter(f => f.endsWith('.json') && !f.endsWith('.versions.json'))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(localRegistry, f), 'utf8')) } catch { return null } })
    .filter(Boolean)
    .filter(p => !query || JSON.stringify(p).toLowerCase().includes(query.toLowerCase()))

  if (pkgs.length === 0) { console.log('No packages found in local registry'); return }
  pkgs.forEach(p => console.log(`  ${p.name}@${p.version}  ${p.description ?? ''}`))
}

// ─── Featured ─────────────────────────────────────────────────────────────────

async function featured() {
  try {
    const res = await apiRequest('GET', '/marketplace/featured')
    if (res.status === 200 && Array.isArray(res.body)) {
      if (isJson) { console.log(JSON.stringify(res.body, null, 2)); return }
      console.log('Featured plugins:\n')
      for (const p of res.body) {
        console.log(`  ⭐ ${p.name}@${p.version}`)
        if (p.description) console.log(`    ${p.description}`)
        console.log()
      }
      return
    }
  } catch {}

  // Offline fallback — show built-in featured list
  const builtin = [
    { name: '@tailwind-styled/plugin-animation', version: '4.2.0', description: 'Animation utilities for tailwind-styled', category: 'animation' },
    { name: '@tailwind-styled/plugin-forms',     version: '1.0.0', description: 'Form styling utilities', category: 'ui' },
    { name: '@tailwind-styled/plugin-typography', version: '1.0.0', description: 'Typography plugin', category: 'typography' },
  ]
  if (isJson) { console.log(JSON.stringify(builtin, null, 2)); return }
  console.log('Featured plugins (offline list):\n')
  builtin.forEach(p => console.log(`  ⭐ ${p.name}  ${p.description}`))
}

// ─── Info ─────────────────────────────────────────────────────────────────────

async function info(name) {
  try {
    const res = await apiRequest('GET', `/marketplace/${encodeURIComponent(name)}`)
    if (res.status === 200 && res.body) {
      console.log(isJson ? JSON.stringify(res.body, null, 2) : formatInfo(res.body))
      return
    }
  } catch {}

  // Fallback to local registry
  const localFile = path.join(process.cwd(), '.tw-registry', `${name.replace(/[^a-zA-Z0-9@_.-]/g, '_')}.json`)
  if (fs.existsSync(localFile)) {
    const d = JSON.parse(fs.readFileSync(localFile, 'utf8'))
    console.log(isJson ? JSON.stringify(d, null, 2) : formatInfo(d))
    return
  }
  console.error(`Plugin '${name}' not found`)
  process.exit(1)
}

function formatInfo(p) {
  return [
    `Name:        ${p.name}`,
    `Version:     ${p.version}`,
    `Description: ${p.description ?? '-'}`,
    `Category:    ${p.category ?? '-'}`,
    `Author:      ${p.author ?? '-'}`,
    `License:     ${p.license ?? '-'}`,
    `Published:   ${p.publishedAt ?? '-'}`,
  ].join('\n')
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

if (!cmd || cmd === 'help') {
  console.log(`Usage: tw plugin marketplace <publish|search|featured|info|unpublish>

  publish [--token=TOKEN] [--dry-run]       Publish plugin to marketplace
  search <query> [--category=...]           Search plugins
  featured [--json]                         Show featured plugins
  info <plugin-name> [--json]               Plugin details
  unpublish <plugin-name> [--token=TOKEN]   Remove from marketplace

Options:
  --registry=URL    Custom marketplace URL (default: https://registry.tailwind-styled.dev)
  --token=TOKEN     Auth token (or set TW_MARKETPLACE_TOKEN)
  --category=...    Filter/tag: animation|layout|theme|ui|typography|utilities
  --json            JSON output
  --dry-run         Preview without publishing`)
  process.exit(0)
}

if (cmd === 'publish') await publish()
else if (cmd === 'search') {
  const q = process.argv[3]
  await search(q)
} else if (cmd === 'featured') await featured()
else if (cmd === 'info') {
  const n = process.argv[3]
  if (!n) { console.error('Usage: tw plugin marketplace info <name>'); process.exit(1) }
  await info(n)
} else if (cmd === 'unpublish') {
  const n = process.argv[3]
  if (!n) { console.error('Usage: tw plugin marketplace unpublish <name>'); process.exit(1) }
  if (!tokenArg) { console.error('Token required for unpublish'); process.exit(1) }
  try {
    const res = await apiRequest('DELETE', `/marketplace/${encodeURIComponent(n)}`)
    if (res.status === 200) console.log(`[marketplace] ✅ Unpublished: ${n}`)
    else console.error(`[marketplace] ❌ Failed: HTTP ${res.status}`)
  } catch (e) { console.error(`[marketplace] Error: ${e.message}`); process.exit(1) }
} else {
  console.error(`Unknown command: ${cmd}`)
  process.exit(1)
}
