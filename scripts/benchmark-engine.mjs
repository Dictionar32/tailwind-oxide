#!/usr/bin/env node
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { performance } from "node:perf_hooks"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..")

function parseArg(name, fallback = undefined) {
  const prefixed = `--${name}=`
  const value = process.argv.find((arg) => arg.startsWith(prefixed))
  if (!value) return fallback
  return value.slice(prefixed.length)
}

function parseNumberArg(name, fallback) {
  const raw = parseArg(name, String(fallback))
  const num = Number(raw)
  return Number.isFinite(num) ? num : fallback
}

function avg(list) {
  if (list.length === 0) return 0
  return list.reduce((sum, n) => sum + n, 0) / list.length
}

function formatMs(value) {
  return `${Math.round(value)} ms`
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "n/a"
  return `${Math.round(value)}%`
}

function safeImprovement(from, to) {
  if (from <= 0) return Number.NaN
  return (1 - to / from) * 100
}

function ensureDistOrExit(modulePath, label) {
  if (!fs.existsSync(modulePath)) {
    console.error(`[benchmark] Missing ${label}: ${modulePath}`)
    console.error("[benchmark] Run `npm run build -w packages/scanner -w packages/engine` first.")
    process.exit(1)
  }
}

function readRootArg() {
  const positionalRoot = process.argv[2] && !process.argv[2].startsWith("--")
    ? process.argv[2]
    : path.join(REPO_ROOT, "examples", "standar-config-next-js-app")
  return path.resolve(positionalRoot)
}

const INTERNAL_MODE = parseArg("internal")
const ROOT_DIR = path.resolve(parseArg("root", readRootArg()))
const ITERATIONS = Math.max(1, parseNumberArg("iterations", 3))
const WATCH_MS = Math.max(1000, parseNumberArg("watch-ms", 5000))

const SCANNER_DIST = path.join(REPO_ROOT, "packages/scanner/dist/index.cjs")
const ENGINE_DIST = path.join(REPO_ROOT, "packages/engine/dist/index.cjs")

async function runInternalIncremental() {
  const scanner = require(SCANNER_DIST)
  const engine = require(ENGINE_DIST)
  const includeExtensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]

  const benchDir = path.join(ROOT_DIR, ".bench-engine")
  const benchFile = path.join(benchDir, "incremental.tsx")
  const contentA = 'export const Bench = () => <div className="p-4 text-blue-500" />\n'
  const contentB = 'export const Bench = () => <div className="p-6 text-red-500" />\n'

  fs.mkdirSync(benchDir, { recursive: true })
  fs.writeFileSync(benchFile, contentA)

  let previous = scanner.scanWorkspace(ROOT_DIR, { useCache: false })
  const samples = []

  try {
    for (let i = 0; i < ITERATIONS; i += 1) {
      const nextContent = i % 2 === 0 ? contentB : contentA
      fs.writeFileSync(benchFile, nextContent)
      const started = performance.now()
      previous = engine.applyIncrementalChange(previous, benchFile, "change", { includeExtensions })
      samples.push(performance.now() - started)
    }
  } finally {
    try {
      fs.rmSync(benchDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  }

  process.stdout.write(
    `${JSON.stringify({ avgMs: avg(samples), samples, iterations: ITERATIONS })}\n`
  )
}

async function runInternalWatchCpu() {
  const engine = require(ENGINE_DIST)
  const pollIntervalMs = Math.max(50, parseNumberArg("poll", 500))
  const active = parseArg("active", "0") === "1"

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tws-watch-bench-"))
  const filePath = path.join(tempRoot, "watch.tsx")
  fs.writeFileSync(filePath, 'export const Watch = () => <div className="m-2" />\n')

  let eventCount = 0
  let toggle = false
  const handle = engine.watchWorkspaceNative(
    tempRoot,
    (events) => {
      eventCount += events.length
    },
    { pollIntervalMs }
  )

  const cpuStart = process.cpuUsage()
  const writer = active
    ? setInterval(() => {
        toggle = !toggle
        const cls = toggle ? "m-3 text-blue-500" : "m-2 text-red-500"
        fs.writeFileSync(filePath, `export const Watch = () => <div className="${cls}" />\n`)
      }, Math.max(150, Math.floor(pollIntervalMs / 2)))
    : null

  await new Promise((resolve) => setTimeout(resolve, WATCH_MS))

  if (writer) clearInterval(writer)
  handle.stop()

  const cpu = process.cpuUsage(cpuStart)
  const cpuMs = (cpu.user + cpu.system) / 1000

  try {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }

  process.stdout.write(
    `${JSON.stringify({
      cpuMs,
      engine: handle.engine,
      eventCount,
      watchMs: WATCH_MS,
      pollIntervalMs,
      active,
    })}\n`
  )
}

function runSubprocess(internal, extraArgs = [], env = process.env) {
  const args = [
    __filename,
    `--internal=${internal}`,
    `--root=${ROOT_DIR}`,
    `--iterations=${ITERATIONS}`,
    `--watch-ms=${WATCH_MS}`,
    ...extraArgs,
  ]

  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    env,
    encoding: "utf8",
  })

  if (result.status !== 0) {
    const stderr = result.stderr?.trim()
    const stdout = result.stdout?.trim()
    throw new Error(
      `[benchmark] subprocess ${internal} failed (code ${result.status})\n${stderr || stdout}`
    )
  }

  const out = result.stdout.trim()
  return JSON.parse(out)
}

async function runMain() {
  ensureDistOrExit(SCANNER_DIST, "@tailwind-styled/scanner dist")
  ensureDistOrExit(ENGINE_DIST, "@tailwind-styled/engine dist")

  if (!fs.existsSync(ROOT_DIR)) {
    console.error(`[benchmark] Project root not found: ${ROOT_DIR}`)
    process.exit(1)
  }

  const scanner = require(SCANNER_DIST)
  const cacheDir = ".bench-engine-cache"
  const cachePath = path.join(ROOT_DIR, cacheDir)

  const coldSamples = []
  for (let i = 0; i < ITERATIONS; i += 1) {
    fs.rmSync(cachePath, { recursive: true, force: true })
    const started = performance.now()
    scanner.scanWorkspace(ROOT_DIR, { useCache: true, cacheDir })
    coldSamples.push(performance.now() - started)
  }

  fs.rmSync(cachePath, { recursive: true, force: true })
  scanner.scanWorkspace(ROOT_DIR, { useCache: true, cacheDir })

  const warmSamples = []
  for (let i = 0; i < ITERATIONS; i += 1) {
    const started = performance.now()
    scanner.scanWorkspace(ROOT_DIR, { useCache: true, cacheDir })
    warmSamples.push(performance.now() - started)
  }

  const coldAvg = avg(coldSamples)
  const warmAvg = avg(warmSamples)
  const coldWarmImprovement = safeImprovement(coldAvg, warmAvg)

  let incrementalNative
  let incrementalFallback
  try {
    incrementalNative = runSubprocess("incremental")
    incrementalFallback = runSubprocess("incremental", [], {
      ...process.env,
      TWS_NO_NATIVE: "1",
    })
  } catch (error) {
    incrementalNative = null
    incrementalFallback = null
    console.warn(String(error))
  }

  let watchIdle300
  let watchIdle500
  let watchActive300
  let watchActive500
  try {
    watchIdle300 = runSubprocess("watch-cpu", ["--poll=300", "--active=0"])
    watchIdle500 = runSubprocess("watch-cpu", ["--poll=500", "--active=0"])
    watchActive300 = runSubprocess("watch-cpu", ["--poll=300", "--active=1"])
    watchActive500 = runSubprocess("watch-cpu", ["--poll=500", "--active=1"])
  } catch (error) {
    watchIdle300 = null
    watchIdle500 = null
    watchActive300 = null
    watchActive500 = null
    console.warn(String(error))
  }

  fs.rmSync(cachePath, { recursive: true, force: true })

  console.log(`\nEngine benchmark root: ${ROOT_DIR}`)
  console.log(`Iterations: ${ITERATIONS}`)
  console.log(`Watch sample window: ${WATCH_MS} ms\n`)

  console.log("1) Scan workspace")
  console.log(`cold start (no cache): ${formatMs(coldAvg)}`)
  console.log(`warm start (cache hit): ${formatMs(warmAvg)}`)
  console.log(`improvement: ${formatPercent(coldWarmImprovement)}\n`)

  console.log("2) Incremental change")
  if (incrementalNative && incrementalFallback) {
    const nativeAvg = incrementalNative.avgMs
    const fallbackAvg = incrementalFallback.avgMs
    const incImprovement = safeImprovement(fallbackAvg, nativeAvg)
    console.log(`native diff: ${formatMs(nativeAvg)}`)
    console.log(`JS fallback: ${formatMs(fallbackAvg)}`)
    console.log(`improvement: ${formatPercent(incImprovement)}\n`)
  } else {
    console.log("skipped (failed to run incremental subprocess)\n")
  }

  console.log("3) Watch CPU usage")
  if (watchIdle300 && watchIdle500 && watchActive300 && watchActive500) {
    console.log(`engine: ${watchIdle500.engine}`)
    console.log(
      `idle CPU (300ms): ${formatMs(watchIdle300.cpuMs)} | idle CPU (500ms): ${formatMs(watchIdle500.cpuMs)}`
    )
    console.log(
      `idle reduction: ${formatPercent(safeImprovement(watchIdle300.cpuMs, watchIdle500.cpuMs))}`
    )
    console.log(
      `active CPU (300ms): ${formatMs(watchActive300.cpuMs)} | active CPU (500ms): ${formatMs(watchActive500.cpuMs)}`
    )
    console.log(
      `active reduction: ${formatPercent(safeImprovement(watchActive300.cpuMs, watchActive500.cpuMs))}`
    )
    console.log(
      `events captured (500ms active): ${watchActive500.eventCount}\n`
    )
  } else {
    console.log("skipped (failed to run watch CPU subprocess)\n")
  }
}

if (INTERNAL_MODE === "incremental") {
  await runInternalIncremental()
  process.exit(0)
}

if (INTERNAL_MODE === "watch-cpu") {
  await runInternalWatchCpu()
  process.exit(0)
}

await runMain()
