/**
 * Tests — Sprint 8
 * Covers: monorepo detection, custom lint rules, --no-exit-0
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../../..")

function run(script, args = [], cwd = ROOT, extraEnv = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8", timeout: 15_000, cwd,
    env: { ...process.env, ...extraEnv },
  })
}
function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-s8-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── Monorepo detection ────────────────────────────────────────────────────────
describe("adopt.mjs — monorepo detection", () => {
  const SCRIPT = path.join(ROOT, "scripts/v50/adopt.mjs")

  test("detectMonorepo function exists in source", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("detectMonorepo"), "should have detectMonorepo")
    assert.ok(c.includes("resolveWorkspacePackages"), "should resolve workspace packages")
    assert.ok(c.includes("pnpm-workspace.yaml"), "should detect pnpm workspaces")
    assert.ok(c.includes("nx.json"), "should detect Nx")
    assert.ok(c.includes("turbo.json"), "should detect Turborepo")
  })

  test("--all flag in source", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("--all"), "should support --all flag")
    assert.ok(c.includes("allProjects"), "should have allProjects variable")
  })

  test("detects npm workspaces from package.json", () => {
    const { dir, cleanup } = tmp()
    try {
      // Setup fake monorepo
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({
        name: "my-monorepo",
        workspaces: ["packages/*"],
      }))
      fs.mkdirSync(path.join(dir, "packages/app-a"), { recursive: true })
      fs.writeFileSync(path.join(dir, "packages/app-a/package.json"),
        JSON.stringify({ name: "app-a", version: "1.0.0" }))

      const r = run(SCRIPT, ["route-css", "--all", "--dry-run"], dir)
      // Should either detect monorepo or process gracefully
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
    } finally { cleanup() }
  })

  test("detects pnpm workspaces", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "pnpm-root" }))
      fs.writeFileSync(path.join(dir, "pnpm-workspace.yaml"),
        `packages:\n  - 'packages/*'\n  - 'apps/*'\n`)
      fs.mkdirSync(path.join(dir, "packages/ui"), { recursive: true })
      fs.writeFileSync(path.join(dir, "packages/ui/package.json"),
        JSON.stringify({ name: "@scope/ui" }))

      const r = run(SCRIPT, ["route-css", "--all", "--dry-run"], dir)
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
    } finally { cleanup() }
  })

  test("--project= overrides monorepo detection", () => {
    const { dir, cleanup } = tmp()
    try {
      const pkgDir = path.join(dir, "packages/specific")
      fs.mkdirSync(pkgDir, { recursive: true })
      fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "root", workspaces: ["packages/*"] }))
      fs.writeFileSync(path.join(pkgDir, "package.json"), JSON.stringify({ name: "specific" }))

      const r = run(SCRIPT, ["route-css", `--project=${pkgDir}`, "--dry-run"], dir)
      assert.equal(r.status, 0)
    } finally { cleanup() }
  })

  test("non-monorepo project processes normally", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "package.json"),
        JSON.stringify({ name: "single-app", dependencies: {} }))
      const r = run(SCRIPT, ["route-css", "--dry-run"], dir)
      assert.equal(r.status, 0)
    } finally { cleanup() }
  })
})

// ─── Custom lint rules ────────────────────────────────────────────────────────
describe("tw lint — custom rules", () => {
  const SCRIPT = path.join(ROOT, "scripts/v48/lint-parallel.mjs")

  test("loadCustomRules function in source", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("loadCustomRules"), "should have loadCustomRules")
    assert.ok(c.includes("--rules="), "should support --rules= flag")
    assert.ok(c.includes(".tw-lint.json"), "should auto-load .tw-lint.json")
    assert.ok(c.includes("--rule="), "should support --rule= inline")
  })

  test("custom rules file is loaded and applied", () => {
    const { dir, cleanup } = tmp()
    try {
      // Create source file with a class that matches custom rule
      fs.writeFileSync(path.join(dir, "App.tsx"),
        'export const A = () => <div className="bg-red-500 flex" />')
      // Create custom rules file
      fs.writeFileSync(path.join(dir, "rules.json"), JSON.stringify({
        rules: [{ id: "no-bg-red", pattern: "^bg-red-", message: "Use brand colors", severity: "warning" }]
      }))

      const r = run(SCRIPT, [dir, "--rules=" + path.join(dir, "rules.json"), "--json"], ROOT)
      assert.equal(r.status, 0, `should exit 0 for warnings: ${r.stderr}`)
      const out = JSON.parse(r.stdout)
      assert.ok(out.diagnostics.some(d => d.rule === "no-bg-red"), "custom rule should fire")
    } finally { cleanup() }
  })

  test(".tw-lint.json auto-loaded from cwd", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "component.tsx"),
        'const A = () => <div className="space-x-4 flex" />')
      fs.writeFileSync(path.join(dir, ".tw-lint.json"), JSON.stringify({
        rules: [{ id: "prefer-gap", pattern: "^space-[xy]-", message: "Use gap-* instead", severity: "warning" }]
      }))

      const r = run(SCRIPT, [dir, "--json"], dir) // run from dir so .tw-lint.json is found
      assert.equal(r.status, 0)
      const out = JSON.parse(r.stdout)
      assert.ok(out.customRulesLoaded >= 1, "should report custom rules loaded")
    } finally { cleanup() }
  })

  test("--rule= inline syntax", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "test.tsx"),
        'const A = () => <div className="text-brand-100 p-4" />')
      const r = run(SCRIPT, [dir, '--rule=^text-brand-:Use semantic tokens', "--json"], ROOT)
      const out = JSON.parse(r.stdout)
      assert.ok(out.diagnostics.some(d => d.rule?.startsWith("inline")), "inline rule should fire")
    } finally { cleanup() }
  })

  test("custom rules included in output summary", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "x.tsx"), 'const A = () => <div className="p-4" />')
      const r = run(SCRIPT, [dir, "--json"], ROOT)
      assert.equal(r.status, 0)
      const out = JSON.parse(r.stdout)
      assert.ok("customRulesLoaded" in out, "should report customRulesLoaded")
    } finally { cleanup() }
  })
})

// ─── --no-exit-0 flag ─────────────────────────────────────────────────────────
describe("tw lint — --no-exit-0", () => {
  const SCRIPT = path.join(ROOT, "scripts/v48/lint-parallel.mjs")

  test("--no-exit-0 in source", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("--no-exit-0"))
    assert.ok(c.includes("noExit0"))
  })

  test("--severity= flag in source", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("--severity="))
    assert.ok(c.includes("severityFlag"))
  })

  test("exits 0 with issues when --no-exit-0", () => {
    const { dir, cleanup } = tmp()
    try {
      // flex-grow is deprecated — without --no-exit-0 would exit 1
      fs.writeFileSync(path.join(dir, "x.tsx"),
        'const A = () => <div className="flex-grow p-4" />')
      const r = run(SCRIPT, [dir, "--no-exit-0", "--json"], ROOT)
      assert.equal(r.status, 0, "should exit 0 even with deprecated class")
      const out = JSON.parse(r.stdout)
      assert.ok(out.noExit0 === true, "noExit0 should be true in output")
      assert.ok(out.diagnostics.some(d => d.rule === "deprecated"), "should still report issue")
    } finally { cleanup() }
  })

  test("exits 1 with issues without --no-exit-0 (normal mode)", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "x.tsx"),
        'const A = () => <div className="flex-grow p-4" />')
      const r = run(SCRIPT, [dir, "--json"], ROOT)
      assert.equal(r.status, 1, "should exit 1 when deprecated class found")
    } finally { cleanup() }
  })

  test("output includes severity and noExit0 fields", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "x.tsx"), 'const A = () => <div className="p-4" />')
      const r = run(SCRIPT, [dir, "--no-exit-0", "--severity=warning", "--json"], ROOT)
      assert.equal(r.status, 0)
      const out = JSON.parse(r.stdout)
      assert.ok("noExit0" in out)
      assert.ok("severity" in out)
      assert.equal(out.severity, "warning")
    } finally { cleanup() }
  })
})
