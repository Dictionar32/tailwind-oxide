#!/usr/bin/env node
/**
 * Smoke: direct package import tetap bekerja.
 * Semua @tailwind-styled/* harus tetap accessible.
 */
const packages = [
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
  "@tailwind-styled/syntax",
]

let failed = 0
for (const pkg of packages) {
  try {
    await import(pkg)
    console.log(`workspace import OK: ${pkg}`)
  } catch (e) {
    console.error(`workspace import FAIL: ${pkg} - ${e.message}`)
    failed++
  }
}

if (failed > 0) {
  console.error(`${failed} workspace imports failed`)
  process.exit(1)
}
console.log("all workspace imports OK")
