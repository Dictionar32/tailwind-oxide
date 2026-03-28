/**
 * Unit tests — Vue adapter (@tailwind-styled/vue)
 * Menggunakan Vue Test Utils + Node test runner
 * 
 * Catatan: test ini membutuhkan Vue dan @vue/test-utils terinstall.
 * Jalankan setelah: npm install --prefix packages/vue
 */
import { test, describe, before } from "node:test"
import assert from "node:assert/strict"

// ─── Import subject under test ───────────────────────────────────────────────
// Kita test logic murni (resolver functions) tanpa memerlukan Vue runtime
// Vue runtime tests memerlukan jsdom/happy-dom — dipisah ke integration test

describe("Vue adapter — cv() class variant resolver", () => {
  // Import langsung dari source untuk unit test (tanpa build)
  let cv, tw, extend

  before(async () => {
    try {
      // Try dist first, fall back to src via tsx/ts-node
      const mod = await import("../src/index.ts").catch(
        () => import("../dist/index.js")
      )
      cv = mod.cv
      tw = mod.tw
      extend = mod.extend
    } catch {
      // Skip if not buildable in this environment
      cv = null
    }
  })

  test("cv() resolves base class", (t) => {
    if (!cv) return t.skip("Vue adapter not built")
    const resolver = cv({ base: "px-4 py-2 rounded" })
    assert.ok(resolver({}).includes("px-4"))
    assert.ok(resolver({}).includes("py-2"))
    assert.ok(resolver({}).includes("rounded"))
  })

  test("cv() applies correct variant", (t) => {
    if (!cv) return t.skip("Vue adapter not built")
    const resolver = cv({
      base: "px-4",
      variants: {
        intent: {
          primary: "bg-blue-500 text-white",
          danger: "bg-red-500 text-white",
        },
      },
    })
    const primary = resolver({ intent: "primary" })
    assert.ok(primary.includes("bg-blue-500"), `expected bg-blue-500 in "${primary}"`)
    assert.ok(!primary.includes("bg-red-500"))

    const danger = resolver({ intent: "danger" })
    assert.ok(danger.includes("bg-red-500"))
  })

  test("cv() uses defaultVariants when prop not given", (t) => {
    if (!cv) return t.skip("Vue adapter not built")
    const resolver = cv({
      base: "px-4",
      variants: { size: { sm: "h-8", lg: "h-12" } },
      defaultVariants: { size: "sm" },
    })
    const result = resolver({})
    assert.ok(result.includes("h-8"), `expected h-8 in "${result}"`)
    assert.ok(!result.includes("h-12"))
  })

  test("cv() prop overrides defaultVariant", (t) => {
    if (!cv) return t.skip("Vue adapter not built")
    const resolver = cv({
      base: "px-4",
      variants: { size: { sm: "h-8", lg: "h-12" } },
      defaultVariants: { size: "sm" },
    })
    const result = resolver({ size: "lg" })
    assert.ok(result.includes("h-12"))
    assert.ok(!result.includes("h-8"))
  })

  test("cv() applies compoundVariants", (t) => {
    if (!cv) return t.skip("Vue adapter not built")
    const resolver = cv({
      base: "px-4",
      variants: {
        intent: { primary: "bg-blue-500", danger: "bg-red-500" },
        size: { sm: "h-8", lg: "h-12" },
      },
      compoundVariants: [
        { intent: "primary", size: "lg", class: "ring-2 ring-blue-300" },
      ],
    })
    const result = resolver({ intent: "primary", size: "lg" })
    assert.ok(result.includes("ring-2"))
    assert.ok(result.includes("ring-blue-300"))

    const noCompound = resolver({ intent: "danger", size: "lg" })
    assert.ok(!noCompound.includes("ring-2"))
  })

  test("cv() merges class prop via twMerge", (t) => {
    if (!cv) return t.skip("Vue adapter not built")
    const resolver = cv({ base: "px-4 py-2" })
    const result = resolver({ class: "px-8" })
    // twMerge should resolve px conflict — px-8 wins
    assert.ok(result.includes("px-8"), `expected px-8 in "${result}"`)
    assert.ok(!result.includes("px-4"), `expected px-4 to be overridden in "${result}"`)
  })

  test("cv() with no config returns empty string", (t) => {
    if (!cv) return t.skip("Vue adapter not built")
    const resolver = cv({})
    const result = resolver({})
    assert.equal(result.trim(), "")
  })

  test("cv() handles multiple variants simultaneously", (t) => {
    if (!cv) return t.skip("Vue adapter not built")
    const resolver = cv({
      base: "font-medium",
      variants: {
        intent: { primary: "bg-blue-500", ghost: "bg-transparent border" },
        size: { sm: "h-8 text-sm", md: "h-10 text-base", lg: "h-12 text-lg" },
        rounded: { none: "rounded-none", full: "rounded-full" },
      },
      defaultVariants: { size: "md", rounded: "none" },
    })
    const result = resolver({ intent: "primary", size: "lg", rounded: "full" })
    assert.ok(result.includes("bg-blue-500"))
    assert.ok(result.includes("h-12"))
    assert.ok(result.includes("text-lg"))
    assert.ok(result.includes("rounded-full"))
  })
})
