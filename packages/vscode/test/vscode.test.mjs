import { describe, test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../../..")

describe("tailwind-styled-vscode package structure", () => {
  test("package.json has correct metadata", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/vscode/package.json"), "utf8"))
    assert.equal(pkg.name, "tailwind-styled-vscode")
    assert.ok(pkg.version, "version should exist")
    assert.equal(pkg.main, "./dist/extension.js")
  })

  test("declares activationEvents for supported languages", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/vscode/package.json"), "utf8"))
    assert.ok(Array.isArray(pkg.activationEvents))
    const langs = pkg.activationEvents.map((e) => e.replace("onLanguage:", ""))
    for (const lang of ["javascript", "typescript", "typescriptreact", "vue", "svelte"]) {
      assert.ok(langs.includes(lang), `missing activation for ${lang}`)
    }
  })

  test("declares trace, why, doctor commands", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/vscode/package.json"), "utf8"))
    const cmds = pkg.contributes.commands.map((c) => c.command)
    assert.ok(cmds.includes("tailwind-styled.trace"))
    assert.ok(cmds.includes("tailwind-styled.why"))
    assert.ok(cmds.includes("tailwind-styled.doctor"))
  })

  test("declares configuration properties", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "packages/vscode/package.json"), "utf8"))
    const props = pkg.contributes.configuration.properties
    assert.ok("tailwindStyled.enableTraceHover" in props)
    assert.ok("tailwindStyled.enableAutocomplete" in props)
  })
})

describe("tailwind-styled-vscode source files", () => {
  test("extension.ts exists and exports activate/deactivate", () => {
    const src = fs.readFileSync(path.join(ROOT, "packages/vscode/src/extension.ts"), "utf8")
    assert.ok(src.includes("export function activate"))
    assert.ok(src.includes("export function deactivate"))
  })

  test("extension.ts registers all three commands", () => {
    const src = fs.readFileSync(path.join(ROOT, "packages/vscode/src/extension.ts"), "utf8")
    assert.ok(src.includes("registerTraceCommand"))
    assert.ok(src.includes("registerWhyCommand"))
    assert.ok(src.includes("registerDoctorCommand"))
  })

  test("extension.ts implements HoverProvider", () => {
    const src = fs.readFileSync(path.join(ROOT, "packages/vscode/src/extension.ts"), "utf8")
    assert.ok(src.includes("class HoverProvider"))
    assert.ok(src.includes("registerHoverProvider"))
  })

  test("extension.ts implements CompletionProvider", () => {
    const src = fs.readFileSync(path.join(ROOT, "packages/vscode/src/extension.ts"), "utf8")
    assert.ok(src.includes("class CompletionProvider"))
    assert.ok(src.includes("registerCompletionItemProvider"))
  })

  test("constants.ts exports SCRIPT_VERSION and SCRIPTS", () => {
    const src = fs.readFileSync(path.join(ROOT, "packages/vscode/src/constants.ts"), "utf8")
    assert.ok(src.includes("SCRIPT_VERSION"))
    assert.ok(src.includes("SCRIPTS"))
  })

  test("health-check.ts exports health check functions", () => {
    const src = fs.readFileSync(path.join(ROOT, "packages/vscode/src/health-check.ts"), "utf8")
    assert.ok(src.includes("export function runHealthCheck"))
    assert.ok(src.includes("export function reportHealth"))
    assert.ok(src.includes("export function getHealthWarnings"))
  })
})

describe("tailwind-styled-vscode dist output", () => {
  test("dist/extension.js exists", () => {
    const distPath = path.join(ROOT, "packages/vscode/dist/extension.js")
    assert.ok(fs.existsSync(distPath), "dist/extension.js not found — run build first")
  })

  test("dist/extension.js is non-empty", () => {
    const distPath = path.join(ROOT, "packages/vscode/dist/extension.js")
    const stat = fs.statSync(distPath)
    assert.ok(stat.size > 100, `dist/extension.js too small: ${stat.size} bytes`)
  })
})
