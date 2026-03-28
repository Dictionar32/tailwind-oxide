/**
 * Compiler — nativeBridge adapter tests
 * Tests adaptNativeResult() and the bridge feature-detection path.
 *
 * Run: node --test packages/compiler/test/nativeBridge.test.mjs
 */
import { describe, test, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { createRequire } from "node:module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

let mod
try {
  mod = require(path.resolve(__dirname, "../dist/index.js"))
} catch {
  console.warn("[nativeBridge test] compiler dist not found — run `npm run build -w packages/compiler` first")
  process.exit(0)
}

const { adaptNativeResult, getNativeBridge, resetNativeBridgeCache } = mod

// ─────────────────────────────────────────────────────────────────────────────

describe("adaptNativeResult", () => {

  test("passes through code, classes, changed", () => {
    const raw = {
      code: "const x = 1;",
      classes: ["bg-blue-500", "text-white"],
      changed: true,
      rscJson: null,
      metadataJson: null,
    }
    const result = adaptNativeResult(raw)
    assert.equal(result.code, "const x = 1;")
    assert.deepEqual(result.classes, ["bg-blue-500", "text-white"])
    assert.equal(result.changed, true)
  })

  test("parses rsc_json into rsc object", () => {
    const raw = {
      code: "",
      classes: [],
      changed: false,
      rscJson: JSON.stringify({ isServer: true, needsClientDirective: false }),
      metadataJson: null,
    }
    const result = adaptNativeResult(raw)
    assert.ok(result.rsc, "should have rsc")
    assert.equal(result.rsc.isServer, true)
    assert.equal(result.rsc.needsClientDirective, false)
    assert.deepEqual(result.rsc.clientReasons, [])
  })

  test("ignores malformed rsc_json", () => {
    const raw = {
      code: "",
      classes: [],
      changed: false,
      rscJson: "{invalid json}",
      metadataJson: null,
    }
    assert.doesNotThrow(() => adaptNativeResult(raw))
    const result = adaptNativeResult(raw)
    assert.equal(result.rsc, undefined)
  })

  test("ignores schema-invalid rsc_json", () => {
    const raw = {
      code: "",
      classes: [],
      changed: false,
      rscJson: JSON.stringify({ isServer: "yes", needsClientDirective: false }),
      metadataJson: null,
    }
    const result = adaptNativeResult(raw)
    assert.equal(result.rsc, undefined)
  })

  test("parses metadata_json into ComponentMetadata array", () => {
    const meta = [
      {
        component: "Button",
        tag: "button",
        baseClass: "Button_abc123",
        subComponents: {
          icon: { tag: "span", class: "Button_icon_abc123" },
          text: { tag: "span", class: "Button_text_abc123" },
        },
      },
    ]
    const raw = {
      code: "",
      classes: [],
      changed: false,
      rscJson: null,
      metadataJson: JSON.stringify(meta),
    }
    const result = adaptNativeResult(raw)
    assert.ok(Array.isArray(result.metadata), "should have metadata array")
    assert.equal(result.metadata.length, 1)
    assert.equal(result.metadata[0].component, "Button")
    assert.equal(result.metadata[0].subComponents.icon.class, "Button_icon_abc123")
  })

  test("ignores malformed metadata_json", () => {
    const raw = {
      code: "",
      classes: [],
      changed: false,
      rscJson: null,
      metadataJson: "not valid json",
    }
    assert.doesNotThrow(() => adaptNativeResult(raw))
    const result = adaptNativeResult(raw)
    assert.equal(result.metadata, undefined)
  })

  test("ignores schema-invalid metadata_json", () => {
    const raw = {
      code: "",
      classes: [],
      changed: false,
      rscJson: null,
      metadataJson: JSON.stringify([{ component: "Button", subComponents: [] }]),
    }
    const result = adaptNativeResult(raw)
    assert.equal(result.metadata, undefined)
  })

  test("handles null/undefined optional fields", () => {
    const raw = {
      code: "x",
      classes: [],
      changed: false,
    }
    assert.doesNotThrow(() => adaptNativeResult(raw))
  })
})

describe("getNativeBridge — v5 behavior", () => {

  beforeEach(() => {
    resetNativeBridgeCache()
  })

  test("throws error when TWS_NO_NATIVE=1", () => {
    const orig = process.env.TWS_NO_NATIVE
    process.env.TWS_NO_NATIVE = "1"
    try {
      getNativeBridge()
      assert.fail("Expected error to be thrown")
    } catch (err) {
      assert.ok(err.message.includes("Native binding is required"))
    } finally {
      process.env.TWS_NO_NATIVE = orig ?? ""
      resetNativeBridgeCache()
    }
  })

  test("throws error when TWS_NO_RUST=1", () => {
    const orig = process.env.TWS_NO_RUST
    process.env.TWS_NO_RUST = "1"
    try {
      getNativeBridge()
      assert.fail("Expected error to be thrown")
    } catch (err) {
      assert.ok(err.message.includes("Native binding is required"))
    } finally {
      process.env.TWS_NO_RUST = orig ?? ""
      resetNativeBridgeCache()
    }
  })
})

console.log("✅ NativeBridge adapter tests complete")
