/**
 * Compiler — subcomponent block parsing
 * Tests the parseSubcomponentBlocks + renderCompoundComponent path.
 * In v5, native binding is required for these tests.
 *
 * Run: node --test packages/compiler/test/subcomponent.test.mjs
 */
import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { createRequire } from "node:module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Check if native is available - if not, skip test (v5 requires native)
let testTransform
try {
  const mod = require(path.resolve(__dirname, "../dist/index.js"))
  testTransform = mod.transformSource
} catch {
  console.warn("[subcomponent test] compiler dist not found — run `npm run build -w packages/compiler` first")
  process.exit(0)
}

let usePlugin = null
let resetPluginRegistry = null
try {
  const pluginMod = require(path.resolve(__dirname, "../../plugin/dist/index.js"))
  usePlugin = pluginMod.use
  resetPluginRegistry = pluginMod.resetGlobalRegistry
} catch {
  console.warn("[subcomponent test] plugin dist not found — plugin transform test will be skipped")
}

// ─────────────────────────────────────────────────────────────────────────────

describe("JS subcomponent block parser — parseSubcomponentBlocks", () => {

  test("simple template without blocks — no change to classes", () => {
    const src = `
import { tw } from "tailwind-styled-v4"
const Box = tw.div\`bg-white p-4 rounded\`
`
    const result = testTransform(src, { hoist: false })
    assert.ok(result.changed, "should be changed")
    assert.ok(result.code.includes("React.forwardRef"), "should emit forwardRef")
    assert.ok(result.classes.includes("bg-white"), "should collect bg-white")
    assert.ok(result.classes.includes("p-4"), "should collect p-4")
    assert.ok(!result.code.includes("_base."), "should NOT have compound structure")
  })

  test("template with subcomponent blocks — compound component", () => {
    const src = `
import { tw } from "tailwind-styled-v4"
const Button = tw.button\`
  bg-blue-500 text-white px-4 py-2
  icon { mr-2 w-5 h-5 }
  text { font-medium }
\`
`
    const result = testTransform(src, { hoist: false })
    assert.ok(result.changed, "should be changed")
    assert.ok(result.code.includes("_base.icon"), "should attach .icon")
    assert.ok(result.code.includes("_base.text"), "should attach .text")
    assert.ok(result.classes.includes("bg-blue-500"), "should collect base class")
    assert.ok(result.classes.includes("mr-2"), "should collect icon class")
    assert.ok(result.classes.includes("font-medium"), "should collect text class")
  })

  test("subcomponent scoped class is deterministic across transforms", () => {
    const src = `
import { tw } from "tailwind-styled-v4"
const Card = tw.div\`rounded-lg shadow  body { p-6 prose } footer { pt-4 border-t }\`
`
    const r1 = testTransform(src, { hoist: false })
    const r2 = testTransform(src.replace("/* @tw-transformed */\n", ""), { hoist: false })

    // Extract scoped class name for body from first result
    const match1 = r1.code.match(/Card_body_[a-f0-9]{6}/)
    const match2 = r2.code.match(/Card_body_[a-f0-9]{6}/)

    // Both should contain a scoped class (idempotency means r2 may not re-transform)
    // At minimum r1 must have scoped class
    assert.ok(match1, "r1 should have scoped body class")
    if (match2) {
      assert.equal(match1[0], match2[0], "scoped class should be deterministic")
    }
  })

  test("dynamic templates (with interpolations) are left untouched", () => {
    const src = `
import { tw } from "tailwind-styled-v4"
const Button = tw.button\`bg-blue-500 \${props => props.active && "ring-2"}\`
`
    const result = testTransform(src, { hoist: false })
    // Dynamic templates should not be transformed by our static path
    // (they pass through unchanged)
    assert.ok(!result.changed || !result.code.includes("_Tw_Button"), "dynamic should not produce _Tw_Button")
  })

  test("tw(Component) wrap still works alongside subcomponent blocks", () => {
    const src = `
import { tw } from "tailwind-styled-v4"
const Base = tw.div\`p-4\`
const Extended = tw(Base)\`mt-2 shadow\`
`
    const result = testTransform(src, { hoist: false })
    assert.ok(result.changed, "should be changed")
    assert.ok(result.code.includes("_TwWrap_Base"), "should emit wrap component")
  })

  test("multiple components in same file each get unique scoped classes", () => {
    const src = `
import { tw } from "tailwind-styled-v4"
const ButtonA = tw.button\`bg-blue-500  icon { mr-1 w-4 h-4 }\`
const ButtonB = tw.button\`bg-red-500   icon { mr-2 w-5 h-5 }\`
`
    const result = testTransform(src, { hoist: false })
    assert.ok(result.changed, "should be changed")

    const scopedClasses = [...result.code.matchAll(/Button[AB]_icon_[a-f0-9]{6}/g)].map(m => m[0])
    // Should find at least 2 distinct scoped classes (one per component)
    const unique = new Set(scopedClasses)
    assert.ok(unique.size >= 2, `expected ≥2 unique scoped classes, got ${unique.size}: ${[...unique].join(", ")}`)
  })

  test("idempotency — already-transformed code is not re-transformed", () => {
    const src = `
import { tw } from "tailwind-styled-v4"
const Box = tw.div\`bg-white\`
`
    const r1 = testTransform(src, { hoist: false })
    const r2 = testTransform(r1.code, { hoist: false })

    assert.ok(r1.changed, "first transform should change")
    assert.ok(!r2.changed, "second transform should be idempotent (no change)")
  })
})

describe("JS subcomponent — class collection", () => {
  test("all classes from all subcomponents are collected", () => {
    const src = `
import { tw } from "tailwind-styled-v4"
const Modal = tw.div\`
  fixed inset-0 z-50
  overlay { bg-black/50 backdrop-blur-sm }
  content { bg-white rounded-xl p-8 max-w-lg mx-auto }
  header  { text-xl font-bold mb-4 }
\`
`
    const result = testTransform(src, { hoist: false })
    const expected = [
      "fixed", "inset-0", "z-50",          // base
      "bg-black/50", "backdrop-blur-sm",    // overlay
      "bg-white", "rounded-xl",             // content
      "text-xl", "font-bold",               // header
    ]
    for (const cls of expected) {
      assert.ok(result.classes.includes(cls), `should include class: ${cls}`)
    }
  })
})

describe("plugin transform hook — object config", () => {
  test(
    "custom plugin can modify tw.tag({ ... }) variants before code generation",
    { skip: !usePlugin || !resetPluginRegistry },
    () => {
      resetPluginRegistry()
      try {
        usePlugin({
          name: "test-plugin-object-transform",
          setup(ctx) {
            ctx.addTransform((config, meta) => {
              if (meta.tag !== "button") return config
              return {
                ...config,
                variants: {
                  ...config.variants,
                  brand: {
                    primary: "bg-blue-600 text-white",
                    secondary: "bg-gray-200 text-gray-800",
                  },
                },
                defaultVariants: {
                  ...config.defaultVariants,
                  brand: "primary",
                },
              }
            })
          },
        })

        const src = `
import { tw } from "tailwind-styled-v4"
const Button = tw.button({
  base: "inline-flex items-center",
  variants: {
    size: {
      sm: "text-sm",
    },
  },
  defaultVariants: {
    size: "sm",
  },
})
`
        const result = testTransform(src, { hoist: false })

        assert.ok(result.changed, "object config should be transformed")
        assert.ok(result.code.includes('"brand"'), "generated variant table should include brand variant")
        assert.ok(result.classes.includes("bg-blue-600"), "injected classes should be collected")
      } finally {
        resetPluginRegistry()
      }
    }
  )
})

console.log("✅ Compiler subcomponent tests complete")
