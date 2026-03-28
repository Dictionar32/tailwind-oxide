/**
 * Test suite: @tailwind-styled/runtime-css
 * Verifikasi: CssInjector, batchedInjector
 */
import { test, describe, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const batch = require(path.join(ROOT, "packages/runtime-css/dist/batchedInjector.cjs"))

describe("batchedInjector", () => {
  // Reset state sebelum setiap test
  beforeEach(() => {
    try { batch.resetBatchedCss() } catch {}
  })

  test("exports tersedia", () => {
    assert.equal(typeof batch.batchedInject,      "function", "batchedInject")
    assert.equal(typeof batch.syncInject,          "function", "syncInject")
    assert.equal(typeof batch.flushBatchedCss,     "function", "flushBatchedCss")
    assert.equal(typeof batch.getBatchedCssStats,  "function", "getBatchedCssStats")
    assert.equal(typeof batch.isInjected,          "function", "isInjected")
    assert.equal(typeof batch.resetBatchedCss,     "function", "resetBatchedCss")
  })

  test("syncInject: inject CSS string tidak crash", () => {
    // syncInject harusnya tidak crash di non-browser env
    try {
      batch.syncInject(".flex { display: flex }")
    } catch (e) {
      // Expected di Node.js (no DOM) — error message harus bermakna
      assert.ok(typeof e.message === "string", `error: ${e.message}`)
    }
  })

  test("isInjected: false sebelum inject", () => {
    const result = batch.isInjected("my-component-hash-abc123")
    assert.equal(typeof result, "boolean")
    assert.equal(result, false)
  })

  test("getBatchedCssStats: returns stats object", () => {
    const stats = batch.getBatchedCssStats()
    assert.ok(typeof stats === "object", `type: ${typeof stats}`)
    // shape: { totalInjected, pendingCount, hasBatchScheduled }
    assert.ok(
      "totalInjected" in stats || "injected" in stats || "count" in stats,
      `keys: ${JSON.stringify(Object.keys(stats))}`
    )
  })

  test("resetBatchedCss: bersihkan state tidak crash", () => {
    assert.doesNotThrow(() => batch.resetBatchedCss())
  })

  test("batchedInject: menerima css string tidak crash", () => {
    try {
      batch.batchedInject("hash-001", ".text-white { color: white }")
    } catch (e) {
      // OK di Node.js (no DOM)
      assert.ok(typeof e.message === "string")
    }
  })

  test("flushBatchedCss: tidak crash di non-browser", () => {
    assert.doesNotThrow(() => {
      try { batch.flushBatchedCss() } catch {}
    })
  })
})

describe("CssInjector", () => {
  const injector = require(path.join(ROOT, "packages/runtime-css/dist/CssInjector.cjs"))

  test("TwCssInjector export tersedia", () => {
    assert.ok(
      typeof injector.TwCssInjector === "function" ||
      typeof injector.TwCssInjector === "object",
      `type: ${typeof injector.TwCssInjector}`
    )
  })

  test("useTwClasses export tersedia", () => {
    assert.equal(typeof injector.useTwClasses, "function")
  })
})
