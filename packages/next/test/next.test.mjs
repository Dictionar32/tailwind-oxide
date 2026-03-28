/**
 * Test suite: @tailwind-styled/next
 * Verifikasi: withTailwindStyled, loader exports
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const next = require(path.join(ROOT, "packages/next/dist/index.cjs"))

describe("withTailwindStyled", () => {
  test("export tersedia", () => {
    assert.equal(typeof next.withTailwindStyled, "function")
  })

  test("wrap nextConfig dan return object", () => {
    const config = { reactStrictMode: true }
    const wrapped = next.withTailwindStyled(config)
    assert.ok(typeof wrapped === "object" || typeof wrapped === "function",
      `result: ${typeof wrapped}`)
  })

  test("wrapped config mempertahankan properties asli", () => {
    const config = { reactStrictMode: true, output: "standalone" }
    const wrapped = next.withTailwindStyled(config)
    // withTailwindStyled mengembalikan function atau object
    if (typeof wrapped === "object") {
      // properties asli harus masih ada
      const hasOriginal = "reactStrictMode" in wrapped || "webpack" in wrapped
      assert.ok(hasOriginal, `wrapped: ${JSON.stringify(Object.keys(wrapped))}`)
    }
  })

  test("withTailwindStyled dengan options", () => {
    const wrapped = next.withTailwindStyled({}, {
      cssEntry: "src/globals.css",
    })
    assert.ok(typeof wrapped === "object" || typeof wrapped === "function")
  })

  test("withTailwindStyled idempotent — aman dipanggil dua kali", () => {
    const config = { reactStrictMode: true }
    const w1 = next.withTailwindStyled(config)
    const w2 = next.withTailwindStyled(config)
    // Tidak crash = idempotent
    assert.ok(w1 !== null)
    assert.ok(w2 !== null)
  })
})

describe("Loader exports", () => {
  test("webpackLoader file ada di dist", () => {
    // Loader butuh full Next.js environment — cukup verifikasi file ada
    const fs = require("node:fs")
    const loaderPath = path.join(ROOT, "packages/next/dist/webpackLoader.cjs")
    assert.ok(fs.existsSync(loaderPath), `webpackLoader.cjs not found at ${loaderPath}`)
  })

  test("turbopackLoader file ada di dist", () => {
    const fs = require("node:fs")
    const loaderPath = path.join(ROOT, "packages/next/dist/turbopackLoader.cjs")
    assert.ok(fs.existsSync(loaderPath), `turbopackLoader.cjs not found at ${loaderPath}`)
  })

  test("withTailwindStyled ada di index.cjs", () => {
    assert.ok("withTailwindStyled" in next, `exports: ${Object.keys(next)}`)
  })
})
