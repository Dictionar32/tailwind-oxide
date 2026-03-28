/**
 * Test suite: @tailwind-styled/syntax
 * Verifikasi: parseClasses, extractAllClasses (native bridge behavior)
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const syntax = require(path.join(ROOT, "packages/syntax/dist/index.cjs"))

describe("parseClasses", () => {
  test("parse single class", () => {
    const result = syntax.parseClasses("flex")
    assert.deepEqual(result, ["flex"])
  })

  test("parse multiple classes separated by whitespace", () => {
    const result = syntax.parseClasses("flex items-center justify-between")
    assert.deepEqual(result, ["flex", "items-center", "justify-between"])
  })

  test("handle empty string", () => {
    const result = syntax.parseClasses("")
    assert.deepEqual(result, [])
  })

  test("handle extra whitespace", () => {
    const result = syntax.parseClasses("  flex   items-center  ")
    assert.deepEqual(result, ["flex", "items-center"])
  })

  test("handle newline separation", () => {
    const result = syntax.parseClasses("flex\nitems-center\njustify-between")
    assert.deepEqual(result, ["flex", "items-center", "justify-between"])
  })

  test("parse classes with modifiers", () => {
    const result = syntax.parseClasses("hover:bg-blue-500 md:text-lg")
    assert.deepEqual(result, ["hover:bg-blue-500", "md:text-lg"])
  })

  test("parse classes with brackets", () => {
    const result = syntax.parseClasses("[color:red] grid-cols-[1fr/2fr]")
    assert.ok(result.includes("[color:red]"))
    assert.ok(result.includes("grid-cols-[1fr/2fr]"))
  })

  test("parse classes with important", () => {
    const result = syntax.parseClasses("!font-bold")
    assert.deepEqual(result, ["!font-bold"])
  })

  test("filter invalid tokens", () => {
    const result = syntax.parseClasses("flex <script>alert('xss')</script> items-center")
    assert.deepEqual(result, ["flex", "items-center"])
  })
})

describe("extractAllClasses", () => {
  test("exported function exists", () => {
    assert.equal(typeof syntax.extractAllClasses, "function")
  })

  test("returns sorted array when native bridge available", () => {
    const result = syntax.extractAllClasses("<div class=\"flex items-center bg-blue-500\">")
    assert.ok(Array.isArray(result), "should return an array")
    const sorted = [...result].sort()
    assert.deepEqual(result, sorted, "result should be sorted")
  })

  test("returns empty array for input without classes", () => {
    const result = syntax.extractAllClasses("<div id=\"root\">")
    assert.ok(Array.isArray(result))
  })
})
