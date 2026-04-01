import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.tsx"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "@tailwind-styled/analyzer",
    "@tailwind-styled/scanner",
    "inversify",
    "reflect-metadata",
    "zod",
  ],
  esbuildOptions(options) {
    options.banner = { js: '"use client"' }
  },
})
