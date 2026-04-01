import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    CssInjector: "src/CssInjector.tsx",
    batchedInjector: "src/batchedInjector.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  bundle: false,
  external: ["react", "react-dom", "inversify", "reflect-metadata", "zod"],
})
