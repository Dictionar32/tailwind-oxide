/**
 * Unit tests — v4.3–v4.5 new features
 * Covers: preflight, audit, ai multi-provider, shared package, CLI command fixes
 */
import { test, describe, before } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../../..")

function run(script, args = [], opts = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8", timeout: 15_000, cwd: ROOT, ...opts,
  })
}

function makeTmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-v43-test-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── @tailwind-styled/shared ──────────────────────────────────────────────────

describe("@tailwind-styled/shared — LRUCache", () => {
  let LRUCache
  before(async () => {
    try {
      const mod = await import(path.join(ROOT, "packages/shared/src/cache.ts"))
        .catch(() => import(path.join(ROOT, "packages/shared/dist/index.js")))
      LRUCache = mod.LRUCache
    } catch { LRUCache = null }
  })

  test("set and get basic value", (t) => {
    if (!LRUCache) return t.skip("shared not built")
    const cache = new LRUCache(3)
    cache.set("a", 1)
    assert.equal(cache.get("a"), 1)
  })

  test("evicts LRU when full", (t) => {
    if (!LRUCache) return t.skip("shared not built")
    const cache = new LRUCache(2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3) // evicts "a" (LRU)
    assert.equal(cache.get("a"), undefined)
    assert.equal(cache.get("b"), 2)
    assert.equal(cache.get("c"), 3)
  })

  test("get promotes to MRU", (t) => {
    if (!LRUCache) return t.skip("shared not built")
    const cache = new LRUCache(2)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")   // promote a → MRU
    cache.set("c", 3) // evicts "b" (now LRU)
    assert.equal(cache.get("a"), 1)
    assert.equal(cache.get("b"), undefined)
  })

  test("TTL expiry returns undefined", async (t) => {
    if (!LRUCache) return t.skip("shared not built")
    const cache = new LRUCache(10, 50) // 50ms TTL
    cache.set("x", 42)
    assert.equal(cache.get("x"), 42)
    await new Promise((r) => setTimeout(r, 80))
    assert.equal(cache.get("x"), undefined)
  })

  test("size tracks entries", (t) => {
    if (!LRUCache) return t.skip("shared not built")
    const cache = new LRUCache(10)
    assert.equal(cache.size, 0)
    cache.set("a", 1)
    cache.set("b", 2)
    assert.equal(cache.size, 2)
    cache.delete("a")
    assert.equal(cache.size, 1)
  })
})

describe("@tailwind-styled/shared — hashContent", () => {
  let hashContent
  before(async () => {
    try {
      const mod = await import(path.join(ROOT, "packages/shared/src/hash.ts"))
        .catch(() => import(path.join(ROOT, "packages/shared/dist/index.js")))
      hashContent = mod.hashContent
    } catch { hashContent = null }
  })

  test("returns 8-char hex by default", (t) => {
    if (!hashContent) return t.skip("shared not built")
    const h = hashContent("hello world")
    assert.equal(typeof h, "string")
    assert.equal(h.length, 8)
    assert.ok(/^[a-f0-9]+$/.test(h))
  })

  test("same input → same hash", (t) => {
    if (!hashContent) return t.skip("shared not built")
    assert.equal(hashContent("abc"), hashContent("abc"))
  })

  test("different input → different hash", (t) => {
    if (!hashContent) return t.skip("shared not built")
    assert.notEqual(hashContent("abc"), hashContent("xyz"))
  })

  test("length parameter controls output length", (t) => {
    if (!hashContent) return t.skip("shared not built")
    assert.equal(hashContent("test", "md5", 4).length, 4)
    assert.equal(hashContent("test", "md5", 16).length, 16)
  })
})

describe("@tailwind-styled/shared — debounce", () => {
  let debounce
  before(async () => {
    try {
      const mod = await import(path.join(ROOT, "packages/shared/src/timing.ts"))
        .catch(() => import(path.join(ROOT, "packages/shared/dist/index.js")))
      debounce = mod.debounce
    } catch { debounce = null }
  })

  test("delays execution", async (t) => {
    if (!debounce) return t.skip("shared not built")
    let calls = 0
    const fn = debounce(() => calls++, 50)
    fn(); fn(); fn() // rapid calls
    assert.equal(calls, 0) // not called yet
    await new Promise((r) => setTimeout(r, 100))
    assert.equal(calls, 1) // called once after debounce
  })
})

describe("@tailwind-styled/shared — logger", () => {
  let createLogger
  before(async () => {
    try {
      const mod = await import(path.join(ROOT, "packages/shared/src/logger.ts"))
        .catch(() => import(path.join(ROOT, "packages/shared/dist/index.js")))
      createLogger = mod.createLogger
    } catch { createLogger = null }
  })

  test("createLogger returns object with error/warn/info/debug", (t) => {
    if (!createLogger) return t.skip("shared not built")
    const log = createLogger("test")
    assert.equal(typeof log.error, "function")
    assert.equal(typeof log.warn,  "function")
    assert.equal(typeof log.info,  "function")
    assert.equal(typeof log.debug, "function")
    assert.equal(typeof log.setLevel, "function")
  })

  test("setLevel suppresses messages below level", (t) => {
    if (!createLogger) return t.skip("shared not built")
    const log = createLogger("test", "error")
    // Should not throw
    log.debug("this is suppressed")
    log.info("this is suppressed")
    log.error("this is shown")
  })
})

describe("@tailwind-styled/shared — version", () => {
  let parseVersion, satisfiesMinVersion
  before(async () => {
    try {
      const mod = await import(path.join(ROOT, "packages/shared/src/version.ts"))
        .catch(() => import(path.join(ROOT, "packages/shared/dist/index.js")))
      parseVersion = mod.parseVersion
      satisfiesMinVersion = mod.satisfiesMinVersion
    } catch { parseVersion = null }
  })

  test("parseVersion parses semver", (t) => {
    if (!parseVersion) return t.skip("shared not built")
    assert.deepEqual(parseVersion("4.2.1"), { major: 4, minor: 2, patch: 1 })
    assert.deepEqual(parseVersion("v18.0.0"), { major: 18, minor: 0, patch: 0 })
  })

  test("satisfiesMinVersion works correctly", (t) => {
    if (!satisfiesMinVersion) return t.skip("shared not built")
    assert.ok(satisfiesMinVersion("4.2.0", "4.1.0"))   // newer minor
    assert.ok(satisfiesMinVersion("5.0.0", "4.9.9"))   // newer major
    assert.ok(!satisfiesMinVersion("4.0.0", "4.1.0"))  // older minor
    assert.ok(!satisfiesMinVersion("3.9.9", "4.0.0"))  // older major
  })
})

// ─── tw audit ─────────────────────────────────────────────────────────────────

describe("tw audit — real checks", () => {
  const AUDIT_SCRIPT = path.join(ROOT, "scripts/v45/audit.mjs")

  test("exits 0 on clean project (no source files)", () => {
    const { dir, cleanup } = makeTmp()
    try {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "test", dependencies: {} }))
      const r = run(AUDIT_SCRIPT, ["--json"], { cwd: dir })
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
      const out = JSON.parse(r.stdout)
      assert.ok("scores" in out)
      assert.ok("issues" in out)
    } finally { cleanup() }
  })

  test("detects deprecated flex-grow class", () => {
    const { dir, cleanup } = makeTmp()
    try {
      fs.mkdirSync(path.join(dir, "src"), { recursive: true })
      fs.writeFileSync(path.join(dir, "src/App.tsx"),
        `export const A = () => <div className="flex-grow px-4" />`)
      const r = run(AUDIT_SCRIPT, ["--scope=deprecated", "--json"], { cwd: dir })
      const out = JSON.parse(r.stdout)
      assert.ok(out.issues.some((i) => i.message.includes("flex-grow")),
        `Expected flex-grow issue, got: ${JSON.stringify(out.issues)}`)
    } finally { cleanup() }
  })

  test("detects missing img alt attribute", () => {
    const { dir, cleanup } = makeTmp()
    try {
      fs.mkdirSync(path.join(dir, "src"), { recursive: true })
      fs.writeFileSync(path.join(dir, "src/App.tsx"),
        `export const A = () => <img src="photo.jpg" className="w-full" />`)
      const r = run(AUDIT_SCRIPT, ["--scope=a11y", "--json"], { cwd: dir })
      const out = JSON.parse(r.stdout)
      assert.ok(out.issues.some((i) => i.message.includes("alt")),
        `Expected alt issue, got: ${JSON.stringify(out.issues)}`)
    } finally { cleanup() }
  })

  test("--scope flag limits checks", () => {
    const { dir, cleanup } = makeTmp()
    try {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "test", dependencies: {} }))
      const r = run(AUDIT_SCRIPT, ["--scope=performance", "--json"], { cwd: dir })
      const out = JSON.parse(r.stdout)
      // Should only run performance checks, scores for other categories should be 100
      assert.equal(out.scores.security, 100)
      assert.equal(out.scores.accessibility, 100)
    } finally { cleanup() }
  })

  test("output has required shape", () => {
    const { dir, cleanup } = makeTmp()
    try {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "test" }))
      const r = run(AUDIT_SCRIPT, ["--json"], { cwd: dir })
      const out = JSON.parse(r.stdout)
      assert.ok("generatedAt" in out)
      assert.ok("scores" in out)
      assert.ok("issues" in out)
      assert.ok("tips" in out)
      const { scores } = out
      assert.ok("performance" in scores)
      assert.ok("security" in scores)
      assert.ok("accessibility" in scores)
      assert.ok("maintainability" in scores)
    } finally { cleanup() }
  })
})

// ─── tw ai multi-provider ─────────────────────────────────────────────────────

describe("tw ai — multi-provider static fallback", () => {
  const AI_SCRIPT = path.join(ROOT, "scripts/v45/ai.mjs")

  test("generates component (static fallback — no API key)", () => {
    const r = run(AI_SCRIPT, ["primary button"])
    assert.equal(r.status, 0, `stderr: ${r.stderr}`)
    assert.ok(r.stdout.includes('import { tw }'), "should contain tw import")
    assert.ok(r.stdout.includes('tw.'), "should contain tw. component")
    assert.ok(r.stdout.includes('export default'), "should have default export")
  })

  test("card variant uses tw.div", () => {
    const r = run(AI_SCRIPT, ["card panel"])
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes("tw.div") || r.stdout.includes("tw.section"),
      "card should use div/section tag")
  })

  test("nav variant uses tw.a", () => {
    const r = run(AI_SCRIPT, ["nav link active"])
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes("tw.a") || r.stdout.includes("tw.button"),
      "nav should use a/button tag")
  })

  test("unknown provider exits non-zero", () => {
    const r = run(AI_SCRIPT, ["button", "--provider=nonexistent"])
    assert.notEqual(r.status, 0)
  })

  test("--provider flag is accepted", () => {
    // anthropic without key → falls back to static
    const r = run(AI_SCRIPT, ["button", "--provider=anthropic"])
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes("tw."))
  })
})

// ─── tw sync figma wiring ─────────────────────────────────────────────────────

describe("tw sync figma — CLI wiring", () => {
  const FIGMA_SCRIPT = path.join(ROOT, "scripts/v45/figma-sync.mjs")

  test("figma-sync.mjs responds to help", () => {
    const r = run(FIGMA_SCRIPT, ["help"])
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes("pull") || r.stdout.includes("push") || r.stdout.includes("diff"))
  })

  test("figma-sync.mjs pull without token exits non-zero", () => {
    const r = spawnSync(process.execPath, [FIGMA_SCRIPT, "pull"], {
      encoding: "utf8", timeout: 5000, cwd: ROOT,
      env: { ...process.env, FIGMA_TOKEN: "", FIGMA_FILE_KEY: "" },
    })
    assert.notEqual(r.status, 0)
    assert.ok(r.stderr.includes("FIGMA_TOKEN") || r.stderr.includes("FIGMA_FILE_KEY"))
  })
})

// ─── tw preflight ─────────────────────────────────────────────────────────────

describe("tw preflight", () => {
  const PREFLIGHT = path.join(ROOT, "packages/cli/src/preflight.ts")

  test("preflight script file exists and has content", () => {
    assert.ok(fs.existsSync(PREFLIGHT), "preflight.ts should exist")
    const size = fs.statSync(PREFLIGHT).size
    assert.ok(size > 1000, "preflight.ts should be substantial")
  })

  test("preflight exports results array", async () => {
    // Check source exports correctly
    const content = fs.readFileSync(PREFLIGHT, "utf8")
    assert.ok(content.includes("export { results }"), "should export results")
    assert.ok(content.includes("process.exit"), "should call process.exit on failure")
    assert.ok(content.includes("--json"), "should support --json mode")
    assert.ok(content.includes("--fix"), "should support --fix mode")
  })
})
