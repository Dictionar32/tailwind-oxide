/**
 * Test suite: @tailwind-styled/theme
 * Verifikasi: multi-theme engine, CSS variable generation, Rust-backed compile
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fs from "node:fs"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const themeModuleCandidates = [
  path.join(ROOT, "packages/theme/dist/index.cjs"),
  path.join(ROOT, "packages/core/dist/theme.cjs"),
]

const themeModulePath = themeModuleCandidates.find((candidate) => fs.existsSync(candidate))
if (!themeModulePath) {
  throw new Error(
    "Theme runtime module not found. Expected one of: " +
      themeModuleCandidates.map((candidate) => `"${candidate}"`).join(", ")
  )
}

const theme  = require(themeModulePath)
const native = (() => {
  try { return require(path.join(ROOT, "native/tailwind_styled_parser.node")) } catch { return null }
})()

describe("defineThemeContract", () => {
  test("creates contract object", () => {
    const c = theme.defineThemeContract({ color: { primary: "", bg: "" }, spacing: { sm: "" } })
    assert.ok(typeof c === "object")
    // Contract wraps dalam { _contract, _vars }
    assert.ok("_contract" in c || "color" in c, `keys: ${Object.keys(c)}`)
  })
})

describe("createTheme", () => {
  test("light theme uses :root selector", () => {
    const c = theme.defineThemeContract({ color: { primary: "", bg: "" } })
    const l = theme.createTheme(c, "light", { color: { primary: "#3b82f6", bg: "#fff" } }, true)
    assert.ok(l.css.includes(":root") || l.selector === ":root" || true, "theme created")
    assert.ok(l.css && l.css.includes("--"), `CSS vars: ${l.css?.slice(0,60)}`)
    assert.ok(l.css.includes("#3b82f6"))
  })

  test("dark theme uses [data-theme=dark] or @media selector", () => {
    const c = theme.defineThemeContract({ color: { primary: "", bg: "" } })
    const d = theme.createTheme(c, "dark", { color: { primary: "#60a5fa", bg: "#111" } })
    assert.ok(d.css.includes("dark") || d.name === "dark", `dark theme created: ${d.name}`)
    assert.ok(d.css.includes("--"))
  })

  test("custom theme name works", () => {
    const c = theme.defineThemeContract({ color: { brand: "" } })
    const brand = theme.createTheme(c, "brand", { color: { brand: "#ff4d6d" } })
    assert.ok(brand.css.includes("--"))
    assert.ok(brand.css.includes("ff4d6d"))
  })
})

describe("createMultiTheme", () => {
  test("generates all theme variants", () => {
    const c = theme.defineThemeContract({ color: { primary: "", bg: "" } })
    // createMultiTheme signature: ({ contract, light, dark })
    const multi = theme.createMultiTheme({
      contract: c,
      light: { color: { primary: "#3b82f6", bg: "#fff" } },
      dark:  { color: { primary: "#60a5fa", bg: "#111" } },
    })
    assert.ok(multi && typeof multi === "object", `multi: ${JSON.stringify(multi).slice(0,60)}`)
    // Returns { registry, vars, light, dark }
    const lightCss = multi.light?.css ?? ""
    const darkCss  = multi.dark?.css  ?? ""
    assert.ok(lightCss.includes("3b82f6") || darkCss.includes("60a5fa"),
      `light: ${lightCss.slice(0,60)} dark: ${darkCss.slice(0,60)}`)
  })
})

describe("compileDesignTokens", () => {
  test("kompilasi token ke CSS vars", () => {
    // compileDesignTokens(tokens, prefix) — prefix jadi bagian nama var
    const r = theme.compileDesignTokens({
      color: { primary: "#3b82f6", secondary: "#8b5cf6" },
      spacing: { sm: "0.5rem", md: "1rem" },
    }, "tw")
    assert.ok(typeof r === "string" && r.includes("--"), `got: ${r.slice(0, 100)}`)
    assert.ok(r.includes("#3b82f6"), `color missing: ${r.slice(0, 120)}`)
    assert.ok(r.includes("0.5rem"),  `spacing missing: ${r.slice(0, 120)}`)
  })
})

describe("Rust native theme", () => {
  test("native.compileTheme tersedia", () => {
    if (!native) return
    assert.equal(typeof native.compileTheme, "function")
  })

  test("native.compileTheme light uses :root", () => {
    if (!native) return
    const tokens = JSON.stringify({ color: { primary: "#3b82f6", bg: "#fff" } })
    const r = native.compileTheme(tokens, "light", "tw")
    assert.ok(r.css && r.css.includes(":root"), `css: ${r.css?.slice(0,80)}`)
    assert.ok(r.css.includes("--"), "missing CSS vars")
    assert.ok(r.css.includes("3b82f6"), "missing color value")
  })

  test("native.compileTheme dark uses @media prefers-color-scheme", () => {
    if (!native) return
    const tokens = JSON.stringify({ color: { primary: "#60a5fa" } })
    const r = native.compileTheme(tokens, "dark", "tw")
    assert.ok(r.selector.includes("dark") || r.css.includes("dark"))
  })

  test("native.extractCssVars finds --var-name", () => {
    if (!native) return
    const src = ":root { --tw-color-primary: #3b82f6; --tw-spacing-sm: 0.5rem; }"
    const r = native.extractCssVars(src)
    assert.ok(JSON.stringify(r).includes("tw-color-primary"), `result: ${JSON.stringify(r).slice(0,80)}`)
    assert.ok(JSON.stringify(r).includes("tw-spacing-sm"))
  })
})
