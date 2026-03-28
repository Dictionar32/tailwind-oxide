import { defineConfig } from "tsup"

export default defineConfig({
  entry: { plugin: "src/plugin.ts", schemas: "src/schemas.ts" },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: [
    // Framework & Node built-ins
    "vite",
    "path",
    "@tailwind-styled/compiler",
    "@tailwind-styled/engine",
    "@tailwind-styled/scanner",
    "@tailwind-styled/shared",
    // Tailwind runtime & postcss — native .node bindings tidak bisa di-bundle
    "tailwindcss",
    "@tailwindcss/oxide",
    "@tailwindcss/postcss",
    "postcss",
    "tailwind-merge",
  ],
  esbuildOptions(options) {
    // Skip platform-specific native bindings — tidak bisa di-bundle
    options.external = [...(options.external ?? []), "*.node"]
  },
  tsconfig: "tsconfig.json",
  // Fix: suppress named+default exports warning — vite plugins are always named imports
  rollupOptions: {
    output: { exports: "named" },
  },
})
