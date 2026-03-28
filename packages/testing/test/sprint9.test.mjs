/**
 * Tests — Sprint 9
 * Covers: tray icon, marketplace, parse .vue/.svelte/.mdx, transform .mdx
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

function run(script, args = [], cwd = ROOT) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8", timeout: 15_000, cwd,
  })
}
function tmp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-s9-"))
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

// ─── Studio Desktop Tray Icon ─────────────────────────────────────────────────
describe("Studio Desktop — Tray Icon", () => {
  test("tray.png icon exists", () => {
    const p = path.join(ROOT, "packages/studio-desktop/src/icons/tray.png")
    assert.ok(fs.existsSync(p), "tray.png should exist")
    assert.ok(fs.statSync(p).size > 50, "tray.png should be non-trivial PNG")
  })

  test("tray@2x.png icon exists", () => {
    const p = path.join(ROOT, "packages/studio-desktop/src/icons/tray@2x.png")
    assert.ok(fs.existsSync(p), "tray@2x.png should exist")
  })

  test("main.js createTray uses icon file", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/studio-desktop/src/main.js"), "utf8")
    assert.ok(c.includes("tray.png"), "should reference tray.png")
    assert.ok(c.includes("new Tray"), "should create Tray instance")
    assert.ok(c.includes("setContextMenu"), "should set context menu")
    assert.ok(c.includes("setToolTip"), "should set tooltip")
  })

  test("tray context menu has Open Studio and Quit", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/studio-desktop/src/main.js"), "utf8")
    assert.ok(c.includes("Open Studio"), "should have Open Studio menu item")
    assert.ok(c.includes("Quit"), "should have Quit menu item")
  })

  test("tray handles click events", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/studio-desktop/src/main.js"), "utf8")
    assert.ok(c.includes('tray.on("click"') || c.includes("tray.on('click'"), "should handle click")
  })
})

// ─── Plugin Marketplace ───────────────────────────────────────────────────────
describe("Plugin Marketplace", () => {
  const SCRIPT = path.join(ROOT, "scripts/v45/marketplace.mjs")

  test("marketplace.mjs exists", () => {
    assert.ok(fs.existsSync(SCRIPT))
    assert.ok(fs.statSync(SCRIPT).size > 1000)
  })

  test("help exits 0 with usage info", () => {
    const r = run(SCRIPT, ["help"])
    assert.equal(r.status, 0)
    assert.ok(r.stdout.includes("publish") && r.stdout.includes("search"))
  })

  test("featured exits 0 (offline fallback)", async () => {
    const r = run(SCRIPT, ["featured", "--json"])
    assert.equal(r.status, 0)
    const out = JSON.parse(r.stdout)
    assert.ok(Array.isArray(out), "should return array")
    assert.ok(out.length > 0, "should have at least built-in featured plugins")
  })

  test("search with no args exits 0", () => {
    const r = run(SCRIPT, ["search"])
    assert.equal(r.status, 0)
  })

  test("publish without token exits 1", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "package.json"),
        JSON.stringify({ name: "my-plugin", version: "1.0.0", keywords: ["tailwind-styled-plugin"] }))
      const r = spawnSync(process.execPath, [SCRIPT, "publish"], {
        encoding: "utf8", timeout: 5000, cwd: dir,
        env: { ...process.env, TW_MARKETPLACE_TOKEN: "" },
      })
      assert.notEqual(r.status, 0, "should fail without token")
    } finally { cleanup() }
  })

  test("publish --dry-run works without token", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "package.json"),
        JSON.stringify({ name: "test-plugin", version: "1.0.0", keywords: ["tailwind-styled-plugin"], description: "test" }))
      const r = spawnSync(process.execPath, [SCRIPT, "publish", "--dry-run"], {
        encoding: "utf8", timeout: 5000, cwd: dir,
        env: { ...process.env, TW_MARKETPLACE_TOKEN: "" },
      })
      assert.equal(r.status, 0, `should succeed in dry-run: ${r.stderr}`)
      assert.ok(r.stdout.includes("DRY RUN") || r.stdout.includes("dry"), "should show dry run indicator")
    } finally { cleanup() }
  })

  test("info on missing plugin exits 1", () => {
    const r = run(SCRIPT, ["info", "nonexistent-plugin-xyz-123"])
    assert.notEqual(r.status, 0)
  })

  test("has infer category logic", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("inferCategory"))
    assert.ok(c.includes("animation") && c.includes("layout") && c.includes("theme"))
  })

  test("CLI plugin marketplace command wired", () => {
    const c = fs.readFileSync(path.join(ROOT, "packages/cli/src/index.ts"), "utf8")
    assert.ok(c.includes("marketplace") || c.includes("marketplace.mjs"))
  })
})

// ─── tw parse .vue .svelte .mdx ───────────────────────────────────────────────
describe("tw parse — .vue .svelte .mdx support", () => {
  const SCRIPT = path.join(ROOT, "scripts/v46/parse.mjs")

  test("parse.mjs has Vue extraction logic", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("extractFromVue") || c.includes(".vue"))
    assert.ok(c.includes("<script") || c.includes("scriptRe"))
  })

  test("parse.mjs has Svelte extraction logic", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("extractFromSvelte") || c.includes(".svelte"))
  })

  test("parse.mjs has MDX extraction logic", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes("extractFromMdx") || c.includes(".mdx"))
  })

  test("parse .vue file extracts classes", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "Button.vue"), `
<template>
  <button class="px-4 py-2 bg-blue-500 text-white">Click</button>
</template>
<script setup>
const label = 'Hello'
</script>`)
      const r = run(SCRIPT, [path.join(dir, "Button.vue")])
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
      const out = JSON.parse(r.stdout)
      assert.ok(out.classes.includes("px-4"), "should extract px-4 from Vue template")
      assert.ok(out.classes.includes("bg-blue-500"), "should extract bg-blue-500")
    } finally { cleanup() }
  })

  test("parse .svelte file extracts classes", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "Card.svelte"), `
<script>
  let active = false
</script>
<div class="rounded-lg shadow-md p-6">
  <span class:active="font-bold">Content</span>
</div>`)
      const r = run(SCRIPT, [path.join(dir, "Card.svelte")])
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
      const out = JSON.parse(r.stdout)
      assert.ok(out.classes.includes("rounded-lg") || out.classes.includes("shadow-md"),
        "should extract classes from Svelte")
    } finally { cleanup() }
  })

  test("parse .mdx file extracts classes", () => {
    const { dir, cleanup } = tmp()
    try {
      fs.writeFileSync(path.join(dir, "docs.mdx"), `
# My Docs

Some markdown content here.

import { Button } from './Button'

<Button className="flex items-center gap-2 text-sm">
  Click me
</Button>

More markdown.
`)
      const r = run(SCRIPT, [path.join(dir, "docs.mdx")])
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
      const out = JSON.parse(r.stdout)
      assert.ok(out.classes.includes("flex") || out.classes.includes("items-center"),
        "should extract classes from MDX JSX blocks")
    } finally { cleanup() }
  })
})

// ─── tw transform .mdx ────────────────────────────────────────────────────────
describe("tw transform — .mdx support", () => {
  const SCRIPT = path.join(ROOT, "scripts/v46/transform.mjs")

  test("transform.mjs has .mdx handling", () => {
    const c = fs.readFileSync(SCRIPT, "utf8")
    assert.ok(c.includes(".mdx") || c.includes("mdx"))
  })

  test("transform .mdx exits 0", () => {
    const { dir, cleanup } = tmp()
    try {
      const mdxFile = path.join(dir, "page.mdx")
      fs.writeFileSync(mdxFile, `
import { Button } from './Button'
export const meta = { title: 'Page' }

# Hello

<Button className="px-4 py-2">Click</Button>
`)
      const r = run(SCRIPT, [mdxFile])
      assert.equal(r.status, 0, `stderr: ${r.stderr}`)
    } finally { cleanup() }
  })
})
