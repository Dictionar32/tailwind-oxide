#!/usr/bin/env node
/**
 * Smoke: Rspack adapter plugin creation.
 */
import { tailwindStyledRspackPlugin } from "@tailwind-styled/rspack"

if (typeof tailwindStyledRspackPlugin !== "function")
  throw new Error("rspack adapter: tailwindStyledRspackPlugin is not a function")

const plugin = tailwindStyledRspackPlugin()
if (!plugin) throw new Error("rspack adapter: plugin creation failed")
console.log("rspack adapter smoke OK")
