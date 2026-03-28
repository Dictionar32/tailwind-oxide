/**
 * Compiler — Dead Style Elimination (DSE) tests
 * Tests for extractComponentUsage, eliminateDeadCss, optimizeCss, runElimination
 *
 * Run: node --test packages/compiler/test/dse.test.mjs
 */
import { describe, test } from "node:test"
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
  console.warn("[DSE test] compiler dist not found — run `npm run build -w packages/compiler` first")
  process.exit(0)
}

const {
  extractComponentUsage,
  eliminateDeadCss,
  optimizeCss,
  scanProjectUsage,
  findDeadVariants,
  runElimination,
} = mod

// ─────────────────────────────────────────────────────────────────────────────

describe("extractComponentUsage", () => {

  test("extracts basic JSX props", () => {
    const source = `<Button size="sm" intent="primary" />`
    const result = extractComponentUsage(source)
    assert.deepEqual(result.Button?.size, new Set(["sm"]))
    assert.deepEqual(result.Button?.intent, new Set(["primary"]))
  })

  test("extracts multiple components", () => {
    const source = `
      <Button size="lg" intent="primary" />
      <Input variant="filled" />
      <Card padding="md" />
    `
    const result = extractComponentUsage(source)
    assert.deepEqual(result.Button?.size, new Set(["lg"]))
    assert.deepEqual(result.Button?.intent, new Set(["primary"]))
    assert.deepEqual(result.Input?.variant, new Set(["filled"]))
    assert.deepEqual(result.Card?.padding, new Set(["md"]))
  })

  test("extracts self-closing JSX tags", () => {
    const source = `<Icon name="check" size="sm" />`
    const result = extractComponentUsage(source)
    assert.deepEqual(result.Icon?.name, new Set(["check"]))
    assert.deepEqual(result.Icon?.size, new Set(["sm"]))
  })

  test("extracts multiple prop values for same component", () => {
    const source = `
      <Button size="sm" />
      <Button size="lg" />
      <Button size="xl" />
    `
    const result = extractComponentUsage(source)
    assert.deepEqual(result.Button?.size, new Set(["sm", "lg", "xl"]))
  })

  test("ignores non-variant props", () => {
    const source = `<Button className="foo" style={{ color: 'red' }} id="btn" href="/page" src="img.png" alt="desc" type="button" />`
    const result = extractComponentUsage(source)
    assert.strictEqual(Object.keys(result.Button || {}).length, 0)
  })

  test("handles lowercase HTML tags", () => {
    const source = `<div className="flex" />`
    const result = extractComponentUsage(source)
    assert.strictEqual(result.div, undefined)
  })

  test("handles empty source", () => {
    const result = extractComponentUsage("")
    assert.deepEqual(result, {})
  })

  test("handles no props", () => {
    const source = `<Button />`
    const result = extractComponentUsage(source)
    assert.deepEqual(result.Button, {})
  })

  test("handles single quotes in props", () => {
    const source = `<Button size='lg' intent='danger' />`
    const result = extractComponentUsage(source)
    assert.deepEqual(result.Button?.size, new Set(["lg"]))
    assert.deepEqual(result.Button?.intent, new Set(["danger"]))
  })

  test("handles target prop values", () => {
    const source = `<Button target="value" />`
    const result = extractComponentUsage(source)
    assert.deepEqual(result.Button?.target, new Set(["value"]))
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe("eliminateDeadCss", () => {

  test("returns original CSS when no dead classes", () => {
    const css = `.flex { display: flex }\n.text-white { color: white }`
    const result = eliminateDeadCss(css, new Set())
    assert.strictEqual(result, css)
  })

  test("preserves unrelated rules when dead classes do not match them", () => {
    const css = `.flex { display: flex }\n.size-xl { font-size: 20px }\n.text-white { color: white }`
    const result = eliminateDeadCss(css, new Set(["not-found"]))
    assert.match(result, /\.size-xl/)
    assert.match(result, /\.text-white/)
  })

  test("handles empty CSS input", () => {
    const result = eliminateDeadCss("", new Set(["dead"]))
    assert.strictEqual(result, "")
  })

  test("handles empty dead classes set", () => {
    const css = `.test { color: red }`
    const result = eliminateDeadCss(css, new Set())
    assert.strictEqual(result, css)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe("optimizeCss", () => {

  test("merges duplicate CSS rules", () => {
    const css = `.a1 { padding: 16px }\n.b1 { padding: 16px }`
    const result = optimizeCss(css)
    assert.match(result, /\.a1,\.b1/)
    assert.match(result, /padding:\s*16px/)
  })

  test("handles empty CSS", () => {
    const result = optimizeCss("")
    assert.strictEqual(result, "")
  })

  test("preserves @media blocks", () => {
    const css = `.a1 { padding: 16px }\n@media (min-width: 768px) { .b1 { font-size: 20px } }`
    const result = optimizeCss(css)
    assert.match(result, /@media/)
  })

  test("merges multiple declarations with same values", () => {
    const css = `.c1 { margin: 0 }\n.c2 { margin: 0 }\n.c3 { margin: 0 }`
    const result = optimizeCss(css)
    const marginMatches = result.match(/margin:\s*0/g)
    assert.ok(marginMatches && marginMatches.length === 1, "Should merge into single rule")
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe("findDeadVariants", () => {

  test("identifies unused variant values", () => {
    const registered = [
      {
        name: "Button",
        variants: {
          size: { sm: "text-sm", lg: "text-lg", xl: "text-xl" },
          intent: { primary: "bg-blue-500", danger: "bg-red-500" }
        }
      }
    ]
    const usage = {
      Button: {
        size: new Set(["sm", "lg"]),
        intent: new Set(["primary"])
      }
    }
    const report = findDeadVariants(registered, usage)

    assert.strictEqual(report.unusedCount, 2)
    assert.deepEqual(report.components.Button?.unusedVariants.size, ["xl"])
    assert.deepEqual(report.components.Button?.unusedVariants.intent, ["danger"])
  })

  test("handles component with no registered variants", () => {
    const registered = [
      {
        name: "Button",
        variants: {}
      }
    ]
    const usage = {
      Button: { size: new Set(["sm"]) }
    }
    const report = findDeadVariants(registered, usage)
    assert.strictEqual(report.unusedCount, 0)
  })

  test("handles component not used at all", () => {
    const registered = [
      {
        name: "Button",
        variants: {
          size: { sm: "text-sm", lg: "text-lg" }
        }
      }
    ]
    const usage = {}
    const report = findDeadVariants(registered, usage)

    assert.strictEqual(report.unusedCount, 2)
    assert.deepEqual(report.components.Button?.unusedVariants.size, ["sm", "lg"])
  })

  test("estimates bytes saved", () => {
    const registered = [
      {
        name: "Button",
        variants: {
          size: { sm: "text-sm", lg: "text-lg" }
        }
      }
    ]
    const usage = {
      Button: {
        size: new Set(["sm"])
      }
    }
    const report = findDeadVariants(registered, usage)

    assert.ok(report.bytesSaved > 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe("runElimination", () => {

  test("runs full pipeline with empty input", () => {
    const css = ""
    const result = runElimination({
      inputCss: css,
      dirs: [],
      registered: []
    })

    assert.strictEqual(result.css, "")
    assert.strictEqual(result.report.unusedCount, 0)
  })

  test("runs pipeline with registered components but no usage", () => {
    const css = `.size-sm { font-size: 12px }\n.size-lg { font-size: 18px }\n.intent-primary { background: blue }`
    const registered = [
      {
        name: "Button",
        variants: {
          size: { sm: "size-sm", lg: "size-lg" },
          intent: { primary: "intent-primary" }
        }
      }
    ]

    const result = runElimination({
      inputCss: css,
      dirs: [],
      registered
    })

    assert.strictEqual(result.report.unusedCount, 3)
  })

  test("returns optimized CSS", () => {
    const css = `.a { padding: 16px }\n.b { padding: 16px }`
    const result = runElimination({
      inputCss: css,
      dirs: [],
      registered: []
    })

    assert.match(result.css, /\./)
  })
})
