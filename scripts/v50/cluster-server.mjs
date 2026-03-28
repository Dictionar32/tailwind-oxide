#!/usr/bin/env node
/**
 * tw cluster-server — Remote build worker HTTP server (Sprint 6)
 *
 * Dijalankan di mesin remote. Client (`tw cluster build --remote=URL`)
 * mengirim daftar file → server scan + return class counts.
 *
 * Usage:
 *   node scripts/v50/cluster-server.mjs [--port=7070] [--token=secret]
 *
 * Endpoints:
 *   POST /build        → { files: string[] } → { results, durationMs }
 *   GET  /status       → { workers, ready, queueDepth }
 *   GET  /health       → { ok: true }
 *
 * Client usage:
 *   tw cluster build src/ --remote=http://build-server:7070 --token=secret
 */

import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'

const PORT  = Number(process.argv.find(a => a.startsWith('--port='))?.split('=')[1]  ?? process.env.TW_WORKER_PORT ?? 7070)
const TOKEN = process.argv.find(a => a.startsWith('--token='))?.split('=')[1] ?? process.env.TW_WORKER_TOKEN ?? null
const WORKER_COUNT = Number(process.argv.find(a => a.startsWith('--workers='))?.split('=')[1] ?? Math.max(1, os.cpus().length - 1))

// ─── Worker thread — scan a chunk of files ───────────────────────────────────
if (!isMainThread) {
  const { files } = workerData
  const CLASS_RE  = /class(?:Name)?\s*=\s*["'`]([^"'`]+)["'`]/g
  const UTIL_RE   = /(?:twMerge|cn|cx|clsx)\s*\(([^)]+)\)/g
  const results   = []

  for (const file of files) {
    let classCount = 0
    const classes  = new Set()
    try {
      const src = fs.readFileSync(file, 'utf8')
      let m
      while ((m = CLASS_RE.exec(src)) !== null) {
        m[1].split(/\s+/).filter(Boolean).forEach(c => classes.add(c))
      }
      while ((m = UTIL_RE.exec(src)) !== null) {
        const strRe = /['"`]([^'"`]+)['"`]/g
        let sm
        while ((sm = strRe.exec(m[1])) !== null) {
          sm[1].split(/\s+/).filter(Boolean).forEach(c => classes.add(c))
        }
      }
      classCount = classes.size
    } catch {}
    results.push({ file, classCount, classes: [...classes] })
  }

  parentPort.postMessage({ results })
  process.exit(0)
}

// ─── Server (main thread) ─────────────────────────────────────────────────────

let activeJobs = 0

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function buildFiles(files) {
  const chunks = chunk(files, Math.ceil(files.length / WORKER_COUNT) || 1)
  const t0 = Date.now()

  const workerResults = await Promise.all(
    chunks.map(c => new Promise((resolve) => {
      const w = new Worker(new URL(import.meta.url), { workerData: { files: c } })
      w.on('message', resolve)
      w.on('error', () => resolve({ results: [] }))
    }))
  )

  const results = workerResults.flatMap(r => r.results)
  const totalClasses = results.reduce((n, r) => n + r.classCount, 0)

  return {
    filesProcessed: results.length,
    totalClasses,
    durationMs: Date.now() - t0,
    results,
  }
}

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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // Token auth
  if (TOKEN) {
    const auth = req.headers.authorization?.replace('Bearer ', '')
    if (auth !== TOKEN) return json(res, 401, { error: 'Unauthorized' })
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, { ok: true, workers: WORKER_COUNT, port: PORT })
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    return json(res, 200, {
      workers: WORKER_COUNT, activeJobs,
      ready: activeJobs < WORKER_COUNT,
      platform: os.platform(), cpus: os.cpus().length,
      memoryMb: Math.round(os.freemem() / 1024 / 1024),
    })
  }

  if (req.method === 'POST' && url.pathname === '/build') {
    try {
      const body = await parseBody(req)
      if (!Array.isArray(body.files)) return json(res, 400, { error: 'files array required' })

      activeJobs++
      try {
        const result = await buildFiles(body.files)
        return json(res, 200, result)
      } finally {
        activeJobs--
      }
    } catch (e) {
      return json(res, 500, { error: e.message })
    }
  }

  json(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[tw cluster-server] Remote build worker on http://localhost:${PORT}`)
  console.log(`[tw cluster-server] Workers: ${WORKER_COUNT}`)
  if (TOKEN) console.log(`[tw cluster-server] Token auth: enabled`)
  console.log(`\n  Client: tw cluster build src/ --remote=http://<host>:${PORT}${TOKEN ? ` --token=${TOKEN}` : ''}`)
})
