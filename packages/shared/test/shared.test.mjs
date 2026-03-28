/**
 * Test suite: @tailwind-styled/shared
 * Verifikasi: LRUCache, logger, hash utilities, parseVersion
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const shared = require(path.join(ROOT, "packages/shared/dist/index.cjs"))

describe("LRUCache", () => {
  test("set dan get basic", () => {
    const cache = new shared.LRUCache(3)
    cache.set("a", 1)
    cache.set("b", 2)
    assert.equal(cache.get("a"), 1)
    assert.equal(cache.get("b"), 2)
  })

  test("evict entry terlama saat capacity penuh", () => {
    const cache = new shared.LRUCache(2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3) // evict "a"
    assert.equal(cache.get("a"), undefined)
    assert.equal(cache.get("b"), 2)
    assert.equal(cache.get("c"), 3)
  })

  test("get memperbarui LRU order", () => {
    const cache = new shared.LRUCache(2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")    // access "a" → now most recent
    cache.set("c", 3) // evict "b", bukan "a"
    assert.equal(cache.get("a"), 1)
    assert.equal(cache.get("b"), undefined)
  })

  test("has() returns boolean", () => {
    const cache = new shared.LRUCache(5)
    cache.set("x", 42)
    assert.equal(cache.has("x"), true)
    assert.equal(cache.has("y"), false)
  })

  test("delete() removes entry", () => {
    const cache = new shared.LRUCache(5)
    cache.set("x", 42)
    cache.delete("x")
    assert.equal(cache.get("x"), undefined)
  })

  test("clear() kosongkan cache", () => {
    const cache = new shared.LRUCache(5)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.clear()
    assert.equal(cache.get("a"), undefined)
    assert.equal(cache.size, 0)
  })
})

describe("hashContent", () => {
  test("returns string hash", () => {
    const h = shared.hashContent("hello world")
    assert.equal(typeof h, "string")
    assert.ok(h.length > 0)
  })

  test("sama untuk input sama", () => {
    const h1 = shared.hashContent("test content")
    const h2 = shared.hashContent("test content")
    assert.equal(h1, h2)
  })

  test("berbeda untuk input berbeda", () => {
    const h1 = shared.hashContent("content-A")
    const h2 = shared.hashContent("content-B")
    assert.notEqual(h1, h2)
  })
})

describe("parseVersion", () => {
  test("parse semver string", () => {
    const v = shared.parseVersion("4.2.1")
    assert.equal(v.major, 4)
    assert.equal(v.minor, 2)
    assert.equal(v.patch, 1)
  })

  test("handle versi dengan v prefix", () => {
    const v = shared.parseVersion("v3.0.0")
    assert.equal(v.major, 3)
  })
})

describe("satisfiesMinVersion", () => {
  test("4.2.0 satisfies min 4.0.0", () => {
    assert.equal(shared.satisfiesMinVersion("4.2.0", "4.0.0"), true)
  })

  test("3.9.0 tidak satisfies min 4.0.0", () => {
    assert.equal(shared.satisfiesMinVersion("3.9.0", "4.0.0"), false)
  })

  test("sama versi: satisfies", () => {
    assert.equal(shared.satisfiesMinVersion("4.0.0", "4.0.0"), true)
  })
})

describe("debounce", () => {
  test("debounce delays execution", async () => {
    let count = 0
    const fn = shared.debounce(() => { count++ }, 50)
    fn(); fn(); fn()
    assert.equal(count, 0) // belum dipanggil
    await new Promise(r => setTimeout(r, 80))
    assert.equal(count, 1) // hanya dipanggil sekali
  })
})

describe("createLogger", () => {
  test("createLogger returns object dengan methods", () => {
    const log = shared.createLogger("test")
    assert.equal(typeof log.info, "function")
    assert.equal(typeof log.warn, "function")
    assert.equal(typeof log.error, "function")
  })
})
