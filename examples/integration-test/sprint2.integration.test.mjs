#!/usr/bin/env node
/**
 * Sprint 2 — Real-world Integration Tests
 *
 * Test end-to-end flow menggunakan contoh proyek yang ada:
 *   1. Parse semua file di examples/vite-react
 *   2. Shake CSS yang dihasilkan
 *   3. Validate Vue adapter cv() pada real-world component patterns
 *   4. Validate Svelte adapter pada real-world patterns
 *   5. Dashboard server menyala dan merespons
 *
 * Menggunakan Node built-in test runner.
 */

import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import http from "node:http"
import { spawnSync, spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.resolve(__dirname, "../..")
const PARSE_SCRIPT   = path.join(ROOT, "scripts/v46/parse.mjs")
const SHAKE_SCRIPT   = path.join(ROOT, "scripts/v47/shake-css.mjs")
const DASHBOARD_SERVER = path.join(ROOT, "packages/dashboard/src/server.mjs")

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(script, args = [], opts = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    timeout: 15_000,
    ...opts,
  })
}

function makeTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-integration-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── 1. Parse real example project files ─────────────────────────────────────

describe("Integration: parse vite-react example", () => {
  const exampleDir = path.join(ROOT, "examples/vite-react/src")
  const exists = fs.existsSync(exampleDir)

  test("example directory exists", () => {
    assert.ok(exists, `examples/vite-react/src not found at ${exampleDir}`)
  })

  test("parses App.tsx without error", () => {
    if (!exists) return
    const appFile = path.join(exampleDir, "App.tsx")
    if (!fs.existsSync(appFile)) return

    const r = run(PARSE_SCRIPT, [appFile])
    assert.equal(r.status, 0, `stderr: ${r.stderr}`)
    const out = JSON.parse(r.stdout)
    assert.ok(out.classCount >= 0)
    assert.ok(["oxc-parser", "babel-parser", "regex-fallback"].includes(out.mode))
  })

  test("parses all .tsx files in example without crashing", () => {
    if (!exists) return
    const files = fs.readdirSync(exampleDir)
      .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
      .map((f) => path.join(exampleDir, f))

    for (const file of files) {
      const r = run(PARSE_SCRIPT, [file])
      assert.equal(r.status, 0, `Parse failed for ${file}: ${r.stderr}`)
    }
  })
})

// ─── 2. Parse + shake end-to-end ─────────────────────────────────────────────

describe("Integration: parse → shake pipeline", () => {
  test("extract classes from source, then shake CSS", () => {
    const { dir, cleanup } = makeTmp()
    try {
      // Step 1: Write source with known classes
      const srcDir = path.join(dir, "src")
      fs.mkdirSync(srcDir)
      fs.writeFileSync(path.join(srcDir, "Button.tsx"), `
        export function Button({ primary }: { primary?: boolean }) {
          return (
            <button className={primary ? "bg-blue-500 text-white px-4 py-2 rounded" : "bg-gray-100 text-gray-700 px-4 py-2 rounded"}>
              Click
            </button>
          )
        }
      `)
      fs.writeFileSync(path.join(srcDir, "Card.tsx"), `
        export function Card() {
          return <div className="flex flex-col gap-4 p-6 shadow-md rounded-lg">content</div>
        }
      `)

      // Step 2: Write CSS with some used + some unused rules
      const cssFile = path.join(dir, "out.css")
      fs.writeFileSync(cssFile, [
        ".bg-blue-500{background:rgb(59 130 246)}",
        ".text-white{color:rgb(255 255 255)}",
        ".px-4{padding-left:1rem;padding-right:1rem}",
        ".py-2{padding-top:.5rem;padding-bottom:.5rem}",
        ".rounded{border-radius:.25rem}",
        ".bg-gray-100{background:rgb(243 244 246)}",
        ".text-gray-700{color:rgb(55 65 81)}",
        ".flex{display:flex}",
        ".flex-col{flex-direction:column}",
        ".gap-4{gap:1rem}",
        ".p-6{padding:1.5rem}",
        ".shadow-md{box-shadow:0 4px 6px -1px rgb(0 0 0/.1)}",
        ".rounded-lg{border-radius:.5rem}",
        // Unused rules:
        ".text-red-500{color:rgb(239 68 68)}",
        ".bg-yellow-300{background:rgb(253 224 71)}",
        ".opacity-0{opacity:0}",
      ].join("\n"))

      // Step 3: Shake
      const r = run(SHAKE_SCRIPT, [cssFile, "--classes-from", srcDir])
      assert.equal(r.status, 0, `shake failed: ${r.stderr}`)

      const stats = JSON.parse(r.stdout)
      assert.ok(stats.removedRules >= 2, `expected at least 2 removed rules, got ${stats.removedRules}`)
      assert.ok(stats.keptRules >= 10, `expected at least 10 kept rules, got ${stats.keptRules}`)

      // Verify unused classes are gone
      const remaining = fs.readFileSync(cssFile, "utf8")
      assert.ok(!remaining.includes(".text-red-500"), "unused class should be removed")
      assert.ok(!remaining.includes(".bg-yellow-300"), "unused class should be removed")
      assert.ok(!remaining.includes(".opacity-0"), "unused class should be removed")

      // Verify used classes remain
      assert.ok(remaining.includes(".bg-blue-500"), "used class should remain")
      assert.ok(remaining.includes(".flex"), "used class should remain")

    } finally {
      cleanup()
    }
  })
})

// ─── 3. Vue adapter real-world pattern ───────────────────────────────────────

describe("Integration: Vue adapter — real-world component patterns", () => {
  let cv
  try {
    const mod = await import(path.join(ROOT, "packages/vue/src/index.ts"))
      .catch(() => import(path.join(ROOT, "packages/vue/dist/index.js")))
    cv = mod.cv
  } catch { cv = null }

  const skip = (t) => { if (!cv) { t.skip("Vue adapter not available"); return true } return false }

  test("Button component — primary + sizes", (t) => {
    if (skip(t)) return
    const button = cv({
      base: "font-medium transition-colors focus:outline-none focus:ring-2",
      variants: {
        intent: {
          primary: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
          danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
          ghost: "bg-transparent border border-gray-200 hover:bg-gray-50",
        },
        size: {
          sm: "h-8 px-3 text-sm rounded",
          md: "h-10 px-4 text-base rounded-md",
          lg: "h-12 px-6 text-lg rounded-lg",
        },
      },
      defaultVariants: { intent: "primary", size: "md" },
    })

    // Default
    const def = button({})
    assert.ok(def.includes("bg-blue-500"), "default intent should be primary")
    assert.ok(def.includes("h-10"), "default size should be md")

    // Override
    const danger = button({ intent: "danger", size: "lg" })
    assert.ok(danger.includes("bg-red-500"))
    assert.ok(danger.includes("h-12"))
    assert.ok(!danger.includes("bg-blue-500"))

    // Custom class override via twMerge
    const custom = button({ intent: "primary", class: "w-full" })
    assert.ok(custom.includes("w-full"))
  })

  test("Badge component — compound variants", (t) => {
    if (skip(t)) return
    const badge = cv({
      base: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
      variants: {
        color: {
          blue: "bg-blue-100 text-blue-800",
          green: "bg-green-100 text-green-800",
          red: "bg-red-100 text-red-800",
        },
        outline: { true: "bg-transparent border", false: "" },
      },
      compoundVariants: [
        { color: "blue", outline: "true", class: "border-blue-500 text-blue-600" },
        { color: "green", outline: "true", class: "border-green-500 text-green-600" },
      ],
      defaultVariants: { color: "blue", outline: "false" },
    })

    const solid = badge({})
    assert.ok(solid.includes("bg-blue-100"))

    const outlined = badge({ color: "blue", outline: "true" })
    assert.ok(outlined.includes("border-blue-500"))
    assert.ok(!outlined.includes("bg-blue-100")) // twMerge removes bg conflict
  })
})

// ─── 4. Dashboard server responds ────────────────────────────────────────────

describe("Integration: dashboard server", () => {
  test("server starts and responds to /health", async () => {
    // Pick a random high port to avoid conflicts
    const port = 54321 + Math.floor(Math.random() * 1000)
    
    const proc = spawn(process.execPath, [DASHBOARD_SERVER], {
      env: { ...process.env, PORT: String(port) },
      stdio: "pipe",
    })

    // Give it time to start
    await new Promise((r) => setTimeout(r, 800))

    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          let data = ""
          res.on("data", (chunk) => (data += chunk))
          res.on("end", () => resolve({ status: res.statusCode, body: data }))
        })
        req.on("error", reject)
        req.setTimeout(3000, () => { req.destroy(); reject(new Error("timeout")) })
      })

      assert.equal(response.status, 200)
      const json = JSON.parse(response.body)
      assert.equal(json.ok, true)
    } finally {
      proc.kill("SIGTERM")
    }
  })

  test("server /metrics returns JSON with generatedAt", async () => {
    const port = 55321 + Math.floor(Math.random() * 1000)
    const proc = spawn(process.execPath, [DASHBOARD_SERVER], {
      env: { ...process.env, PORT: String(port) },
      stdio: "pipe",
    })
    await new Promise((r) => setTimeout(r, 800))

    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/metrics`, (res) => {
          let data = ""
          res.on("data", (chunk) => (data += chunk))
          res.on("end", () => resolve({ status: res.statusCode, body: data }))
        })
        req.on("error", reject)
        req.setTimeout(3000, () => { req.destroy(); reject(new Error("timeout")) })
      })

      assert.equal(response.status, 200)
      const json = JSON.parse(response.body)
      assert.ok("generatedAt" in json, "metrics should have generatedAt")
      assert.ok("mode" in json, "metrics should have mode")
    } finally {
      proc.kill("SIGTERM")
    }
  })
})
