#!/usr/bin/env node
/**
 * tw registry — Lightweight local/team registry server (Sprint 6)
 *
 * Menyediakan HTTP registry agar `tw deploy` bisa publish dan
 * `tw install` bisa install component dari registry.
 *
 * Usage:
 *   node scripts/v45/registry.mjs serve [--port=4040] [--store=.tw-registry]
 *   node scripts/v45/registry.mjs list
 *   node scripts/v45/registry.mjs info <name>
 *
 * Endpoints:
 *   GET  /                          → registry info
 *   GET  /packages                  → list all packages
 *   GET  /packages/:name            → package metadata
 *   POST /packages                  → publish package (requires TW_REGISTRY_TOKEN)
 *   GET  /health                    → { ok: true }
 *
 * tw deploy --registry=http://localhost:4040
 */

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createHash } from 'node:crypto'

const cmd       = process.argv[2] ?? 'serve'
const portArg   = process.argv.find(a => a.startsWith('--port='))?.split('=')[1]
const storeArg  = process.argv.find(a => a.startsWith('--store='))?.split('=')[1]
const PORT      = Number(portArg ?? process.env.TW_REGISTRY_PORT ?? 4040)
const STORE_DIR = path.resolve(process.cwd(), storeArg ?? '.tw-registry')
const TOKEN     = process.env.TW_REGISTRY_TOKEN ?? null

// ─── Store helpers ────────────────────────────────────────────────────────────

function ensureStore() {
  fs.mkdirSync(STORE_DIR, { recursive: true })
}

function listPackages() {
  ensureStore()
  return fs.readdirSync(STORE_DIR)
    .filter(f => f.endsWith('.json') && f !== '_index.json')
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(STORE_DIR, f), 'utf8')) }
      catch { return null }
    })
    .filter(Boolean)
}

function getPackage(name) {
  const safe = name.replace(/[^a-zA-Z0-9@_.-]/g, '_')
  const file = path.join(STORE_DIR, `${safe}.json`)
  if (!fs.existsSync(file)) return null
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}

function savePackage(manifest) {
  ensureStore()
  const safe = manifest.name.replace(/[^a-zA-Z0-9@_.-]/g, '_')
  const entry = {
    ...manifest,
    publishedAt: new Date().toISOString(),
    id: createHash('md5').update(manifest.name + manifest.version).digest('hex').slice(0, 8),
  }
  // Save tarball if provided (base64)
  if (manifest.tarball) {
    const tarballDir = path.join(STORE_DIR, 'tarballs')
    fs.mkdirSync(tarballDir, { recursive: true })
    const tarballName = `${safe}-${manifest.version}.tgz`
    fs.writeFileSync(path.join(tarballDir, tarballName), Buffer.from(manifest.tarball, 'base64'))
    entry.dist = {
      ...entry.dist,
      tarballFile: tarballName,
    }
    delete entry.tarball // Don't store base64 in JSON
  }
  // Version history
  const versionsFile = path.join(STORE_DIR, `${safe}.versions.json`)
  const versions = fs.existsSync(versionsFile)
    ? JSON.parse(fs.readFileSync(versionsFile, 'utf8')) : []
  if (!versions.includes(manifest.version)) versions.push(manifest.version)
  fs.writeFileSync(versionsFile, JSON.stringify(versions))
  fs.writeFileSync(path.join(STORE_DIR, `${safe}.json`), JSON.stringify(entry, null, 2))
  return entry
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data, null, 2))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', c => (body += c))
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch { reject(new Error('Invalid JSON')) } })
    req.on('error', reject)
  })
}

// ─── Server ───────────────────────────────────────────────────────────────────

if (cmd === 'serve') {
  ensureStore()

  const registryUrl = `http://localhost:${PORT}`

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const segments = url.pathname.split('/').filter(Boolean)

    // GET /health
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, packages: listPackages().length })
    }

    // GET /
    if (req.method === 'GET' && url.pathname === '/') {
      return json(res, 200, {
        name: 'tailwind-styled registry',
        version: '1.0.0',
        packages: listPackages().length,
        endpoint: `http://localhost:${PORT}`,
      })
    }

    // GET /packages
    if (req.method === 'GET' && url.pathname === '/packages') {
      return json(res, 200, listPackages())
    }

    // GET /:name — npm packument endpoint (npm-compatible)
    // This allows: npm install --registry=http://localhost:4040
    if (req.method === 'GET' && segments.length === 1 && segments[0] !== 'packages' && segments[0] !== 'health' && segments[0] !== 'marketplace') {
      const pkg = getPackage(decodeURIComponent(segments[0]))
      if (!pkg) return json(res, 404, { error: `Package '${segments[0]}' not found` })
      // Return npm packument format
      const packument = {
        name: pkg.name,
        description: pkg.description ?? '',
        'dist-tags': { latest: pkg.version },
        versions: {
          [pkg.version]: {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description ?? '',
            dist: pkg.dist ?? {
              tarball: `${registryUrl}/packages/${encodeURIComponent(pkg.name)}/-/${pkg.name.replace('@','').replace('/','%2F')}-${pkg.version}.tgz`,
            },
          }
        },
        time: { [pkg.version]: pkg.publishedAt ?? new Date().toISOString() },
      }
      return json(res, 200, packument)
    }

    // GET /packages/:name
    if (req.method === 'GET' && segments[0] === 'packages' && segments[1]) {
      const pkg = getPackage(decodeURIComponent(segments[1]))
      if (!pkg) return json(res, 404, { error: `Package '${segments[1]}' not found` })
      return json(res, 200, pkg)
    }

    // PUT /packages/:name — npm-compatible publish (tarball)
    if (req.method === 'PUT' && segments[0] === 'packages' && segments[1]) {
      if (TOKEN) {
        const auth = req.headers.authorization?.replace('Bearer ', '')
        if (auth !== TOKEN) return json(res, 401, { error: 'Invalid token' })
      }
      try {
        const manifest = await parseBody(req)
        if (!manifest.name || !manifest.version) {
          return json(res, 400, { error: 'manifest.name and manifest.version required' })
        }
        const saved = savePackage(manifest)
        return json(res, 201, { ok: true, published: saved.name, version: saved.version, id: saved.id })
      } catch (e) {
        return json(res, 400, { error: e.message })
      }
    }

    // GET /packages/:name/versions — list versions
    if (req.method === 'GET' && segments[0] === 'packages' && segments[1] && segments[2] === 'versions') {
      const safe = decodeURIComponent(segments[1]).replace(/[^a-zA-Z0-9@_.-]/g, '_')
      const versionsFile = path.join(STORE_DIR, `${safe}.versions.json`)
      if (!fs.existsSync(versionsFile)) return json(res, 200, [])
      return json(res, 200, JSON.parse(fs.readFileSync(versionsFile, 'utf8')))
    }

    // GET /packages/:name/-/:tarball.tgz — download tarball
    if (req.method === 'GET' && segments[0] === 'packages' && segments[1] && segments[2] === '-') {
      const tarballName = segments[3]
      const tarballPath = path.join(STORE_DIR, 'tarballs', tarballName)
      if (!fs.existsSync(tarballPath)) return json(res, 404, { error: 'Tarball not found' })
      res.writeHead(200, { 'content-type': 'application/gzip', 'content-length': fs.statSync(tarballPath).size })
      fs.createReadStream(tarballPath).pipe(res)
      return
    }

    // POST /packages — publish (JSON only, legacy)
    if (req.method === 'POST' && url.pathname === '/packages') {
      // Token auth if configured
      if (TOKEN) {
        const auth = req.headers.authorization?.replace('Bearer ', '')
        if (auth !== TOKEN) return json(res, 401, { error: 'Invalid token. Set TW_REGISTRY_TOKEN.' })
      }
      try {
        const manifest = await parseBody(req)
        if (!manifest.name || !manifest.version) {
          return json(res, 400, { error: 'manifest.name and manifest.version are required' })
        }
        const saved = savePackage(manifest)
        return json(res, 201, { ok: true, published: saved.name, version: saved.version, id: saved.id })
      } catch (e) {
        return json(res, 400, { error: e.message })
      }
    }

    json(res, 404, { error: 'Not found' })
  })

  server.listen(PORT, () => {
    console.log(`[tw registry] Server running on http://localhost:${PORT}`)
    console.log(`[tw registry] Store: ${STORE_DIR}`)
    if (TOKEN) console.log(`[tw registry] Token auth: enabled`)
    else console.log(`[tw registry] Token auth: disabled (set TW_REGISTRY_TOKEN to enable)`)
    console.log(`\n  Publish: tw deploy --registry=http://localhost:${PORT}`)
    console.log(`  List:    curl http://localhost:${PORT}/packages`)
  })
}

else if (cmd === 'list') {
  const pkgs = listPackages()
  if (pkgs.length === 0) { console.log('Registry empty — run: tw deploy'); process.exit(0) }
  pkgs.forEach(p => console.log(`  ${p.name}@${p.version}  ${p.publishedAt ?? ''}`))
}

else if (cmd === 'info') {
  const name = process.argv[3]
  if (!name) { console.error('Usage: tw registry info <name>'); process.exit(1) }
  const pkg = getPackage(name)
  if (!pkg) { console.error(`Not found: ${name}`); process.exit(1) }
  console.log(JSON.stringify(pkg, null, 2))
}

else if (cmd === 'help') {
  console.log(`Usage: tw registry <serve|list|info|help> [--port=4040] [--store=.tw-registry]

  serve   Start HTTP registry server
  list    List all packages
  info    Show package details
  help    Show this help
  `)
}

else {
  console.error(`Usage: tw registry <serve|list|info> [--port=4040] [--store=.tw-registry]`)
  process.exit(1)
}
