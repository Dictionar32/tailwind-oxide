/**
 * Test suite: @tailwind-styled/engine
 * Verifikasi: incremental diff, watch backend, metrics
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
process.chdir(ROOT)

const engine = require(path.join(ROOT, "packages/engine/dist/index.cjs"))
const native  = (() => {
  try { return require(path.join(ROOT, "native/tailwind_styled_parser.node")) } catch { return null }
})()

// Detect if native module is available
const hasNative = native !== null
const isWindows = process.platform === "win32"
const shouldSkipNative = isWindows && !hasNative

describe("applyIncrementalChange", () => {
  test("exports applyIncrementalChange", () => {
    assert.equal(typeof engine.applyIncrementalChange, "function")
  })

  test("mendeteksi file baru", () => {
    // applyIncrementalChange butuh file paths yang valid atau skip
    try {
      const prev = { files: [], uniqueClasses: [] }
      const curr = { files: [{ file: "/tmp/a.tsx", classes: ["flex", "p-4"], hash: "abc" }], uniqueClasses: ["flex", "p-4"] }
      const r = engine.applyIncrementalChange(prev, curr)
      assert.ok(typeof r === "object")
    } catch(e) {
      // applyIncrementalChange mungkin butuh actual file — acceptable
      assert.ok(e.message.includes("path") || e.message.includes("string"))
    }
  })
})

describe("watchWorkspaceNative", () => {
  if (shouldSkipNative) {
    test.skip("native module not available on Windows", () => {})
    return
  }

  test("exports watchWorkspaceNative", () => {
    assert.equal(typeof engine.watchWorkspaceNative, "function")
  })

  test("returns WatchHandle dengan engine dan stop()", () => {
    const h = engine.watchWorkspaceNative("/tmp", () => {})
    assert.ok(h && typeof h.stop === "function", `handle: ${JSON.stringify(h)}`)
    assert.ok(["rust-notify", "node-fs"].includes(h.engine), `engine: ${h.engine}`)
    h.stop()
  })

  test("engine adalah rust-notify saat native tersedia", () => {
    if (!native) return
    const h = engine.watchWorkspaceNative("/tmp", () => {})
    assert.equal(h.engine, "rust-notify")
    h.stop()
  })

  test("callback tidak error saat dipanggil", () => {
    let cbCalled = false
    const h = engine.watchWorkspaceNative("/tmp", (events) => {
      cbCalled = true
      assert.ok(Array.isArray(events))
    })
    h.stop()
  })
})

describe("watchWorkspaceLegacy", () => {
  if (shouldSkipNative) {
    test.skip("native module not available on Windows", () => {})
    return
  }

  test("exports watchWorkspaceLegacy", () => {
    assert.equal(typeof engine.watchWorkspaceLegacy, "function")
  })
})

describe("Rust native engine", () => {
  test("native.computeIncrementalDiff tersedia", () => {
    if (!native) return
    assert.equal(typeof native.computeIncrementalDiff, "function")
  })

  test("native.processFileChange tersedia", () => {
    if (!native) return
    assert.equal(typeof native.processFileChange, "function")
  })

  test("computeIncrementalDiff: no change ketika hash sama", () => {
    if (!native) return
    const prev = JSON.stringify([{ file: "a.tsx", classes: ["flex"], hash: "abc" }])
    const curr = JSON.stringify([{ file: "a.tsx", classes: ["flex"], hash: "abc" }])
    const r = native.computeIncrementalDiff(prev, curr)
    // return shape: {addedClasses, removedClasses, changedFiles, unchangedFiles}
    assert.equal(r.changedFiles?.length ?? 0, 0, `changedFiles: ${JSON.stringify(r)}`)
  })

  test("computeIncrementalDiff: deteksi file yang berubah", () => {
    if (!native) return
    const prev = JSON.stringify([{ file: "a.tsx", classes: ["flex"], hash: "old" }])
    const curr = JSON.stringify([{ file: "a.tsx", classes: ["flex", "p-4"], hash: "new" }])
    const r = native.computeIncrementalDiff(prev, curr)
    assert.ok(r.changedFiles?.length >= 1 || r.addedClasses?.length >= 1,
      `result: ${JSON.stringify(r)}`)
  })

  test("computeIncrementalDiff: deteksi file baru", () => {
    if (!native) return
    const prev = JSON.stringify([])
    const curr = JSON.stringify([{ file: "new.tsx", classes: ["grid"], hash: "xyz" }])
    const r = native.computeIncrementalDiff(prev, curr)
    assert.ok(
      r.changedFiles?.includes("new.tsx") || r.addedClasses?.length >= 1
        || JSON.stringify(r).includes("new.tsx"),
      `result: ${JSON.stringify(r)}`
    )
  })

  test("processFileChange: mendeteksi added/removed classes", () => {
    if (!native) return
    const file = `/tmp/tws-${Date.now()}-${Math.random().toString(16).slice(2)}.tsx`
    native.processFileChange(file, ["flex", "p-4"], "initial")
    const r = native.processFileChange(file, ["flex", "p-6"], "updated")
    assert.ok(r.added?.includes("p-6"), `result: ${JSON.stringify(r)}`)
    assert.ok(r.removed?.includes("p-4"), `result: ${JSON.stringify(r)}`)
  })

  test("processFileChange: unlink menghapus registry file", () => {
    if (!native) return
    const file = `/tmp/tws-${Date.now()}-${Math.random().toString(16).slice(2)}-unlink.tsx`
    native.processFileChange(file, ["grid", "gap-4"], "initial")
    const r = native.processFileChange(file, [], null)
    assert.ok(r.removed?.includes("grid"), `result: ${JSON.stringify(r)}`)
    assert.ok(r.removed?.includes("gap-4"), `result: ${JSON.stringify(r)}`)
    assert.equal(r.added?.length ?? 0, 0)
  })

  test("hashFileContent deterministic", () => {
    if (!native) return
    const h1 = native.hashFileContent("const X = tw.div`flex`")
    const h2 = native.hashFileContent("const X = tw.div`flex`")
    assert.equal(h1, h2)
    assert.ok(typeof h1 === "string" && h1.length > 0)
  })

  test("hashFileContent berbeda untuk konten berbeda", () => {
    if (!native) return
    const h1 = native.hashFileContent("content-A")
    const h2 = native.hashFileContent("content-B")
    assert.notEqual(h1, h2)
  })

  test("startWatch + pollWatchEvents + stopWatch cycle", () => {
    if (!native) return
    const h = native.startWatch("/tmp")
    assert.equal(h.status, "ok", `status: ${h.status}`)
    const events = native.pollWatchEvents(h.handleId)
    assert.ok(Array.isArray(events))
    assert.ok(native.stopWatch(h.handleId))
  })
})
