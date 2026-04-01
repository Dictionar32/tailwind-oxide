import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/internal.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node20",
  platform: "node",
  external: [
    "typescript",
    "tailwindcss",
    "@tailwindcss/postcss",
    "postcss",
    "tailwind-merge",
    "oxc-parser"
  ]
})
