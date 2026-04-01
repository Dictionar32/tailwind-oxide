import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index:  "src/index.ts",
    loader: "src/loader.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  // Hanya runtime Node built-ins & Tailwind yang external.
  external: [
    "fs",
    "path",
    "crypto",
    "@tailwind-styled/compiler",
    "@tailwind-styled/engine",
    "@tailwind-styled/shared",
    // Native bindings — tidak bisa di-bundle oleh tsup
    "oxc-parser",
    "@tailwind-styled/native",
    // Tailwind runtime & postcss — native .node bindings tidak bisa di-bundle
    "tailwindcss",
    "@tailwindcss/postcss",
    "@tailwindcss/oxide",
    "postcss",
    "tailwind-merge",
  ],
  esbuildOptions(options) {
    // Skip platform-specific native bindings — tidak bisa di-bundle
    options.external = [...(options.external ?? []), "*.node"]
  },
  tsconfig: "tsconfig.json",
})
