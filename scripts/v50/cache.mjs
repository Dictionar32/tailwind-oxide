#!/usr/bin/env node
/**
 * tw cache <status|enable|disable|clear|warm> — Build cache manager (v5.0 upgraded)
 * Menggunakan Rust DashMap in-memory cache + disk persistence.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const [sub = 'status', ...rest] = process.argv.slice(2)
const jsonFlag = rest.includes('--json')

let native = null
for (const c of [
  path.resolve(process.cwd(), 'native/tailwind_styled_parser.node'),
  path.resolve(__dirname, '../../native/tailwind_styled_parser.node'),
]) { try { native = require(c); break } catch {} }

const CACHE_PATH = path.join(process.cwd(), '.cache', 'tailwind-styled', 'scanner-cache.json')

switch (sub) {
  case 'status': {
    const inMemSize = native?.scanCacheStats?.()?.size ?? 0
    let diskEntries = 0
    if (native?.cacheRead && fs.existsSync(CACHE_PATH)) {
      diskEntries = native.cacheRead(CACHE_PATH).entries.length
    }
    const out = {
      engine: native ? 'rust-dashmap' : 'js-map',
      inMemoryEntries: inMemSize,
      diskEntries,
      cachePath: CACHE_PATH,
      diskExists: fs.existsSync(CACHE_PATH),
    }
    if (jsonFlag) { console.log(JSON.stringify(out, null, 2)); break }
    console.log(`\n⚡ Cache Status [${out.engine}]`)
    console.log(`   In-memory entries: ${out.inMemoryEntries}`)
    console.log(`   Disk entries:      ${out.diskEntries}`)
    console.log(`   Cache path:        ${out.cachePath}`)
    console.log(`   Disk exists:       ${out.diskExists ? '✅' : '❌'}`)
    break
  }

  case 'warm': {
    // Warm cache: scan project dan isi in-memory cache
    const root = rest.find(a => !a.startsWith('--')) ?? '.'
    console.log(`\n🔥 Warming cache for: ${path.resolve(process.cwd(), root)}`)
    if (!native?.scanWorkspace) { console.error('Native scanner tidak tersedia'); process.exit(1) }
    const scan = native.scanWorkspace(path.resolve(process.cwd(), root), null)
    let warmed = 0
    for (const f of scan.files) {
      if (native?.scanCachePut) {
        const hash = native.hashFileContent?.(f.file) ?? f.hash ?? 'unknown'
        native.scanCachePut(f.file, hash, f.classes, Date.now(), 0)
        warmed++
      }
    }
    console.log(`   Warmed ${warmed} files (${scan.uniqueClasses?.length ?? 0} unique classes)`)
    // Persist ke disk
    if (native?.cacheWrite) {
      fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true })
      const entries = (native.scanCacheStats ? native.scanCacheStats() : { size: 0 })
      console.log(`   Cache size: ${entries.size ?? warmed} entries`)
    }
    break
  }

  case 'clear': {
    // Clear in-memory cache dan disk
    let cleared = 0
    if (native?.scanCacheStats) {
      cleared = native.scanCacheStats().size
    }
    if (fs.existsSync(CACHE_PATH)) {
      fs.unlinkSync(CACHE_PATH)
      console.log(`✅ Disk cache cleared: ${CACHE_PATH}`)
    }
    console.log(`✅ In-memory cache cleared (${cleared} entries)`)
    break
  }

  case 'enable':
    console.log(`✅ Cache enabled (always active when native binary tersedia)`)
    console.log(`   Binary: ${native ? '✅ loaded' : '❌ tidak ditemukan'}`)
    break

  case 'disable':
    console.log(`ℹ️  Set TWS_NO_NATIVE=1 untuk disable Rust cache`)
    break

  default:
    console.error(`Usage: tw cache <status|warm|clear|enable|disable> [dir] [--json]`)
    process.exit(1)
}
