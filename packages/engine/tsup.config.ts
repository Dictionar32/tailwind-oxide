import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    internal: "src/internal.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node20",
  platform: "node",
  external: [
    "@tailwind-styled/analyzer",
    "@tailwind-styled/compiler",
    "@tailwind-styled/compiler/internal",
    "@tailwind-styled/scanner",
    "@tailwind-styled/shared",
    "typescript",
    "tailwindcss",
    "@tailwindcss/postcss",
    "postcss",
    "tailwind-merge",
    "react",
    "react-dom"
  ],
  banner: {
    js: "/* @tailwind-styled/engine v5.0.4 | MIT | https://github.com/dictionar32/tailwind-styled-v4 */",
  }
})
