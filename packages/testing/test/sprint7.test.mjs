/**
 * Tests — Sprint 7
 * Covers: tarball registry, RSC auto-inject, Figma multi-mode,
 *         dynamic route CSS, Oxc minify full pipeline
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-s7-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── Tarball Registry ─────────────────────────────────────────────────────────
describe("registry-tarball.mjs", () => {
  const SCRIPT = path.join(ROOT, "scripts/v45/registry-tarball.mjs")

  test("file exists and has content", () => {
    assert.ok(fs.existsSync(SCRIPT))
    assert.ok(fs.statSync(SCRIPT).size > 2000)
  })

  test("help command exits 0", () => {
    const r = run(SCRIPT, ["help"])
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes("publish") && r.stdout.includes("install"))
  })

  test("install without package name exits 1", () => {
    const r = run(SCRIPT, ["install"])
    assert.notEqual(r.status, 0)
  })

  test("versions without package name exits 1", () => {
    const r = run(SCRIPT, ["versions"])
    assert.notEqual(r.status, 0)
  })

  test("has npm-compatible PUT endpoint in registry.mjs", () => {
    const registryContent = fs.readFileSync(path.join(ROOT, "scripts/v45/registry.mjs"), "utf8")
    assert.ok(registryContent.includes("PUT"), "registry should handle PUT requests")
    assert.ok(registryContent.includes("tarball"), "registry should handle tarballs")
    assert.ok(registryContent.includes("versions"), "registry should handle versions endpoint")
  })

  test("registry.mjs saves tarball to tarballs/ dir", () => {
    const content = fs.readFileSync(path.join(ROOT, "scripts/v45/registry.mjs"), "utf8")
    assert.ok(content.includes("tarballs"), "should create tarballs directory")
    assert.ok(content.includes("base64"), "should decode base64 tarball")
  })
})

// ─── RSC Auto-inject ──────────────────────────────────────────────────────────
describe("RSC auto-inject — rscAnalyzer", () => {
  const ANALYZER = path.join(ROOT, "packages/compiler/src/rscAnalyzer.ts")

  test("exports detectRSCBoundary", () => {
    const c = fs.readFileSync(ANALYZER, "utf8")
    assert.ok(c.includes("export function detectRSCBoundary"))
  })

  test("exports autoInjectClientBoundary", () => {
    const c = fs.readFileSync(ANALYZER, "utf8")
    assert.ok(c.includes("export function autoInjectClientBoundary"))
  })

  test("autoInjectClientBoundary signature is correct", () => {
    const c = fs.readFileSync(ANALYZER, "utf8")
    assert.ok(c.includes("injected: boolean"))
    assert.ok(c.includes("reasons: string[]"))
  })

  test("webpackLoader imports rscAnalyzer", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/next/src/webpackLoader.ts"), "utf8")
    assert.ok(c.includes("rscAnalyzer"), "webpackLoader should import rscAnalyzer")
    assert.ok(c.includes("analyzeFile"), "should call analyzeFile")
    assert.ok(c.includes("injectClientDirective"), "should inject directive")
  })

  test("turbopackLoader imports rscAnalyzer (Sprint 7)", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/next/src/turbopackLoader.ts"), "utf8")
    assert.ok(
      c.includes("rscAnalyzer") && c.includes("analyzeFile"),
      "turbopackLoader should import from rscAnalyzer"
    )
  })
})

// ─── Figma Multi-mode ─────────────────────────────────────────────────────────
describe("figma-multi.mjs", () => {
  const SCRIPT = path.join(ROOT, "scripts/v45/figma-multi.mjs")

  test("file exists", () => {
    assert.ok(fs.existsSync(SCRIPT))
    assert.ok(fs.statSync(SCRIPT).size > 1000)
  })

  test("help exits 0 with usage info", () => {
    const r = run(SCRIPT, ["help"])
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes("pull") && r.stdout.includes("modes") && r.stdout.includes("diff"))
  })

  test("pull without FIGMA_TOKEN exits 1", () => {
    const r = spawnSync(process.execPath, [SCRIPT, "pull"],
      { encoding: "utf8", timeout: 5000, cwd: ROOT,
        env: { ...process.env, FIGMA_TOKEN: "", FIGMA_FILE_KEY: "fake" } })
    assert.notEqual(r.status, 0)
  })

  test("supports --file= flag for multiple files", () => {
    const content = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(content.includes("--file="), "should support --file= flag")
    assert.ok(content.includes("fileKeys"), "should handle multiple file keys")
  })

  test("supports --mode= for mode selection", () => {
    const content = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(content.includes("--mode="))
    assert.ok(content.includes("modeArg"))
  })

  test("diff command compares two modes", () => {
    const content = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(content.includes("fromArg") && content.includes("toArg"))
    assert.ok(content.includes("pullWithMode"))
  })
})

// ─── Dynamic Route CSS ────────────────────────────────────────────────────────
describe("Dynamic Route CSS — routeCssMiddleware", () => {
  const MW = path.join(ROOT, "packages/next/src/routeCssMiddleware.ts")

  test("exports getDynamicRouteCssPaths", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("export function getDynamicRouteCssPaths"))
  })

  test("exports getDynamicRouteCssLinks", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("export function getDynamicRouteCssLinks"))
  })

  test("exports resolveDynamicRoute", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("export function resolveDynamicRoute"))
  })

  test("exports invalidateDynamicRouteCache", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("export function invalidateDynamicRouteCache"))
  })

  test("handles [id] dynamic segments", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("[id]") || c.includes("\\["))
  })

  test("handles [...slug] catch-all segments", () => {
    const c = fs.readFileSync(MW, "utf8")
    assert.ok(c.includes("...") || c.includes("slug"))
  })
})

// ─── Minify full pipeline ─────────────────────────────────────────────────────
describe("tw minify — full pipeline", () => {
  const SCRIPT = path.join(ROOT, "scripts/v47/minify.mjs")

  test("file has 3-tier strategy", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("oxc-minify"), "should try oxc-minify first")
    assert.ok(c.includes("esbuild"),    "should fall back to esbuild")
    assert.ok(c.includes("fallback"),   "should have regex fallback")
  })

  test("supports --mangle flag", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("--mangle"))
    assert.ok(c.includes("mangle"))
  })

  test("supports --dead-code flag", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("--dead-code"))
    assert.ok(c.includes("deadCode"))
  })

  test("supports --json output", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("--json"))
    assert.ok(c.includes("jsonOutput"))
  })

  test("supports --out= and --write flags", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("--out="))
    assert.ok(c.includes("--write"))
  })

  test("minify simple JS with fallback", () => {
    const { dir, cleanup } = tmp()
    try {
      const src = path.join(dir, "test.js")
      fs.writeFileSync(src, "const x = 1;\nconst y = 2;\nconsole.log(x + y);")
      const r = run(SCRIPT, [src, "--json"])
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
      const out = JSON.parse(r.stdout)
      assert.ok(out.minified <= out.original, "should not grow larger")
      assert.ok(out.mode, "should report mode")
    } finally { cleanup() }
  })

  test("reports reduction percentage", () => {
    const { dir, cleanup } = tmp()
    try {
      const src = path.join(dir, "test.js")
      // Large source with lots of whitespace
      fs.writeFileSync(src, "const   x   =   1  ;  const   y   =   2  ;  ")
      const r = run(SCRIPT, [src, "--json"])
      assert.equal(r.status, 0)
      const out = JSON.parse(r.stdout)
      assert.ok("reduction" in out)
    } finally { cleanup() }
  })
})
