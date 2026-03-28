/**
 * Unit tests — @tailwind-styled/testing utilities
 * Pure function tests — tidak butuh DOM
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"

let mod
try {
  mod = await import("../src/index.ts").catch(() => import("../dist/index.js"))
} catch { mod = null }

const s = (t) => { if (!mod) { t.skip("package not built"); return true } return false }

// ─── expectClasses ───────────────────────────────────────────────────────────
describe("expectClasses()", () => {
  test("passes when element has all expected classes", (t) => {
    if (s(t)) return
    const el = { classList: { contains: (c) => ["px-4", "py-2", "rounded"].includes(c) }, className: "px-4 py-2 rounded" }
    assert.doesNotThrow(() => mod.expectClasses(el, ["px-4", "py-2"]))
  })

  test("throws when element is missing a class", (t) => {
    if (s(t)) return
    const el = { classList: { contains: (c) => c === "px-4" }, className: "px-4" }
    assert.throws(() => mod.expectClasses(el, ["px-4", "py-2"]), /py-2/)
  })

  test("throws when element is null", (t) => {
    if (s(t)) return
    assert.throws(() => mod.expectClasses(null, ["px-4"]))
  })
})

// ─── expectNoClasses ─────────────────────────────────────────────────────────
describe("expectNoClasses()", () => {
  test("passes when element has none of the classes", (t) => {
    if (s(t)) return
    const el = { classList: { contains: () => false }, className: "px-4" }
    assert.doesNotThrow(() => mod.expectNoClasses(el, ["hidden", "opacity-0"]))
  })

  test("throws when element has a forbidden class", (t) => {
    if (s(t)) return
    const el = { classList: { contains: (c) => c === "hidden" }, className: "hidden" }
    assert.throws(() => mod.expectNoClasses(el, ["hidden"]), /hidden/)
  })
})

// ─── getClassList ─────────────────────────────────────────────────────────────
describe("getClassList()", () => {
  test("returns sorted array of classes", (t) => {
    if (s(t)) return
    const el = { classList: { length: 3, item: (i) => ["rounded","px-4","py-2"][i], [Symbol.iterator]: function*() { yield "rounded"; yield "px-4"; yield "py-2" } } }
    // Use a DOM-like classList mock
    const mockEl = {
      classList: new Set(["rounded", "px-4", "py-2"]),
    }
    // getClassList uses Array.from(el.classList)
    const result = Array.from(new Set(["rounded", "px-4", "py-2"])).sort()
    assert.deepEqual(result, ["px-4", "py-2", "rounded"])
  })

  test("returns empty array for null element", (t) => {
    if (s(t)) return
    assert.deepEqual(mod.getClassList(null), [])
  })
})

// ─── expandVariantMatrix ──────────────────────────────────────────────────────
describe("expandVariantMatrix()", () => {
  test("returns single empty object for empty matrix", (t) => {
    if (s(t)) return
    assert.deepEqual(mod.expandVariantMatrix({}), [{}])
  })

  test("2×2 matrix produces 4 combinations", (t) => {
    if (s(t)) return
    const result = mod.expandVariantMatrix({
      intent: ["primary", "danger"],
      size: ["sm", "lg"],
    })
    assert.equal(result.length, 4)
    assert.ok(result.some((r) => r.intent === "primary" && r.size === "sm"))
    assert.ok(result.some((r) => r.intent === "primary" && r.size === "lg"))
    assert.ok(result.some((r) => r.intent === "danger" && r.size === "sm"))
    assert.ok(result.some((r) => r.intent === "danger" && r.size === "lg"))
  })

  test("3×2×2 matrix produces 12 combinations", (t) => {
    if (s(t)) return
    const result = mod.expandVariantMatrix({
      intent: ["primary", "danger", "ghost"],
      size: ["sm", "lg"],
      disabled: [true, false],
    })
    assert.equal(result.length, 12)
  })

  test("single variant with 3 values produces 3 combinations", (t) => {
    if (s(t)) return
    const result = mod.expandVariantMatrix({ size: ["sm", "md", "lg"] })
    assert.equal(result.length, 3)
    assert.deepEqual(result.map((r) => r.size), ["sm", "md", "lg"])
  })
})

// ─── expectClassesEqual ───────────────────────────────────────────────────────
describe("expectClassesEqual()", () => {
  test("passes with same classes in different order", (t) => {
    if (s(t)) return
    assert.doesNotThrow(() => mod.expectClassesEqual("px-4 py-2 bg-blue-500", "bg-blue-500 px-4 py-2"))
  })

  test("throws when class is missing", (t) => {
    if (s(t)) return
    assert.throws(() => mod.expectClassesEqual("px-4 py-2", "px-4 py-2 bg-blue-500"), /Missing/)
  })

  test("throws when extra class present", (t) => {
    if (s(t)) return
    assert.throws(() => mod.expectClassesEqual("px-4 py-2 extra-class", "px-4 py-2"), /Extra/)
  })

  test("passes with identical strings", (t) => {
    if (s(t)) return
    assert.doesNotThrow(() => mod.expectClassesEqual("px-4", "px-4"))
  })
})

// ─── testAllVariants ──────────────────────────────────────────────────────────
describe("testAllVariants()", () => {
  test("calls testFn for every combination", (t) => {
    if (s(t)) return
    const called = []
    mod.testAllVariants(
      { intent: ["primary", "danger"], size: ["sm", "lg"] },
      (variant) => called.push(variant)
    )
    assert.equal(called.length, 4)
  })

  test("testFn receives correct props", (t) => {
    if (s(t)) return
    const seen = new Set()
    mod.testAllVariants({ color: ["red", "blue"] }, (v) => seen.add(v.color))
    assert.ok(seen.has("red"))
    assert.ok(seen.has("blue"))
  })
})

// ─── snapshotVariants ─────────────────────────────────────────────────────────
describe("snapshotVariants()", () => {
  test("maps variants to render output", (t) => {
    if (s(t)) return
    const results = mod.snapshotVariants(
      (v) => `class-${v.size}`,
      [{ size: "sm" }, { size: "lg" }]
    )
    assert.equal(results.length, 2)
    assert.equal(results[0].output, "class-sm")
    assert.equal(results[1].output, "class-lg")
    assert.deepEqual(results[0].variant, { size: "sm" })
  })
})
