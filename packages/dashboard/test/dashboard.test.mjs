import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { test } from "node:test"

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

test("dashboard module exports metrics state without starting the server", async () => {
  const mod = await import(pathToFileURL(path.join(packageDir, "dist/index.js")).href)

  assert.equal(typeof mod.updateMetrics, "function")
  assert.equal(typeof mod.getMetricsSummary, "function")
  assert.equal(typeof mod.resetHistory, "function")
  assert.equal(Array.isArray(mod.history), true)
  mod.updateMetrics({ mode: "watch" })
  assert.equal(mod.currentMetrics.mode, "watch")
  mod.updateMetrics({ mode: "error", error: "boom", buildMs: 2500, scanMs: 1200 })
  assert.equal(mod.getMetricsSummary().health.status, "unhealthy")
  mod.resetHistory()
  assert.equal(mod.history.length, 0)
})

async function waitFor(condition, timeoutMs = 5000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (await condition()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`condition not met within ${timeoutMs}ms`)
}

test("dashboard server boots and exposes health and metrics endpoints", async (t) => {
  const port = String(33000 + Math.floor(Math.random() * 1000))
  const child = spawn(process.execPath, ["./src/server.mjs"], {
    cwd: packageDir,
    env: {
      ...process.env,
      PORT: port,
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  let stdout = ""
  let stderr = ""

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString()
  })

  t.after(() => {
    if (!child.killed) child.kill()
  })

  await waitFor(() => stdout.includes(`http://localhost:${port}`))

  const health = await fetch(`http://127.0.0.1:${port}/health`).then((response) => response.json())
  const metrics = await fetch(`http://127.0.0.1:${port}/metrics`).then((response) => response.json())
  const summary = await fetch(`http://127.0.0.1:${port}/summary`).then((response) => response.json())

  assert.equal(health.ok, true)
  assert.equal(typeof health.status, "string")
  assert.equal(metrics.mode, "idle")
  assert.equal(typeof metrics.generatedAt, "string")
  assert.equal(typeof summary.health.status, "string")
  assert.equal(stderr, "")
})
