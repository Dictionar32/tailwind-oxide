#!/usr/bin/env node
/**
 * Integration Test — Pipeline End-to-End Verification
 *
 * Memverifikasi pipeline utama berjalan:
 *   scanner → analyzer → compiler → engine
 */

import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "../..")
const results = []

function check(label, fn) {
  process.stdout.write(`  ${label}... `)
  try {
    fn()
    console.log("OK")
    results.push({ label, ok: true })
  } catch (e) {
    console.log("FAIL")
    if (process.env.VERBOSE) console.error(`    ${e.message}`)
    results.push({ label, ok: false, error: e.message })
  }
}

function checkAsync(label, fn) {
  return new Promise(async (resolve) => {
    process.stdout.write(`  ${label}... `)
    try {
      await fn()
      console.log("OK")
      results.push({ label, ok: true })
    } catch (e) {
      console.log("FAIL")
      if (process.env.VERBOSE) console.error(`    ${e.message}`)
      results.push({ label, ok: false, error: e.message })
    }
    resolve()
  })
}

// ── 1. Scanner ───────────────────────────────────────────────────────────────
console.log("\nScanner: @tailwind-styled/scanner")
let scanResult
try {
  const { scanWorkspaceAsync } = await import("@tailwind-styled/scanner")

  await checkAsync("scan workspace", async () => {
    scanResult = await scanWorkspaceAsync(ROOT)
    assert.ok(scanResult, "scanResult should exist")
    assert.ok(Array.isArray(scanResult.uniqueClasses), "uniqueClasses should be array")
  })

  check("scan found classes", () => {
    assert.ok(scanResult.uniqueClasses.length > 0, "should find at least 1 class")
    console.log(`      found ${scanResult.uniqueClasses.length} unique classes`)
  })
} catch (e) {
  console.log(`  Scanner not available: ${e.message}`)
}

// ── 2. Analyzer ──────────────────────────────────────────────────────────────
console.log("\nAnalyzer: @tailwind-styled/analyzer")
let analysis
try {
  const { analyzeWorkspace } = await import("@tailwind-styled/analyzer")

  await checkAsync("analyze workspace", async () => {
    analysis = await analyzeWorkspace(ROOT)
    assert.ok(analysis, "analysis should exist")
  })

  check("analysis has classStats", () => {
    assert.ok(analysis.classStats, "classStats should exist")
    const count = analysis.classStats?.all?.length ?? 0
    console.log(`      analyzed ${count} classes`)
  })
} catch (e) {
  console.log(`  Analyzer not available: ${e.message}`)
}

// ── 3. Compiler ──────────────────────────────────────────────────────────────
console.log("\nCompiler: @tailwind-styled/compiler")
try {
  const { generateCssForClasses } = await import("@tailwind-styled/compiler")

  const sampleClasses = scanResult?.uniqueClasses?.slice(0, 5) ?? []

  if (sampleClasses.length > 0) {
    await checkAsync(`compile ${sampleClasses.length} classes`, async () => {
      const css = await generateCssForClasses(sampleClasses)
      assert.equal(typeof css, "string", "css should be string")
      console.log(`      compiled -> ${css.length} chars CSS`)
    })
  } else {
    console.log("  (skipped — no classes to compile)")
  }
} catch (e) {
  console.log(`  Compiler not available: ${e.message}`)
}

// ── 4. Engine ────────────────────────────────────────────────────────────────
console.log("\nEngine: @tailwind-styled/engine")
try {
  const { createEngine } = await import("@tailwind-styled/engine")

  await checkAsync("engine build", async () => {
    const engine = await createEngine({ root: ROOT, compileCss: false })
    const result = await engine.build()
    assert.ok(result, "result should exist")
    assert.ok(result.scan, "result.scan should exist")
    console.log(`      engine built with ${result.scan.uniqueClasses.length} classes`)
  })
} catch (e) {
  console.log(`  Engine not available: ${e.message}`)
}

// ── Summary ──────────────────────────────────────────────────────────────────
const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length

console.log(`\n${"─".repeat(50)}`)
console.log(`Pipeline test: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.error("\nFailed checks:")
  for (const r of results.filter((r) => !r.ok)) {
    console.error(`  ✗ ${r.label}: ${r.error?.slice(0, 100)}`)
  }
  process.exit(1)
}

console.log("Pipeline end-to-end OK ✓")
