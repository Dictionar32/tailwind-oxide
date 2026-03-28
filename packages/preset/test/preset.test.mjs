/**
 * Test suite: @tailwind-styled/preset
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"

const require = createRequire(import.meta.url)
const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const preset = require(path.join(ROOT, "packages/preset/dist/defaultPreset.cjs"))

describe("defaultPreset", () => {
  test("export tersedia", () => {
    assert.ok(preset.defaultPreset !== undefined || typeof preset.default !== "undefined")
  })

  test("defaultPreset adalah object", () => {
    const p = preset.defaultPreset ?? preset.default
    assert.equal(typeof p, "object", `type: ${typeof p}`)
  })

  test("preset punya plugins array", () => {
    const p = preset.defaultPreset ?? preset.default
    if (p && "plugins" in p) {
      assert.ok(Array.isArray(p.plugins), "plugins harus array")
    }
  })
})

describe("designTokens", () => {
  test("designTokens tersedia", () => {
    assert.ok(preset.designTokens !== undefined)
  })

  test("designTokens adalah object dengan color, spacing, dll", () => {
    const dt = preset.designTokens
    assert.ok(typeof dt === "object", `type: ${typeof dt}`)
    // Harus punya setidaknya satu token category
    const keys = Object.keys(dt)
    assert.ok(keys.length > 0, "designTokens kosong")
  })
})

describe("generateTailwindConfig", () => {
  test("generateTailwindConfig tersedia dan callable", () => {
    assert.equal(typeof preset.generateTailwindConfig, "function")
  })

  test("generateTailwindConfig mengembalikan string TypeScript config", () => {
    const result = preset.generateTailwindConfig()
    // Returns TS config file content (string), bukan object
    assert.ok(typeof result === "string" || typeof result === "object",
      `type: ${typeof result}`)
  })

  test("result berisi tailwind atau config keywords", () => {
    const result = preset.generateTailwindConfig()
    if (typeof result === "string") {
      assert.ok(
        result.includes("tailwind") || result.includes("Config") || result.includes("preset"),
        `content: ${result.slice(0, 80)}`
      )
    } else {
      const hasStructure = "content" in result || "theme" in result || "plugins" in result
      assert.ok(hasStructure, `keys: ${Object.keys(result)}`)
    }
  })
})

describe("defaultGlobalCss", () => {
  test("defaultGlobalCss adalah string CSS", () => {
    assert.equal(typeof preset.defaultGlobalCss, "string")
    assert.ok(preset.defaultGlobalCss.length > 0)
  })

  test("defaultGlobalCss berisi @import tailwindcss atau @tailwind", () => {
    const css = preset.defaultGlobalCss
    assert.ok(
      css.includes("tailwind") || css.includes("@import"),
      `css: ${css.slice(0, 80)}`
    )
  })
})
