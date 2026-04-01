import assert from "node:assert/strict"
import { test } from "node:test"

import {
  DevToolsProvider,
  TwDevTools,
  // Trace utilities
  formatDuration,
  formatMemory,
  getHealthColor,
  getModeColor,
} from "../dist/index.js"

test("devtools package exports React component entry points", () => {
  assert.equal(typeof TwDevTools, "function")
  assert.equal(typeof DevToolsProvider, "function")
})

test("devtools package exports shared trace utilities", () => {
  assert.equal(typeof formatDuration, "function")
  assert.equal(typeof formatMemory, "function")
  assert.equal(typeof getHealthColor, "function")
  assert.equal(typeof getModeColor, "function")
})

test("trace utilities format values correctly", () => {
  assert.equal(formatDuration(100), "100ms")
  assert.equal(formatDuration(1000), "1.0s")
  assert.equal(formatDuration(null), "—")

  assert.equal(formatMemory(512), "512B")
  assert.equal(formatMemory(2048), "2.0KB")
  assert.equal(formatMemory(2097152), "2.0MB")
})

test("trace utilities return correct colors", () => {
  assert.equal(getModeColor("build"), "#fbbf24")
  assert.equal(getModeColor("watch"), "#34d399")
  assert.equal(getHealthColor("healthy"), "#34d399")
  assert.equal(getHealthColor("unhealthy"), "#f87171")
})
