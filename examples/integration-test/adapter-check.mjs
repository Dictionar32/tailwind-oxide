#!/usr/bin/env node
/**
 * Integration Test — Adapter API Surface Verification
 *
 * Memverifikasi setiap adapter (Vite, Next, Rspack) memiliki API surface yang benar.
 */

import assert from "node:assert/strict"

const results = []

const isNextLoaderRule = (rule) =>
  Array.isArray(rule?.use) &&
  rule.use.some(
    (entry) => typeof entry?.loader === "string" && /webpackLoader\.(cjs|js)$/.test(entry.loader)
  )

function check(label, fn) {
  process.stdout.write(`  ${label}... `)
  try {
    fn()
    console.log("OK")
    results.push({ label, ok: true })
  } catch (e) {
    console.log("FAIL")
    results.push({ label, ok: false, error: e.message })
  }
}

// ── Vite adapter ─────────────────────────────────────────────────────────────
console.log("\nVite adapter: @tailwind-styled/vite")
try {
  const { tailwindStyledPlugin } = await import("@tailwind-styled/vite")
  const plugin = tailwindStyledPlugin()

  check("plugin name is tailwind-styled-v4", () => {
    assert.equal(plugin.name, "tailwind-styled-v4")
  })

  check("enforce is pre", () => {
    assert.equal(plugin.enforce, "pre")
  })

  check("has transform hook", () => {
    assert.equal(typeof plugin.transform, "function")
  })

  check("has buildEnd hook", () => {
    assert.equal(typeof plugin.buildEnd, "function")
  })

  check("has handleHotUpdate hook", () => {
    assert.equal(typeof plugin.handleHotUpdate, "function")
  })

  check("HMR sends full-reload on tsx change", () => {
    const messages = []
    plugin.handleHotUpdate({
      file: "/src/App.tsx",
      server: {
        ws: {
          send(payload) {
            messages.push(payload)
          },
        },
      },
    })
    assert.deepEqual(messages, [{ type: "full-reload" }])
  })
} catch (e) {
  console.log(`  Vite adapter not available: ${e.message}`)
}

// ── Next adapter ─────────────────────────────────────────────────────────────
console.log("\nNext adapter: @tailwind-styled/next")
try {
  const { withTailwindStyled } = await import("@tailwind-styled/next")
  const wrapped = withTailwindStyled({
    autoClientBoundary: false,
    addDataAttr: false,
  })({
    reactStrictMode: true,
  })

  check("has webpack function", () => {
    assert.equal(typeof wrapped.webpack, "function")
  })

  check("has turbopack object", () => {
    assert.equal(typeof wrapped.turbopack, "object")
  })

  check("webpack injects loader rule", async () => {
    const webpackConfig = await wrapped.webpack({ module: { rules: [] } }, {})
    const rule = webpackConfig.module.rules[0]
    assert.equal(isNextLoaderRule(rule), true)
    assert.match(rule.use[0].loader, /webpackLoader\.(cjs|js)$/)
    assert.equal(rule.use[0].options.autoClientBoundary, false)
    assert.equal(rule.use[0].options.addDataAttr, false)
  })

  check("turbopack injects rules for tsx/ts/jsx/js", () => {
    for (const key of ["*.js", "*.jsx", "*.ts", "*.tsx"]) {
      const rule = wrapped.turbopack.rules[key]
      assert.ok(rule, `missing rule for ${key}`)
      assert.equal(Array.isArray(rule.loaders), true)
      assert.match(rule.loaders[0].loader, /turbopackLoader\.(cjs|js)$/)
    }
  })
} catch (e) {
  console.log(`  Next adapter not available: ${e.message}`)
}

// ── Rspack adapter ───────────────────────────────────────────────────────────
console.log("\nRspack adapter: @tailwind-styled/rspack")
try {
  const { tailwindStyledRspackPlugin } = await import("@tailwind-styled/rspack")
  const plugin = tailwindStyledRspackPlugin({ addDataAttr: false })
  const compiler = {
    options: {
      mode: "production",
      module: { rules: [] },
    },
  }
  plugin.apply(compiler)

  check("injects exactly 1 rule", () => {
    assert.equal(compiler.options.module.rules.length, 1)
  })

  check("rule has rspack marker", () => {
    assert.equal(compiler.options.module.rules[0]._tailwindStyledRspackMarker, true)
  })

  check("loader path is correct", () => {
    assert.match(compiler.options.module.rules[0].use[0].loader, /loader\.(cjs|js)$/)
  })

  check("options passthrough", () => {
    assert.equal(compiler.options.module.rules[0].use[0].options.addDataAttr, false)
  })
} catch (e) {
  console.log(`  Rspack adapter not available: ${e.message}`)
}

// ── Summary ──────────────────────────────────────────────────────────────────
const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length

console.log(`\n${"─".repeat(50)}`)
console.log(`Adapter test: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.error("\nFailed checks:")
  for (const r of results.filter((r) => !r.ok)) {
    console.error(`  ✗ ${r.label}: ${r.error?.slice(0, 100)}`)
  }
  process.exit(1)
}

console.log("All adapter checks OK ✓")
