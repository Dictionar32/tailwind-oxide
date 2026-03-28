import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts", "src/plugins.ts", "src/presets.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  outDir: "dist",
  // Exclude @tailwindcss/oxide dan semua native .node binaries
  // agar tidak di-bundle (mereka di-require secara dynamic di runtime)
  external: [
    "@tailwindcss/oxide",
    "@tailwindcss/postcss",
    "tailwindcss",
    "postcss",
    "@tailwind-styled/compiler",
    "@tailwind-styled/scanner",
    "@tailwind-styled/engine",
    /\.node$/,
  ],
  esbuildOptions(options) {
    // Suppress native module resolution errors
    options.logOverride = {
      "missing-native-module": "silent",
    }
  },
})
