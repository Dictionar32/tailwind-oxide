import { defineConfig } from "tsup"

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/setup.ts",
    "src/preflight.ts",
    "src/analyze.ts",
    "src/scan.ts",
    "src/stats.ts",
    "src/migrate.ts",
    "src/init.ts",
    "src/extract.ts",
    "src/createApp.ts",
  ],
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
