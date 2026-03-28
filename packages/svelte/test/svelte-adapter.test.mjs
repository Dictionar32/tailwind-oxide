/**
 * Unit tests — Svelte adapter (@tailwind-styled/svelte)
 * Svelte adapter hanya terdiri dari pure functions (cv, tw, createVariants)
 * sehingga bisa ditest tanpa Svelte runtime.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"

let cv, tw, createVariants

try {
  const mod = await import("../src/index.ts").catch(() => import("../dist/index.js"))
  cv = mod.cv
  tw = mod.tw
  createVariants = mod.createVariants
} catch {
  cv = null; tw = null; createVariants = null
}

const skip = (t) => { if (!cv) t.skip("Svelte adapter not built"); return !cv }

describe("Svelte adapter — cv()", () => {
  test("resolves base", (t) => {
    if (skip(t)) return
    const btn = cv({ base: "px-4 py-2 rounded" })
    assert.ok(btn({}).includes("px-4"))
  })

  test("applies variant prop", (t) => {
    if (skip(t)) return
    const btn = cv({
      base: "px-4",
      variants: { intent: { primary: "bg-blue-500", danger: "bg-red-500" } },
    })
    assert.ok(btn({ intent: "primary" }).includes("bg-blue-500"))
    assert.ok(btn({ intent: "danger" }).includes("bg-red-500"))
  })

  test("uses defaultVariants", (t) => {
    if (skip(t)) return
    const btn = cv({
      base: "px-4",
      variants: { size: { sm: "h-8", lg: "h-12" } },
      defaultVariants: { size: "sm" },
    })
    assert.ok(btn({}).includes("h-8"))
  })

  test("prop overrides default", (t) => {
    if (skip(t)) return
    const btn = cv({
      base: "px-4",
      variants: { size: { sm: "h-8", lg: "h-12" } },
      defaultVariants: { size: "sm" },
    })
    assert.ok(btn({ size: "lg" }).includes("h-12"))
    assert.ok(!btn({ size: "lg" }).includes("h-8"))
  })

  test("handles class prop via twMerge", (t) => {
    if (skip(t)) return
    const btn = cv({ base: "px-4 py-2" })
    const result = btn({ class: "px-8" })
    assert.ok(result.includes("px-8"))
    assert.ok(!result.includes("px-4"))
  })

  test("compoundVariants applied correctly", (t) => {
    if (skip(t)) return
    const btn = cv({
      base: "btn",
      variants: {
        intent: { primary: "bg-blue-500", danger: "bg-red-500" },
        size: { sm: "h-8", lg: "h-12" },
      },
      compoundVariants: [{ intent: "primary", size: "lg", class: "shadow-lg" }],
    })
    assert.ok(btn({ intent: "primary", size: "lg" }).includes("shadow-lg"))
    assert.ok(!btn({ intent: "danger", size: "lg" }).includes("shadow-lg"))
  })
})

describe("Svelte adapter — tw() merger", () => {
  test("merges two class strings", (t) => {
    if (skip(t)) return
    const result = tw("px-4 py-2", "bg-blue-500")
    assert.ok(result.includes("px-4"))
    assert.ok(result.includes("bg-blue-500"))
  })

  test("handles falsy values gracefully", (t) => {
    if (skip(t)) return
    const result = tw("px-4", false, null, undefined, "text-white")
    assert.ok(result.includes("px-4"))
    assert.ok(result.includes("text-white"))
    assert.ok(!result.includes("false"))
    assert.ok(!result.includes("null"))
  })

  test("resolves conflict via twMerge", (t) => {
    if (skip(t)) return
    const result = tw("px-4", "px-8")
    assert.ok(result.includes("px-8"))
    assert.ok(!result.includes("px-4"))
  })

  test("empty call returns empty string", (t) => {
    if (skip(t)) return
    assert.equal(tw().trim(), "")
  })
})

describe("Svelte adapter — createVariants()", () => {
  test("className() returns correct class", (t) => {
    if (skip(t)) return
    let size = "sm"
    const { className } = createVariants(
      { base: "px-4", variants: { size: { sm: "h-8", lg: "h-12" } } },
      () => ({ size })
    )
    assert.ok(className().includes("h-8"))
    size = "lg"
    assert.ok(className().includes("h-12"))
  })

  test("className() is callable multiple times", (t) => {
    if (skip(t)) return
    const { className } = createVariants({ base: "px-4 py-2" }, () => ({}))
    assert.ok(className().includes("px-4"))
    assert.ok(className().includes("px-4")) // idempotent
  })
})
