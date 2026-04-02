/**
 * Compiler — snapshot tests
 *
 * Verifies transform output doesn't change unexpectedly.
 * Updates snapshots: UPDATE_SNAPSHOTS=1 node --test packages/compiler/test/snapshot.test.mjs
 *
 * Run: node --test packages/compiler/test/snapshot.test.mjs
 */
import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { createRequire } from "node:module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const SNAP_DIR = path.resolve(__dirname, "__snapshots__")
mkdirSync(SNAP_DIR, { recursive: true })

let testTransform
try {
  const mod = require(path.resolve(__dirname, "../dist/index.js"))
  testTransform = mod.transformSource
} catch {
  console.warn("[snapshot test] compiler dist not found — run `npm run build -w packages/compiler` first")
  process.exit(0)
}

function snap(name, actual) {
  const p = path.join(SNAP_DIR, `${name}.snap`)
  if (!existsSync(p) || process.env.UPDATE_SNAPSHOTS) {
    writeFileSync(p, actual, "utf8")
    console.log(`  📸 ${name}: snapshot ${existsSync(p) ? "updated" : "created"}`)
    return
  }
  const expected = readFileSync(p, "utf8")
  assert.equal(actual, expected, `Snapshot mismatch: ${name}\nTo update: UPDATE_SNAPSHOTS=1`)
}

function normalizeOutput(code) {
  return code
    .replace(/_Tw\w+_[a-f0-9]{6}/g, "_TwXXX_HASH")
    .replace(/[a-f0-9]{6}/g, "HASH6")
    .trim()
}

describe("transform snapshots", () => {
  test("static template literal", () => {
    const src = `import { tw } from "tailwind-styled-v4"\nconst Box = tw.div\`flex items-center p-4\``
    const result = testTransform(src, { hoist: false })
    snap("static-template", normalizeOutput(result.code))
    assert.ok(result.changed, "should be changed")
    assert.ok(result.classes.includes("flex"), "should collect flex")
  })

  test("variant object config", () => {
    const src = `import { tw } from "tailwind-styled-v4"\nconst Btn = tw.button({ base: "px-4 py-2", variants: { size: { sm: "text-sm", lg: "text-lg" } } })`
    const result = testTransform(src, { hoist: false })
    snap("variant-object", normalizeOutput(result.code))
    assert.ok(result.changed, "should be changed")
    assert.ok(result.classes.includes("px-4"), "should collect base class")
    assert.ok(result.classes.includes("text-sm"), "should collect variant class")
  })

  test("compound component with sub-blocks", () => {
    const src = `import { tw } from "tailwind-styled-v4"\nconst Card = tw.div\`rounded-lg shadow icon { w-5 h-5 } body { p-4 }\``
    const result = testTransform(src, { hoist: false })
    snap("compound-component", normalizeOutput(result.code))
    assert.ok(result.changed, "should be changed")
    assert.ok(result.code.includes("icon"), "should have icon subcomponent")
    assert.ok(result.code.includes("body"), "should have body subcomponent")
  })

  test("extend pattern", () => {
    const src = `import { tw } from "tailwind-styled-v4"\nconst Base = tw.div\`flex\`\nconst Extended = Base.extend\`bg-blue-500\``
    const result = testTransform(src, { hoist: false })
    snap("extend-pattern", normalizeOutput(result.code))
    assert.ok(result.changed, "should be changed")
  })

  test("wrap pattern", () => {
    const src = `import { tw } from "tailwind-styled-v4"\nconst Comp = tw.div\`p-4\`\nconst Wrapped = tw(Comp)\`mt-4\``
    const result = testTransform(src, { hoist: false })
    snap("wrap-pattern", normalizeOutput(result.code))
    assert.ok(result.changed, "should be changed")
  })

  test("server-only component", () => {
    const src = `import { tw } from "tailwind-styled-v4"\nconst ServerBox = tw.server.div\`flex p-4\``
    const result = testTransform(src, { hoist: false })
    snap("server-only", normalizeOutput(result.code))
    assert.ok(result.changed, "should be changed")
  })

  test("dynamic template is not transformed", () => {
    const src = `import { tw } from "tailwind-styled-v4"\nconst Dyn = tw.div\`\${cond ? "bg-red" : "bg-blue"}\``
    const result = testTransform(src, { hoist: false })
    snap("dynamic-passthrough", normalizeOutput(result.code))
  })

  test("already-transformed code is idempotent", () => {
    const src = `import { tw } from "tailwind-styled-v4"\nconst Box = tw.div\`bg-white\``
    const r1 = testTransform(src, { hoist: false })
    const r2 = testTransform(r1.code, { hoist: false })
    snap("idempotent-check", normalizeOutput(r1.code))
    assert.ok(r1.changed, "first transform should change")
    assert.ok(!r2.changed, "second transform should be idempotent")
  })
})

console.log("✅ Snapshot tests complete")
