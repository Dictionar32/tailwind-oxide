#!/usr/bin/env node
/**
 * Smoke: subpath export tetap bekerja.
 * Semua subpath yang sudah ada di root package.json harus tetap accessible.
 */
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
  "tailwind-styled-v4/svelte",
  "tailwind-styled-v4/testing",
  "tailwind-styled-v4/storybook-addon",
  "tailwind-styled-v4/devtools",
  "tailwind-styled-v4/atomic",
  "tailwind-styled-v4/dashboard",
]

let failed = 0
for (const subpath of subpaths) {
  try {
    await import(subpath)
    console.log(`subpath import OK: ${subpath}`)
  } catch (e) {
    console.error(`subpath import FAIL: ${subpath} - ${e.message}`)
    failed++
  }
}

if (failed > 0) {
  console.error(`${failed} subpath imports failed`)
  process.exit(1)
}
console.log("all subpath imports OK")
