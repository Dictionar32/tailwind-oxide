#!/usr/bin/env node
/**
 * Integration Test — Package Import Verification
 *
 * Memverifikasi semua workspace package bisa di-import:
 *   1. Root export: tailwind-styled-v4 (tw, createComponent, cx, cv)
 *   2. Subpath exports: tailwind-styled-v4/compiler, /vite, /next, dll
 *   3. Workspace packages: @tailwind-styled/engine, /compiler, dll
 */

import assert from "node:assert/strict"

const results = []

async function checkImport(label, specifier) {
  process.stdout.write(`  ${label}... `)
  try {
    await import(specifier)
    console.log("OK")
    results.push({ label, ok: true })
  } catch (e) {
    console.log("FAIL")
    results.push({ label, ok: false, error: e.message })
  }
}

// ── 1. Root export ───────────────────────────────────────────────────────────
console.log("\nRoot export: tailwind-styled-v4")
await checkImport("tw", "tailwind-styled-v4")
await checkImport("createComponent (via core)", "@tailwind-styled/core")

// Verify tw is a function
try {
  const mod = await import("tailwind-styled-v4")
  assert.equal(typeof mod.tw, "function", "tw should be a function")
  assert.equal(typeof mod.createComponent, "function", "createComponent should be a function")
  console.log("  tw/createComponent API surface OK")
} catch (e) {
  console.log("  tw/createComponent API surface FAIL")
  results.push({ label: "tw/createComponent API surface", ok: false })
}

// ── 2. Subpath exports ──────────────────────────────────────────────────────
console.log("\nSubpath exports: tailwind-styled-v4/*")
const subpaths = [
  "tailwind-styled-v4/compiler",
  "tailwind-styled-v4/vite",
  "tailwind-styled-v4/next",
  "tailwind-styled-v4/engine",
  "tailwind-styled-v4/scanner",
  "tailwind-styled-v4/theme",
  "tailwind-styled-v4/preset",
  "tailwind-styled-v4/cli",
  "tailwind-styled-v4/analyzer",
  "tailwind-styled-v4/shared",
  "tailwind-styled-v4/runtime",
  "tailwind-styled-v4/runtime-css",
  "tailwind-styled-v4/plugin",
  "tailwind-styled-v4/plugin-registry",
  "tailwind-styled-v4/animate",
  "tailwind-styled-v4/rspack",
  "tailwind-styled-v4/vue",
  "tailwind-styled-v4/testing",
]

for (const sp of subpaths) {
  await checkImport(`subpath ${sp.replace("tailwind-styled-v4/", "")}`, sp)
}

// ── 3. Workspace packages ───────────────────────────────────────────────────
console.log("\nWorkspace packages: @tailwind-styled/*")
const workspacePackages = [
  "@tailwind-styled/engine",
  "@tailwind-styled/scanner",
  "@tailwind-styled/compiler",
  "@tailwind-styled/analyzer",
  "@tailwind-styled/core",
  "@tailwind-styled/shared",
  "@tailwind-styled/theme",
  "@tailwind-styled/plugin",
  "@tailwind-styled/plugin-registry",
  "@tailwind-styled/preset",
  "@tailwind-styled/vite",
  "@tailwind-styled/next",
  "@tailwind-styled/rspack",
  "@tailwind-styled/vue",
  "@tailwind-styled/svelte",
  "@tailwind-styled/runtime",
  "@tailwind-styled/runtime-css",
  "@tailwind-styled/animate",
  "@tailwind-styled/testing",
]

for (const pkg of workspacePackages) {
  await checkImport(pkg.replace("@tailwind-styled/", ""), pkg)
}

// ── Summary ──────────────────────────────────────────────────────────────────
const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length

console.log(`\n${"─".repeat(50)}`)
console.log(`Import test: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.error("\nFailed imports:")
  for (const r of results.filter((r) => !r.ok)) {
    console.error(`  ✗ ${r.label}: ${r.error?.slice(0, 100)}`)
  }
  process.exit(1)
}

console.log("All imports OK ✓")
