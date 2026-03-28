#!/usr/bin/env node
"use strict"
const fs = require("fs")
const path = require("path")

const VSCODE_ROOT = path.resolve(__dirname, "../")
const MONO_ROOT = path.resolve(VSCODE_ROOT, "../../")
const SCRIPTS_ROOT = path.join(MONO_ROOT, "scripts")
const DIST = path.join(VSCODE_ROOT, "dist")

const SCRIPTS_TO_COPY = [
  { src: path.join(SCRIPTS_ROOT, "v48/lsp.mjs"), dst: path.join(DIST, "lsp.mjs") },
]

console.log("[postbuild] Starting...")
console.log(`[postbuild] VSCODE_ROOT: ${VSCODE_ROOT}`)
console.log(`[postbuild] SCRIPTS_ROOT: ${SCRIPTS_ROOT}`)

let hasErrors = false

for (const { src, dst } of SCRIPTS_TO_COPY) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst)
    console.log(`[postbuild] ${path.basename(src)} → dist/ ✅`)
  } else {
    console.warn(`[postbuild] ${src} not found, skipping`)
  }
}

const requiredFiles = ["extension.js"]
for (const file of requiredFiles) {
  const filePath = path.join(DIST, file)
  if (fs.existsSync(filePath)) {
    console.log(`[postbuild] ${file} present ✅`)
  } else {
    console.error(`[postbuild] ${file} missing in dist/ ❌`)
    hasErrors = true
  }
}

if (hasErrors) {
  console.error("[postbuild] Some files missing!")
  process.exit(1)
} else {
  console.log("[postbuild] Complete ✅")
}
