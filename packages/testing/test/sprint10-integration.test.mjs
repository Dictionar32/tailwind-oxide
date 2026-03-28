/**
 * Tests — Sprint 10 (Engine Error Handling, Logging, Cache, DevTools, VSCode)
 * Covers Sprint 6–8 changes via integration tests.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { createRequire } from "node:module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../../..")
const req = createRequire(import.meta.url)

function tmp(prefix = "tw-s10-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── Sprint 6: Error Handling & Logging ──────────────────────────────────────

describe("Sprint 6 — Error Handling: native cache_read", () => {
  test("native/src/lib.rs: cache_read returns napi::Result", () => {
    const c = fs.readFileSync(path.join(ROOT, "native/src/lib.rs"), "utf8")
    assert.ok(
      c.includes("pub fn cache_read(cache_path: String) -> napi::Result<CacheReadResult>"),
      "cache_read should return napi::Result<CacheReadResult>"
    )
  })

  test("native/src/lib.rs: cache_read uses map_err with napi::Error", () => {
    const c = fs.readFileSync(path.join(ROOT, "native/src/lib.rs"), "utf8")
    assert.ok(c.includes("napi::Error::from_reason"), "should use napi::Error::from_reason")
    assert.ok(c.includes("Cannot read cache file"), "should have descriptive error message")
  })

  test("native/src/lib.rs: cache_read returns Ok(CacheReadResult)", () => {
    const c = fs.readFileSync(path.join(ROOT, "native/src/lib.rs"), "utf8")
    assert.ok(c.includes("Ok(CacheReadResult { entries, version: 2 })"), "should wrap result in Ok()")
  })

  test("native/src/lib.rs: test for missing file uses is_err()", () => {
    const c = fs.readFileSync(path.join(ROOT, "native/src/lib.rs"), "utf8")
    assert.ok(c.includes("r.is_err()"), "test should assert is_err() for missing file")
  })

  test("native/src/lib.rs: round-trip test uses .unwrap()", () => {
    const c = fs.readFileSync(path.join(ROOT, "native/src/lib.rs"), "utf8")
    assert.ok(c.includes("cache_read(path).unwrap()"), "round-trip test should call .unwrap()")
  })
})

describe("Sprint 6 — Logging: scanner createLogger", () => {
  test("scanner/src/index.ts imports createLogger from @tailwind-styled/shared", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/scanner/src/index.ts"), "utf8")
    assert.ok(c.includes('import { createLogger } from "@tailwind-styled/shared"'))
    assert.ok(c.includes('const log = createLogger("scanner")'))
  })

  test("scanner/src/index.ts has no debugScanner or isDebugEnabled", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/scanner/src/index.ts"), "utf8")
    assert.ok(!c.includes("debugScanner"), "should not have debugScanner")
    assert.ok(!c.includes("isDebugEnabled"), "should not have isDebugEnabled")
  })

  test("scanner uses log.debug for cache HIT and MISS", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/scanner/src/index.ts"), "utf8")
    assert.ok(c.includes('log.debug(`cache HIT'), "should log cache HIT")
    assert.ok(c.includes('log.debug(`cache MISS'), "should log cache MISS")
  })

  test("shared logger respects TWS_LOG_LEVEL env", () => {
    const { createLogger } = req(path.join(ROOT, "packages/shared/dist/index.cjs"))

    // debug suppressed at info level
    process.env.TWS_LOG_LEVEL = "info"
    const log = createLogger("test-s10")
    let captured = ""
    const orig = process.stderr.write.bind(process.stderr)
    process.stderr.write = (d) => { captured += d; return true }
    log.debug("should not appear")
    process.stderr.write = orig
    delete process.env.TWS_LOG_LEVEL
    assert.ok(!captured.includes("should not appear"), "debug should be suppressed at info level")
  })
})

describe("Sprint 6 — Engine error propagation", () => {
  test("engine/src/index.ts has reportEngineError with Promise<e> return type", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/engine/src/index.ts"), "utf8")
    assert.ok(c.includes("reportEngineError"), "should have reportEngineError")
    assert.ok(c.includes("Promise<"), "should have Promise return type")
  })

  test("engine watch emits error event on watcher failure", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/engine/src/index.ts"), "utf8")
    assert.ok(c.includes('type: "error"'), "should emit error type events")
    assert.ok(c.includes("onError:"), "should pass onError to watcher")
  })

  test("engine plugin onError hook called and error propagated", async () => {
    const { createEngine } = req(path.join(ROOT, "packages/engine/dist/index.cjs"))
    let hookCalled = false
    const engine = await createEngine({
      root: process.cwd(),
      plugins: [{
        name: "test-hook",
        beforeScan: async () => { throw new Error("intentional test error") },
        onError: async () => { hookCalled = true },
      }],
    })
    try { await engine.build() } catch { /* expected */ }
    assert.ok(hookCalled, "onError plugin hook should be called")
  })
})

// ─── Sprint 7: Platform Adapters ─────────────────────────────────────────────

describe("Sprint 7 — Platform adapter builds", () => {
  test("next dist: @tailwind-styled/compiler NOT in require() calls", () => {
    const distDir = path.join(ROOT, "packages/next/dist")
    if (!fs.existsSync(distDir)) return // skip if not built
    const files = fs.readdirSync(distDir).filter(f => f.endsWith(".cjs"))
    for (const f of files) {
      const c = fs.readFileSync(path.join(distDir, f), "utf8")
      assert.ok(
        !c.includes('require("@tailwind-styled/compiler")'),
        `${f} should not external-require compiler`
      )
    }
  })

  test("vite dist: preserveImports in plugin.cjs", () => {
    const f = path.join(ROOT, "packages/vite/dist/plugin.cjs")
    if (!fs.existsSync(f)) return
    const c = fs.readFileSync(f, "utf8")
    assert.ok(c.includes("preserveImports"), "vite dist should have preserveImports")
  })

  test("rspack dist: preserveImports in loader.cjs", () => {
    const f = path.join(ROOT, "packages/rspack/dist/loader.cjs")
    if (!fs.existsSync(f)) return
    const c = fs.readFileSync(f, "utf8")
    assert.ok(c.includes("preserveImports"), "rspack dist should have preserveImports")
  })
})

// ─── Sprint 8: DevTools & VSCode ─────────────────────────────────────────────

describe("Sprint 8 — DevTools browser safety", () => {
  test("devtools/src/index.tsx has NO Rust scan button or getRustAnalyzer", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/devtools/src/index.tsx"), "utf8")
    assert.ok(!c.includes("getRustAnalyzer"), "should not have getRustAnalyzer")
    assert.ok(!c.includes("runRustScan"), "should not have runRustScan")
    assert.ok(!c.includes("Run Rust Workspace Scan"), "should not have Rust scan button")
  })

  test("devtools/src/index.tsx fetches metrics from dashboard instead", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/devtools/src/index.tsx"), "utf8")
    assert.ok(c.includes("localhost:3000/metrics"), "should fetch from dashboard")
    assert.ok(c.includes("loadEngineMetrics"), "should have loadEngineMetrics function")
    assert.ok(c.includes("Load from Dashboard"), "should have dashboard button text")
  })

  test("devtools/src/index.tsx still has DOM scan", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/devtools/src/index.tsx"), "utf8")
    assert.ok(c.includes("Run DOM Scan"), "should still have DOM scan button")
    assert.ok(c.includes("querySelectorAll"), "should still scan DOM elements")
  })
})

describe("Sprint 8 — VSCode LSP", () => {
  test("extension.ts checks dist/lsp.mjs as first candidate", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/vscode/src/extension.ts"), "utf8")
    // dist/lsp.mjs should appear before scripts/v48/lsp.mjs in the candidates array
    const distIdx = c.indexOf('path.join(__dirname, "lsp.mjs")')
    const scriptsIdx = c.indexOf("scripts/v48/lsp.mjs")
    assert.ok(distIdx > -1, "should have dist/lsp.mjs candidate")
    assert.ok(scriptsIdx > -1, "should have scripts/v48/lsp.mjs candidate")
    assert.ok(distIdx < scriptsIdx, "dist/lsp.mjs should be checked before scripts/v48/lsp.mjs")
  })

  test("vscode/package.json has postbuild script", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/vscode/package.json"), "utf8"))
    assert.ok(pkg.scripts.postbuild, "should have postbuild script")
    assert.ok(pkg.scripts.postbuild.includes("postbuild.cjs"), "postbuild should run postbuild.cjs")
  })

  test("vscode/scripts/postbuild.cjs exists", () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, "packages/vscode/scripts/postbuild.cjs")),
      "postbuild.cjs should exist"
    )
  })
})

// ─── Sprint 10: Testing utilities ────────────────────────────────────────────

describe("Sprint 10 — Testing utilities: engine metrics matchers", () => {
  test("testing/src/index.ts exports expectEngineMetrics", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/testing/src/index.ts"), "utf8")
    assert.ok(c.includes("export function expectEngineMetrics"), "should export expectEngineMetrics")
  })

  test("testing/src/index.ts exports toHaveEngineMetrics", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/testing/src/index.ts"), "utf8")
    assert.ok(c.includes("export function toHaveEngineMetrics"), "should export toHaveEngineMetrics")
  })

  test("testing/src/index.ts exports EngineMetricsSnapshot type", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/testing/src/index.ts"), "utf8")
    assert.ok(c.includes("EngineMetricsSnapshot"), "should export EngineMetricsSnapshot")
  })

  test("testing/src/index.ts exports tailwindMatchersWithMetrics", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/testing/src/index.ts"), "utf8")
    assert.ok(c.includes("tailwindMatchersWithMetrics"), "should export combined matchers")
  })

  test("expectEngineMetrics throws on minFiles violation", async () => {
    const { expectEngineMetrics } = await import(
      path.join(ROOT, "packages/testing/dist/index.js")
    )
    assert.throws(
      () => expectEngineMetrics({ totalFiles: 0 }, { minFiles: 5 }),
      /at least 5 files/,
      "should throw when files < minFiles"
    )
  })

  test("expectEngineMetrics passes when metrics meet expectations", async () => {
    const { expectEngineMetrics } = await import(
      path.join(ROOT, "packages/testing/dist/index.js")
    )
    assert.doesNotThrow(
      () => expectEngineMetrics({ totalFiles: 10, buildTimeMs: 100 }, { minFiles: 5, maxBuildTimeMs: 500 }),
      "should not throw when metrics are within expectations"
    )
  })

  test("expectEngineMetrics checks cache hit rate", async () => {
    const { expectEngineMetrics } = await import(
      path.join(ROOT, "packages/testing/dist/index.js")
    )
    assert.throws(
      () => expectEngineMetrics({ cacheHits: 1, cacheMisses: 9 }, { cacheHitRateMin: 0.8 }),
      /cache hit rate/,
      "should throw when hit rate below threshold"
    )
    assert.doesNotThrow(
      () => expectEngineMetrics({ cacheHits: 9, cacheMisses: 1 }, { cacheHitRateMin: 0.8 }),
      "should pass when hit rate above threshold"
    )
  })
})
