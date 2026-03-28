#!/usr/bin/env node
/**
 * Smoke: scanner -> analyzer -> compiler -> engine full flow.
 * Memastikan pipeline utama bisa berjalan end-to-end.
 */
import { scanWorkspaceAsync } from "@tailwind-styled/scanner"
import { analyzeWorkspace } from "@tailwind-styled/analyzer"
import { generateCssForClasses } from "@tailwind-styled/compiler"
import { createEngine } from "@tailwind-styled/engine"

const cwd = process.cwd()

// 1. Scan
console.log("  1. scan...")
const scanResult = await scanWorkspaceAsync(cwd)
if (!scanResult || !scanResult.uniqueClasses) throw new Error("pipeline: scan failed")
console.log(`     found ${scanResult.uniqueClasses.length} unique classes`)

// 2. Analyze
console.log("  2. analyze...")
const analysis = await analyzeWorkspace(cwd)
if (!analysis) throw new Error("pipeline: analyze failed")
console.log(`     analyzed ${analysis.classStats?.all?.length ?? 0} classes`)

// 3. Compile (generate CSS for first few classes)
console.log("  3. compile...")
const sampleClasses = scanResult.uniqueClasses.slice(0, 5)
if (sampleClasses.length > 0) {
  const css = await generateCssForClasses(sampleClasses)
  if (typeof css !== "string") throw new Error("pipeline: compile returned non-string")
  console.log(`     compiled ${sampleClasses.length} classes -> ${css.length} chars CSS`)
}

// 4. Engine full flow
console.log("  4. engine build...")
const engine = await createEngine({ root: cwd, compileCss: false })
const result = await engine.build()
if (!result || !result.scan) throw new Error("pipeline: engine build failed")
console.log(`     engine built with ${result.scan.uniqueClasses.length} classes`)

console.log("pipeline flow smoke OK")
