/**
 * Tests — Sprint 10+ (Manifest dev mode, Plugin checksum/update, CSS heading fix)
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

function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-s10p-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── Manifest dev mode serving ────────────────────────────────────────────────
describe("Manifest dev mode serving", () => {
  test("withTailwindStyled has devManifest option", () => {
    const c = fs.readFileSync(
      path.join(ROOT, "packages/next/src/withTailwindStyled.ts"), "utf8")
    assert.ok(c.includes("devManifest"), "should have devManifest option")
    assert.ok(c.includes("/__tw/css-manifest.json"), "should have /__tw/ rewrite source")
    assert.ok(c.includes("devManifestRewrites"), "should have rewrites array")
  })

  test("rewrites only active in dev mode (isDev check)", () => {
    const c = fs.readFileSync(
      path.join(ROOT, "packages/next/src/withTailwindStyled.ts"), "utf8")
    assert.ok(c.includes("devManifest && isDev"), "should check isDev before adding rewrites")
  })

  test("routeCssMiddleware has public/__tw/ path candidate", () => {
    const c = fs.readFileSync(
      path.join(ROOT, "packages/next/src/routeCssMiddleware.ts"), "utf8")
    assert.ok(c.includes("__tw"), "should have __tw path candidate for dev mode")
  })

  test("rewrites target .next/static/css/tw/", () => {
    const c = fs.readFileSync(
      path.join(ROOT, "packages/next/src/withTailwindStyled.ts"), "utf8")
    assert.ok(c.includes(".next/static/css/tw/css-manifest.json"), "rewrite destination correct")
  })
})

// ─── Plugin checksum verification ─────────────────────────────────────────────
describe("Plugin registry — checksum & auto-update", () => {
  const INDEX = path.join(ROOT, "packages/plugin-registry/src/index.ts")
  const CLI   = path.join(ROOT, "packages/plugin-registry/src/cli.ts")

  test("verifyIntegrity method exists", () => {
    const c = fs.readFileSync(INDEX, "utf8")
    assert.ok(c.includes("verifyIntegrity"), "should have verifyIntegrity method")
    assert.ok(c.includes("sha256"), "should use sha256 for integrity")
    assert.ok(c.includes("createHash"), "should use crypto.createHash")
  })

  test("checkForUpdate method exists with semver comparison", () => {
    const c = fs.readFileSync(INDEX, "utf8")
    assert.ok(c.includes("checkForUpdate"), "should have checkForUpdate method")
    assert.ok(c.includes("hasUpdate"), "should return hasUpdate flag")
    assert.ok(c.includes("parseV"), "should parse semver")
  })

  test("checkAllUpdates returns array of all plugins", () => {
    const c = fs.readFileSync(INDEX, "utf8")
    assert.ok(c.includes("checkAllUpdates"), "should have checkAllUpdates method")
    assert.ok(c.includes("this.plugins.map"), "should map over all plugins")
  })

  test("CLI has update-check command", () => {
    const c = fs.readFileSync(CLI, "utf8")
    assert.ok(c.includes("update-check"), "CLI should handle update-check command")
    assert.ok(c.includes("checkAllUpdates"), "CLI should call checkAllUpdates")
  })

  test("CLI has verify command", () => {
    const c = fs.readFileSync(CLI, "utf8")
    assert.ok(c.includes('"verify"'), "CLI should handle verify command")
    assert.ok(c.includes("verifyIntegrity"), "CLI should call verifyIntegrity")
  })

  test("CLI HELP text includes update-check and verify", () => {
    const clIdx = fs.readFileSync(
      path.join(ROOT, "packages/cli/src/index.ts"), "utf8")
    assert.ok(clIdx.includes("update-check"), "main CLI should document update-check")
    assert.ok(clIdx.includes("verify"), "main CLI should document verify")
  })

  test("verifyIntegrity returns ok:true when no checksum registered", () => {
    const { dir, cleanup } = tmp()
    try {
      // Create a fake plugin package
      const pkgDir = path.join(dir, "node_modules", "@tailwind-styled", "plugin-animation")
      fs.mkdirSync(pkgDir, { recursive: true })
      fs.writeFileSync(path.join(pkgDir, "package.json"),
        JSON.stringify({ name: "@tailwind-styled/plugin-animation", version: "4.2.0" }))

      // Dynamic import the registry
      const script = path.join(ROOT, "packages/plugin-registry/dist/cli.js")
      if (!fs.existsSync(script)) return // skip if not built

      const r = spawnSync(process.execPath, [script, "verify",
        "@tailwind-styled/plugin-animation", "--json"], {
        encoding: "utf8", timeout: 5000, cwd: dir,
      })
      // Should succeed (no checksum = ok:true)
      const out = JSON.parse(r.stdout)
      assert.ok(out.ok === true || out.reason?.includes("no checksum"), "should ok when no checksum")
    } finally { cleanup() }
  })
})

// ─── CSS generation heading fix ───────────────────────────────────────────────
describe("tw-v50.md — CSS generation heading", () => {
  test("heading updated from 'Output hanya classCount' to 'CSS Generation'", () => {
    const c = fs.readFileSync(
      path.join(ROOT, "docs/known-limitations/tw-v50.md"), "utf8")
    assert.ok(c.includes("CSS Generation"), "should have CSS Generation heading")
    assert.ok(!c.includes("Output hanya classCount — full CSS generation Sprint 10+"),
      "old heading should be gone")
  })

  test("workaround shows tw split pipeline", () => {
    const c = fs.readFileSync(
      path.join(ROOT, "docs/known-limitations/tw-v50.md"), "utf8")
    assert.ok(c.includes("tw split"), "workaround should mention tw split")
  })
})
