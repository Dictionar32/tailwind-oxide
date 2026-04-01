import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    api: "src/api.ts",
    index: "src/index.ts",
    setup: "src/setup.ts",
    preflight: "src/preflight.ts",
    analyze: "src/analyze.ts",
    scan: "src/scan.ts",
    stats: "src/stats.ts",
    migrate: "src/migrate.ts",
    init: "src/init.ts",
    extract: "src/extract.ts",
    createApp: "src/createAppEntry.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node20",
  platform: "node",
  noExternal: [
    "@clack/prompts",
    "@clack/core",
    "commander",
    "picocolors",
    "sisteransi"
  ],
  external: [
    "@tailwind-styled/analyzer",
    "@tailwind-styled/compiler",
    "@tailwind-styled/engine",
    "@tailwind-styled/scanner",
    "@tailwind-styled/shared",
    "@tailwind-styled/next",
    "@tailwind-styled/vite",
    "@tailwind-styled/rspack",
    "@tailwind-styled/vue",
    "@tailwind-styled/svelte",
    "@tailwindcss/postcss",
    "postcss",
    "tailwindcss",
  ],
  esbuildOptions(options) {
    options.external = [...(options.external ?? []), "*.node"]
    options.banner = {
      js: `import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);`
    }
  },
})
