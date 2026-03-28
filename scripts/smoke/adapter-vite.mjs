#!/usr/bin/env node
/**
 * Smoke: Vite adapter bisa initialize dan create plugin.
 */
import { tailwindStyledPlugin } from "@tailwind-styled/vite"

const plugin = tailwindStyledPlugin()
if (!plugin) throw new Error("vite adapter: plugin creation failed")
if (!plugin.name) throw new Error("vite adapter: plugin missing name")
console.log(`vite adapter smoke OK (plugin: ${plugin.name})`)
