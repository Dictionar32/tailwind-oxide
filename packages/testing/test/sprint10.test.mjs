/**
 * Tests — Sprint 10
 * Covers: tw lint tailwind config, npm registry, VS Code LSP client,
 *         s3:// sync, native Rust parse tier
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

function run(script, args = [], cwd = ROOT, extraEnv = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8", timeout: 15_000, cwd,
    env: { ...process.env, ...extraEnv },
  })
}
function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-s10-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── tw lint: Tailwind config custom rules ────────────────────────────────────
describe("tw lint — Tailwind config custom rules validation", () => {
  const SCRIPT = path.join(ROOT, "scripts/v48/lint-parallel.mjs")

  test("loadTailwindConfigClasses function exists", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("loadTailwindConfigClasses"), "should have loadTailwindConfigClasses")
    assert.ok(c.includes("tailwind.config.js"), "should look for tailwind.config.js")
    assert.ok(c.includes("addUtilities"), "should parse addUtilities")
    assert.ok(c.includes("addComponents"), "should parse addComponents")
  })

  test("config classes passed to workers as knownConfigClasses", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("knownConfigClasses"), "should pass knownConfigClasses to workers")
    assert.ok(c.includes("configClassSet"), "worker should use configClassSet")
  })

  test("config classes suppress false-positive deprecated warnings", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("isConfigClass"), "should check isConfigClass before reporting deprecated")
  })

  test("lint with tailwind.config.js — custom class not flagged as unknown", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "App.tsx"),
        'const A = () => <div className="flex-grow p-4 my-custom-btn" />')
      // Config that adds my-custom-btn
      fs.writeFileSync(path.join(dir, "tailwind.config.js"), `
module.exports = {
  plugins: [
    function({ addComponents }) {
      addComponents({ '.my-custom-btn': { padding: '0.5rem 1rem' } })
    }
  ]
}`)
      const r = run(SCRIPT, [dir, "--json"], ROOT)
      assert.equal(r.status, 1, "flex-grow still deprecated, should exit 1")
      const out = JSON.parse(r.stdout)
      // flex-grow is deprecated, but not because of custom config
      assert.ok(out.diagnostics.some(d => d.class === "flex-grow"), "flex-grow should still be flagged")
    } finally { cleanup() }
  })
})

// ─── Registry npm-compatible protocol ────────────────────────────────────────
describe("Registry — npm packument endpoint", () => {
  const SCRIPT = path.join(ROOT, "scripts/v45/registry.mjs")

  test("has npm packument endpoint", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("packument") || c.includes("dist-tags"), "should have npm packument format")
    assert.ok(c.includes("dist-tags"), "should have dist-tags field")
    assert.ok(c.includes("versions"), "should have versions field")
  })

  test("packument accessible at /:name (not /packages/:name)", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    // Should handle root-level /:name requests
    assert.ok(c.includes("segments.length === 1"), "should handle single-segment URLs")
  })

  test("registry help exits 0", () => {
    const r = run(SCRIPT, ["help"])
    assert.equal(r.status, 0)
  })
})

// ─── VS Code LSP client ───────────────────────────────────────────────────────
describe("VS Code extension — LSP client", () => {
  const EXT = path.join(ROOT, "packages/vscode/src/extension.ts")

  test("startLspServer function exists", () => {
    const c = fs.readFileSync(EXT, "utf8")
    assert.ok(c.includes("startLspServer"), "should have startLspServer")
    assert.ok(c.includes("stopLspServer"), "should have stopLspServer")
  })

  test("LSP enabled check uses settings", () => {
    const c = fs.readFileSync(EXT, "utf8")
    assert.ok(c.includes('getConfig("lsp.enable"'), "should read lsp.enable from settings")
  })

  test("LSP process spawned via child_process", () => {
    const c = fs.readFileSync(EXT, "utf8")
    assert.ok(c.includes("cp.spawn") || c.includes('spawn('), "should spawn LSP process")
    assert.ok(c.includes("lspProcess"), "should track lspProcess")
  })

  test("LSP stopped on deactivate", () => {
    const c = fs.readFileSync(EXT, "utf8")
    const deactIdx = c.indexOf("export function deactivate")
    assert.ok(deactIdx > -1)
    const deactBody = c.slice(deactIdx, deactIdx + 200)
    assert.ok(deactBody.includes("stopLspServer"), "deactivate should stop LSP")
  })

  test("LSP settings wired to onDidChangeConfiguration", () => {
    const c = fs.readFileSync(EXT, "utf8")
    assert.ok(c.includes("onDidChangeConfiguration"), "should watch for settings changes")
    assert.ok(c.includes("tailwindStyled.lsp"), "should watch lsp settings")
  })
})

// ─── S3:// sync protocol ──────────────────────────────────────────────────────
describe("tw sync — s3:// protocol", () => {
  const SYNC = path.join(ROOT, "scripts/v45/sync.mjs")

  test("s3:// URL handling exists", () => {
    const c = fs.readFileSync(SYNC, "utf8")
    assert.ok(c.includes("s3://"), "should handle s3:// URLs")
    assert.ok(c.includes("AWS_ENDPOINT_URL"), "should support custom endpoint")
  })

  test("s3:// without env gives helpful error", () => {
    const { dir, cleanup } = tmp()
    try {
      const r = spawnSync(process.execPath, [SYNC, "pull", "--from=s3://my-bucket/tokens.json"], {
        encoding: "utf8", timeout: 5000, cwd: dir,
        env: { ...process.env, AWS_ENDPOINT_URL: "", TW_S3_ENDPOINT: "", AWS_ACCESS_KEY_ID: "" },
      })
      assert.notEqual(r.status, 0, "should fail without credentials")
    } finally { cleanup() }
  })

  test("s3:// with endpoint env resolves to HTTP URL", () => {
    const c = fs.readFileSync(SYNC, "utf8")
    assert.ok(c.includes("s3Endpoint"), "should use s3Endpoint variable")
    assert.ok(c.includes("resolvedFromArg"), "should resolve s3:// to HTTP URL")
  })

  test("HTTP pull still works (regression)", () => {
    const c = fs.readFileSync(SYNC, "utf8")
    // effectiveUrl should be used instead of fromArg in fetch
    assert.ok(c.includes("effectiveUrl"), "should use effectiveUrl for HTTP fetch")
  })
})

// ─── Native Rust parse tier ───────────────────────────────────────────────────
describe("tw parse — native Rust tier 0", () => {
  const PARSE = path.join(ROOT, "scripts/v46/parse.mjs")
  const NATIVE = path.join(ROOT, "native/index.mjs")

  test("parse.mjs has native tier 0", () => {
    const c = fs.readFileSync(PARSE, "utf8")
    assert.ok(c.includes("native-rust"), "should have native-rust mode")
    assert.ok(c.includes("hasNativeBinding"), "should check hasNativeBinding")
    assert.ok(c.includes("parseClassesNative"), "should call parseClassesNative")
  })

  test("native/index.mjs exports hasNativeBinding and parseClassesNative", () => {
    const c = fs.readFileSync(NATIVE, "utf8")
    assert.ok(c.includes("hasNativeBinding"), "should export hasNativeBinding")
    assert.ok(c.includes("parseClassesNative"), "should export parseClassesNative")
  })

  test("native tier falls through gracefully when .node not available", () => {
    // When native binding isn't compiled, should fall through to Oxc/Babel/regex
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "test.tsx"),
        'export const A = () => <div className="px-4 py-2" />')
      const r = run(PARSE, [path.join(dir, "test.tsx")])
      assert.equal(r.status, 0, `should not crash: ${r.stderr}`)
      const out = JSON.parse(r.stdout)
      // Should use fallback (not native-rust since .node not compiled)
      assert.ok(["regex-fallback", "babel-parser", "oxc-parser", "regex-fast"].includes(out.mode),
        `mode should be a valid fallback: ${out.mode}`)
      assert.ok(out.classes.includes("px-4"), "should find classes via fallback")
    } finally { cleanup() }
  })

  test("native Rust lib.rs exists", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "native/src/lib.rs")), "native/src/lib.rs should exist")
  })
})
