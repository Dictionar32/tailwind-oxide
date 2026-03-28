import assert from "node:assert/strict"
import { test } from "node:test"

import {
  clearAtomicRegistry,
  generateAtomicCss,
  parseAtomicClass,
  toAtomicClasses,
} from "../dist/index.js"

test("parseAtomicClass maps responsive spacing utilities", () => {
  clearAtomicRegistry()
  const rule = parseAtomicClass("md:p-4")

  assert.ok(rule)
  assert.equal(rule.modifier, "md")
  assert.equal(rule.property, "padding")
  assert.equal(rule.value, "1rem")
})

test("toAtomicClasses keeps unknown classes while generating atomic CSS", () => {
  clearAtomicRegistry()
  const result = toAtomicClasses("p-4 custom-class rounded-lg")
  const css = generateAtomicCss(result.rules)

  assert.match(result.atomicClasses, /custom-class/)
  assert.deepEqual(result.unknownClasses, ["custom-class"])
  assert.match(css, /padding: 1rem/)
  assert.match(css, /border-radius: 0\.5rem/)
})
