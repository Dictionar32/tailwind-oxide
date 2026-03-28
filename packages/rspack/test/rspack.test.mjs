/**
 * Test suite: @tailwind-styled/rspack
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

const require = createRequire(import.meta.url)
const ROOT   = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const rspack = require(path.join(ROOT, "packages/rspack/dist/index.cjs"))

describe("tailwindStyledRspackPlugin", () => {
  test("export tersedia", () => {
    const fn = rspack.tailwindStyledRspackPlugin ?? rspack.default
    assert.equal(typeof fn, "function")
  })

  test("plugin factory mengembalikan object", () => {
    const fn = rspack.tailwindStyledRspackPlugin ?? rspack.default
    const plugin = fn()
    assert.ok(typeof plugin === "object", `type: ${typeof plugin}`)
  })

  test("plugin punya apply() method (Rspack/Webpack pattern)", () => {
    const fn = rspack.tailwindStyledRspackPlugin ?? rspack.default
    const plugin = fn()
    assert.equal(typeof plugin.apply, "function", `methods: ${Object.keys(plugin)}`)
  })

  test("TailwindStyledRspackPlugin class tersedia", () => {
    assert.equal(typeof rspack.TailwindStyledRspackPlugin, "function")
  })

  test("plugin bisa diinstansiasi via new", () => {
    const instance = new rspack.TailwindStyledRspackPlugin()
    assert.ok(typeof instance === "object")
    assert.equal(typeof instance.apply, "function")
  })

  test("plugin dengan options tidak crash", () => {
    const fn = rspack.tailwindStyledRspackPlugin ?? rspack.default
    const plugin = fn({ cssEntry: "src/tailwind.css" })
    assert.ok(typeof plugin === "object")
  })
})

describe("Dist structure", () => {
  test("dist/index.cjs ada",    () => assert.ok(fs.existsSync(path.join(ROOT, "packages/rspack/dist/index.cjs"))))
  test("dist/loader.cjs ada",   () => assert.ok(fs.existsSync(path.join(ROOT, "packages/rspack/dist/loader.cjs"))))
  test("dist/index.d.ts ada",   () => assert.ok(fs.existsSync(path.join(ROOT, "packages/rspack/dist/index.d.ts"))))
})

describe("Loader exports", () => {
  test("loader can be imported from separate path", () => {
    const loader = require(path.join(ROOT, "packages/rspack/dist/loader.cjs"))
    assert.equal(typeof loader.default, "function", "loader.default should be a function")
  })
})
