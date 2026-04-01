import { defineConfig } from "@rspack/cli"
import path from "node:path"
import { tailwindStyledRspackPlugin } from "@tailwind-styled/rspack"

export default defineConfig({
  mode: "development",
  target: "node",
  entry: "./src/index.ts",
  output: { path: path.resolve("dist"), filename: "bundle.js" },
  plugins: [tailwindStyledRspackPlugin()],
})
