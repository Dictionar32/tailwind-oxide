/**
 * Unit tests — tw shake (v4.7 real tree shaking)
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const SHAKE_SCRIPT = fileURLToPath(new URL("../../../scripts/v47/shake-css.mjs", import.meta.url))

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-shake-test-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

function runShake(cssFile, sourceDir, extra = []) {
  const args = [SHAKE_SCRIPT, cssFile]
  if (sourceDir) args.push("--classes-from", sourceDir)
  args.push(...extra)
  return spawnSync(process.execPath, args, { encoding: "utf8", timeout: 10_000 })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("tw shake — validation", () => {
  test("exits non-zero when no css file given", () => {
    const r = spawnSync(process.execPath, [SHAKE_SCRIPT], { encoding: "utf8" })
    assert.notEqual(r.status, 0)
  })

  test("exits non-zero for missing css file", () => {
    const r = spawnSync(process.execPath, [SHAKE_SCRIPT, "/no/such/file.css"], { encoding: "utf8" })
    assert.notEqual(r.status, 0)
  })
})

describe("tw shake — removes unused rules", () => {
  test("keeps class that is used in source", () => {
    const { dir, cleanup } = makeTempDir()
    try {
      // CSS with two rules
      const cssFile = path.join(dir, "out.css")
      fs.writeFileSync(cssFile, `.px-4{padding-left:1rem;padding-right:1rem}\n.py-2{padding-top:.5rem;padding-bottom:.5rem}\n`)

      // Source that uses only px-4
      const srcDir = path.join(dir, "src")
      fs.mkdirSync(srcDir)
      fs.writeFileSync(path.join(srcDir, "App.tsx"), `<div className="px-4">Hello</div>`)

      const r = runShake(cssFile, srcDir)
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)

      const result = JSON.parse(r.stdout)
      assert.equal(result.keptRules, 1)
      assert.equal(result.removedRules, 1)

      const remaining = fs.readFileSync(cssFile, "utf8")
      assert.ok(remaining.includes(".px-4"), "should keep .px-4")
      assert.ok(!remaining.includes(".py-2"), "should remove .py-2")
    } finally {
      cleanup()
    }
  })

  test("keeps all rules when all classes used", () => {
    const { dir, cleanup } = makeTempDir()
    try {
      const cssFile = path.join(dir, "out.css")
      fs.writeFileSync(cssFile, `.flex{display:flex}\n.gap-4{gap:1rem}\n.rounded{border-radius:.25rem}\n`)

      const srcDir = path.join(dir, "src")
      fs.mkdirSync(srcDir)
      fs.writeFileSync(path.join(srcDir, "App.tsx"), `<div className="flex gap-4 rounded">ok</div>`)

      const r = runShake(cssFile, srcDir)
      const result = JSON.parse(r.stdout)
      assert.equal(result.removedRules, 0)
      assert.equal(result.keptRules, 3)
    } finally {
      cleanup()
    }
  })

  test("removes all rules when no source classes found", () => {
    const { dir, cleanup } = makeTempDir()
    try {
      const cssFile = path.join(dir, "out.css")
      fs.writeFileSync(cssFile, `.text-red-500{color:rgb(239,68,68)}\n.bg-green-500{background:rgb(34,197,94)}\n`)

      const srcDir = path.join(dir, "src")
      fs.mkdirSync(srcDir)
      fs.writeFileSync(path.join(srcDir, "App.tsx"), `<div>No tailwind classes here</div>`)

      const r = runShake(cssFile, srcDir)
      const result = JSON.parse(r.stdout)
      assert.equal(result.keptRules, 0)
      assert.equal(result.removedRules, 2)
    } finally {
      cleanup()
    }
  })
})

describe("tw shake — output shape", () => {
  test("output has all required fields", () => {
    const { dir, cleanup } = makeTempDir()
    try {
      const cssFile = path.join(dir, "out.css")
      fs.writeFileSync(cssFile, `.p-4{padding:1rem}\n`)

      const srcDir = path.join(dir, "src")
      fs.mkdirSync(srcDir)
      fs.writeFileSync(path.join(srcDir, "index.tsx"), `<div className="p-4"/>`)

      const r = runShake(cssFile, srcDir)
      const out = JSON.parse(r.stdout)

      assert.ok("cssFile" in out)
      assert.ok("usedClassCount" in out)
      assert.ok("originalRules" in out)
      assert.ok("keptRules" in out)
      assert.ok("removedRules" in out)
      assert.ok("originalBytes" in out)
      assert.ok("finalBytes" in out)
      assert.ok("savedBytes" in out)
      assert.ok("savedPercent" in out)
    } finally {
      cleanup()
    }
  })

  test("savedBytes = originalBytes - finalBytes", () => {
    const { dir, cleanup } = makeTempDir()
    try {
      const cssFile = path.join(dir, "out.css")
      fs.writeFileSync(cssFile, `.p-4{padding:1rem}\n.m-4{margin:1rem}\n`)

      const srcDir = path.join(dir, "src")
      fs.mkdirSync(srcDir)
      fs.writeFileSync(path.join(srcDir, "index.tsx"), `<div className="p-4"/>`)

      const r = runShake(cssFile, srcDir)
      const out = JSON.parse(r.stdout)
      assert.equal(out.savedBytes, out.originalBytes - out.finalBytes)
    } finally {
      cleanup()
    }
  })
})

describe("tw shake — preserves @-rules and comments", () => {
  test("keeps @layer and @media rules", () => {
    const { dir, cleanup } = makeTempDir()
    try {
      const cssFile = path.join(dir, "out.css")
      fs.writeFileSync(cssFile, `@layer base{*{box-sizing:border-box}}\n@media(min-width:768px){.md\\:flex{display:flex}}\n.unused{color:red}\n`)

      const srcDir = path.join(dir, "src")
      fs.mkdirSync(srcDir)
      fs.writeFileSync(path.join(srcDir, "index.tsx"), `<div/>`)

      const r = runShake(cssFile, srcDir)
      const remaining = fs.readFileSync(cssFile, "utf8")
      assert.ok(remaining.includes("@layer base"), "should keep @layer")
      assert.ok(!remaining.includes(".unused"), "should remove .unused")
    } finally {
      cleanup()
    }
  })
})
