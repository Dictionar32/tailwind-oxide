import { defineConfig } from "@rspack/cli"
import path from "node:path"
import { tailwindStyled } from "@tailwind-styled/rspack"

export default defineConfig({
  mode: "development",
  entry: "./src/index.ts",
  output: { path: path.resolve("dist"), filename: "bundle.js" },
  plugins: [tailwindStyled()],
})
