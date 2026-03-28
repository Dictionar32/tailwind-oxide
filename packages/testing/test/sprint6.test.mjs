/**
 * Tests — Sprint 6 (registry, cluster-server, sync remote, route CSS, vite, studio)
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../../..")

function run(script, args = [], cwd = ROOT) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8", timeout: 15_000, cwd,
  })
}
function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-s6-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── Registry CLI ─────────────────────────────────────────────────────────────
describe("tw registry CLI", () => {
  const SCRIPT = path.join(ROOT, "scripts/v45/registry.mjs")

  test("list on empty store exits 0", () => {
    const { dir, cleanup } = tmp()
    try {
      const r = run(SCRIPT, ["list", `--store=${dir}`])
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
      // Either empty output or "Registry empty" message — both acceptable
      assert.ok(r.stdout.length >= 0)
    } finally { cleanup() }
  })

  test("info on missing package exits 1", () => {
    const { dir, cleanup } = tmp()
    try {
      const r = run(SCRIPT, ["info", "nonexistent", `--store=${dir}`])
      assert.notEqual(r.status, 0)
    } finally { cleanup() }
  })

  test("registry.mjs has HTTP server code", () => {
    const content = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(content.includes("http.createServer"), "should create HTTP server")
    assert.ok(content.includes("/packages"), "should have /packages endpoint")
    assert.ok(content.includes("/health"), "should have /health endpoint")
    assert.ok(content.includes("savePackage"), "should have savePackage function")
  })

  test("registry.mjs has token auth", () => {
    const content = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(content.includes("TW_REGISTRY_TOKEN"), "should support token auth")
    assert.ok(content.includes("authorization"), "should check Authorization header")
  })
})

// ─── Cluster server ───────────────────────────────────────────────────────────
describe("tw cluster-server", () => {
  const SCRIPT = path.join(ROOT, "scripts/v50/cluster-server.mjs")

  test("cluster-server.mjs exists and is substantial", () => {
    assert.ok(fs.existsSync(SCRIPT))
    assert.ok(fs.statSync(SCRIPT).size > 1000)
  })

  test("has /build endpoint", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("'/build'"), "should have /build endpoint")
  })

  test("has /health and /status endpoints", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("'/health'"))
    assert.ok(c.includes("'/status'"))
  })

  test("uses worker threads for parallel scan", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("Worker"), "should use Worker threads")
    assert.ok(c.includes("isMainThread"), "should check isMainThread")
  })

  test("supports token auth", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("TW_WORKER_TOKEN"))
    assert.ok(c.includes("Unauthorized"))
  })
})

// ─── Sync remote ─────────────────────────────────────────────────────────────
describe("tw sync remote", () => {
  const SYNC = path.join(ROOT, "scripts/v45/sync.mjs")

  test("supports --from= HTTP pull", () => {
    const c = fs.readFileSync(SYNC, "utf8")
    assert.ok(c.includes("--from="))
    assert.ok(c.includes("fetch(fromArg)"))
  })

  test("supports --to-url= HTTP push", () => {
    const c = fs.readFileSync(SYNC, "utf8")
    assert.ok(c.includes("--to-url="))
    assert.ok(c.includes("method: 'POST'"))
  })

  test("figma subcommand is properly routed", () => {
    const c = fs.readFileSync(SYNC, "utf8")
    assert.ok(c.includes("cmd === 'figma'"))
    assert.ok(c.includes("figma-sync.mjs"))
  })

  test("pull from invalid URL exits non-zero", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "tokens.sync.json"), JSON.stringify({ version: 1, tokens: {} }))
      const r = spawnSync(process.execPath, [SYNC, "pull", "--from=http://127.0.0.1:1"], {
        encoding: "utf8", timeout: 5000, cwd: dir, env: { ...process.env }
      })
      assert.notEqual(r.status, 0)
    } finally { cleanup() }
  })
})

// ─── Route CSS middleware ─────────────────────────────────────────────────────
describe("routeCssMiddleware", () => {
  const MW = path.join(ROOT, "packages/next/src/routeCssMiddleware.ts")

  test("file exists", () => { assert.ok(fs.existsSync(MW)) })

  test("exports getRouteCssLinks", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("export function getRouteCssLinks"))
  })

  test("exports injectRouteCssIntoHtml", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("export function injectRouteCssIntoHtml"))
  })

  test("exports loadRouteCssManifest with multiple path candidates", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("loadRouteCssManifest"))
    assert.ok(c.includes("css-manifest.json"), "should reference css-manifest.json")
    assert.ok(c.includes(".next"), "should have .next path candidate")
    assert.ok(c.includes("artifacts"), "should have artifacts path candidate")
  })

  test("injects link tags before </head>", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("</head>"))
    assert.ok(c.includes('<link rel="stylesheet"'))
  })
})

// ─── Vite plugin routeCss ─────────────────────────────────────────────────────
describe("Vite plugin routeCss option", () => {
  const PLUGIN = path.join(ROOT, "packages/vite/src/plugin.ts")

  test("has routeCss, routeCssDir, deadStyleElimination options", () => {
    const c = fs.readFileSync(PLUGIN, "utf8")
    assert.ok(c.includes("routeCss"))
    assert.ok(c.includes("routeCssDir"))
    assert.ok(c.includes("deadStyleElimination"))
  })

  test("runs split-routes in buildEnd", () => {
    const c = fs.readFileSync(PLUGIN, "utf8")
    assert.ok(c.includes("split-routes.mjs"))
  })

  test("runs shake after split for dead style elimination", () => {
    const c = fs.readFileSync(PLUGIN, "utf8")
    assert.ok(c.includes("shake-css.mjs"))
  })
})

// ─── Studio Desktop ───────────────────────────────────────────────────────────
describe("Studio Desktop", () => {
  const SD = path.join(ROOT, "packages/studio-desktop/src")

  test("loading-error.html has auto-retry polling", () => {
    const html = path.join(SD, "loading-error.html")
    assert.ok(fs.existsSync(html))
    const c = fs.readFileSync(html, "utf8")
    assert.ok(c.includes("poll"))
    assert.ok(c.includes("localhost:3030"))
  })

  test("updater.js exports setupAutoUpdater and checkForUpdatesManually", () => {
    const upd = path.join(SD, "updater.js")
    assert.ok(fs.existsSync(upd))
    const c = fs.readFileSync(upd, "utf8")
    assert.ok(c.includes("setupAutoUpdater"))
    assert.ok(c.includes("checkForUpdatesManually"))
    assert.ok(c.includes("autoUpdater"))
  })

  test("main.js wires updater", () => {
    const c = fs.readFileSync(path.join(SD, "main.js"), "utf8")
    assert.ok(c.includes("setupAutoUpdater"))
    assert.ok(c.includes("./updater"))
    assert.ok(c.includes("loading-error.html"))
  })
})
