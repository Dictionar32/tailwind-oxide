#!/usr/bin/env node
/**
 * tw registry tarball — npm-compatible tarball publish & install (Sprint 7)
 *
 * Usage:
 *   tw registry publish [--tarball] [--registry=URL]  — pack + publish tarball
 *   tw install <package> [--registry=URL]              — install dari registry
 *   tw registry versions <package>                    — list versions
 *
 * Format tarball mengikuti npm spec:
 *   - package.tgz berisi package/ dir dengan package.json di root
 *   - manifest endpoint: GET /packages/:name/:version
 *   - tarball endpoint:  GET /packages/:name/-/:name-:version.tgz
 *   - publish endpoint:  PUT /packages/:name (multipart atau JSON+base64)
 *
 * Kompatibel dengan:
 *   npm install --registry=http://localhost:4040
 *   pnpm add pkg --registry http://localhost:4040
 */

import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { createGzip } from 'node:zlib'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cmd       = process.argv[2]
const registryUrl = process.argv.find(a => a.startsWith('--registry='))?.split('=').slice(1).join('=')
  ?? process.env.TW_REGISTRY_URL ?? 'http://localhost:4040'

// ─── Pack tarball (npm pack compatible) ──────────────────────────────────────

function createTarball(projectDir, outPath) {
  // Use npm pack (respects .npmignore, files field, etc.)
  const r = spawnSync('npm', ['pack', '--json', '--pack-destination', path.dirname(outPath)], {
    encoding: 'utf8', cwd: projectDir, timeout: 30_000
  })

  if (r.status === 0) {
    let packInfo
    try { packInfo = JSON.parse(r.stdout) } catch {}
    const generatedFile = packInfo?.[0]?.filename
    if (generatedFile) {
      const src = path.join(projectDir, generatedFile)
      if (fs.existsSync(src) && src !== outPath) fs.renameSync(src, outPath)
      return { ok: true, file: outPath, mode: 'npm-pack' }
    }
  }

  // Fallback: manual tar (if npm not available)
  const tar = spawnSync('tar', ['-czf', outPath, '-C', projectDir, '.'], {
    encoding: 'utf8', timeout: 30_000
  })
  return tar.status === 0
    ? { ok: true, file: outPath, mode: 'tar-fallback' }
    : { ok: false, error: tar.stderr }
}

function fileSha512(filePath) {
  const buf = fs.readFileSync(filePath)
  return 'sha512-' + createHash('sha512').update(buf).digest('base64')
}

// ─── Publish command ──────────────────────────────────────────────────────────

async function publish(projectDir) {
  const pkgPath = path.join(projectDir, 'package.json')
  if (!fs.existsSync(pkgPath)) {
    console.error('[tw registry publish] No package.json found')
    process.exit(1)
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const tarballName = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`
  const tarballPath = path.join(require('os').tmpdir?.() ?? '/tmp', tarballName)

  process.stderr.write(`[tw registry publish] Packing ${pkg.name}@${pkg.version}...\n`)
  const packed = createTarball(projectDir, tarballPath)
  if (!packed.ok) {
    console.error('[tw registry publish] Pack failed:', packed.error)
    process.exit(1)
  }

  const tarball  = fs.readFileSync(tarballPath)
  const shasum   = createHash('sha1').update(tarball).digest('hex')
  const integrity = fileSha512(tarballPath)

  const payload = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description ?? '',
    keywords: pkg.keywords ?? [],
    main: pkg.main ?? 'index.js',
    dist: {
      tarball: `${registryUrl}/packages/${encodeURIComponent(pkg.name)}/-/${tarballName}`,
      shasum,
      integrity,
    },
    tarball: tarball.toString('base64'),
    publishedAt: new Date().toISOString(),
  }

  const url = new URL(`/packages/${encodeURIComponent(pkg.name)}`, registryUrl)
  const body = JSON.stringify(payload)
  const token = process.env.TW_REGISTRY_TOKEN

  const result = await new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    const req = client.request(url, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })

  fs.unlinkSync(tarballPath)

  if (result.status === 200 || result.status === 201) {
    console.log(`[tw registry publish] ✅ Published ${pkg.name}@${pkg.version}`)
    console.log(`[tw registry publish] Registry: ${registryUrl}/packages/${pkg.name}`)
  } else {
    console.error(`[tw registry publish] ❌ Failed: HTTP ${result.status}: ${result.body}`)
    process.exit(1)
  }
}

// ─── Install command ──────────────────────────────────────────────────────────

async function install(packageName) {
  // Parse scope and version: @scope/name@version or name@version
  const versionSep = packageName.lastIndexOf('@')
  const hasScopeAt = packageName.startsWith('@') && versionSep === 0
  const requestedVersion = (!hasScopeAt && versionSep > 0)
    ? packageName.slice(versionSep + 1)
    : 'latest'
  const nameOnly = (!hasScopeAt && versionSep > 0)
    ? packageName.slice(0, versionSep)
    : packageName

  process.stderr.write(`[tw install] Fetching ${nameOnly}@${requestedVersion} from ${registryUrl}...\n`)

  // GET package metadata
  const url = new URL(`/packages/${encodeURIComponent(nameOnly)}`, registryUrl)
  const meta = await new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    http.get(url.toString(), (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { reject(new Error(data)) }
      })
    }).on('error', reject)
  })

  if (!meta.name) {
    console.error(`[tw install] Package '${nameOnly}' not found in registry`)
    process.exit(1)
  }

  // Use npm install with registry flag
  console.log(`[tw install] Installing ${meta.name}@${meta.version}...`)
  const r = spawnSync('npm', ['install', `${meta.name}@${meta.version}`, `--registry=${registryUrl}`], {
    stdio: 'inherit', timeout: 60_000
  })

  if (r.status !== 0) {
    // Fallback: download tarball and extract manually
    if (meta.dist?.tarball && meta.tarball) {
      const dest = path.join(process.cwd(), 'node_modules', meta.name)
      fs.mkdirSync(dest, { recursive: true })
      const tarball = Buffer.from(meta.tarball, 'base64')
      const tmpFile = path.join('/tmp', `tw-install-${Date.now()}.tgz`)
      fs.writeFileSync(tmpFile, tarball)
      spawnSync('tar', ['-xzf', tmpFile, '-C', dest, '--strip-components=1'], { stdio: 'inherit' })
      fs.unlinkSync(tmpFile)
      console.log(`[tw install] ✅ Installed ${meta.name}@${meta.version} → node_modules/${meta.name}`)
    } else {
      console.error('[tw install] ❌ Installation failed')
      process.exit(1)
    }
  } else {
    console.log(`[tw install] ✅ Installed ${meta.name}@${meta.version}`)
  }
}

// ─── Versions command ─────────────────────────────────────────────────────────

async function versions(packageName) {
  const url = new URL(`/packages/${encodeURIComponent(packageName)}/versions`, registryUrl)
  const data = await new Promise((resolve, reject) => {
    http.get(url.toString(), (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve([]) } })
    }).on('error', () => resolve([]))
  })

  if (Array.isArray(data) && data.length > 0) {
    console.log(`Versions of ${packageName}:`)
    data.forEach(v => console.log(`  ${v}`))
  } else {
    // Fallback: single version from package info
    const url2 = new URL(`/packages/${encodeURIComponent(packageName)}`, registryUrl)
    const meta = await new Promise((resolve, reject) => {
      http.get(url2.toString(), (res) => {
        let d = ''
        res.on('data', c => d += c)
        res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve(null) } })
      }).on('error', () => resolve(null))
    })
    if (meta?.version) console.log(`${packageName}: ${meta.version} (only published version)`)
    else { console.error(`Package '${packageName}' not found`); process.exit(1) }
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

if (!cmd || cmd === 'help') {
  console.log(`Usage: node scripts/v45/registry-tarball.mjs <publish|install|versions> [--registry=URL]

  publish [dir]          Pack current project (or [dir]) and publish tarball
  install <package>      Install package from registry
  versions <package>     List available versions

Environment:
  TW_REGISTRY_URL        Registry URL (default: http://localhost:4040)
  TW_REGISTRY_TOKEN      Auth token for publish`)
  process.exit(0)
}

if (cmd === 'publish') {
  const dir = process.argv.find(a => !a.startsWith('-') && a !== 'publish') ?? process.cwd()
  await publish(path.resolve(dir))
}
else if (cmd === 'install') {
  const pkg = process.argv[3]
  if (!pkg) { console.error('Usage: tw install <package>'); process.exit(1) }
  await install(pkg)
}
else if (cmd === 'versions') {
  const pkg = process.argv[3]
  if (!pkg) { console.error('Usage: tw registry versions <package>'); process.exit(1) }
  await versions(pkg)
}
else {
  console.error(`Unknown command: ${cmd}`)
  process.exit(1)
}
