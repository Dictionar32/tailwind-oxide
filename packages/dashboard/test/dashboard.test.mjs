import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

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

  assert.deepEqual(health, { ok: true })
  assert.equal(metrics.mode, "idle")
  assert.equal(typeof metrics.generatedAt, "string")
  assert.equal(stderr, "")
})
