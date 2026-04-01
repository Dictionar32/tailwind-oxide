import assert from "node:assert/strict"
import { test } from "node:test"

import {
  formatDuration,
  formatMemory,
  getBuildTimeColor,
  getHealthColor,
  getModeColor,
  getMemoryColor,
  getPipelinePercentages,
} from "../dist/index.js"

test("trace utilities provide reusable formatting functions", () => {
  // Format memory
  assert.equal(formatMemory(512), "512B")
  assert.equal(formatMemory(2048), "2.0KB")
  assert.equal(formatMemory(2097152), "2.0MB")

  // Format duration
  assert.equal(formatDuration(100), "100ms")
  assert.equal(formatDuration(1000), "1.0s")
  assert.equal(formatDuration(null), "—")
})

test("trace utilities provide color mappings for modes and health", () => {
  // Mode colors
  assert.equal(getModeColor("build"), "#fbbf24")
  assert.equal(getModeColor("watch"), "#34d399")
  assert.equal(getModeColor("error"), "#f87171")
  assert.equal(getModeColor("unknown"), "#52525b")

  // Health colors
  assert.equal(getHealthColor("healthy"), "#34d399")
  assert.equal(getHealthColor("degraded"), "#fbbf24")
  assert.equal(getHealthColor("unhealthy"), "#f87171")
})

test("trace utilities calculate performance colors", () => {
  // Build time color
  assert.equal(getBuildTimeColor(200), "#34d399") // fast
  assert.equal(getBuildTimeColor(750), "#fbbf24") // moderate
  assert.equal(getBuildTimeColor(1500), "#f87171") // slow

  // Memory color
  assert.equal(getMemoryColor(100), "#34d399") // low
  assert.equal(getMemoryColor(300), "#fbbf24") // moderate
  assert.equal(getMemoryColor(600), "#f87171") // high
})

test("trace utilities calculate pipeline percentages", () => {
  const metrics = {
    generatedAt: new Date().toISOString(),
    buildMs: null,
    scanMs: 200,
    analyzeMs: 300,
    compileMs: 500,
    memoryMb: null,
    classCount: null,
    fileCount: null,
    cssBytes: null,
    mode: null,
  }

  const { scanPct, analyzePct, compilePct } = getPipelinePercentages(metrics)
  assert.equal(scanPct, 20) // 200/1000
  assert.equal(analyzePct, 30) // 300/1000
  assert.equal(compilePct, 50) // 500/1000

  // Empty pipeline
  const emptyMetrics = {
    ...metrics,
    scanMs: null,
    analyzeMs: null,
    compileMs: null,
  }
  const empty = getPipelinePercentages(emptyMetrics)
  assert.equal(empty.scanPct, 0)
  assert.equal(empty.analyzePct, 0)
  assert.equal(empty.compilePct, 0)
})
