import assert from "node:assert/strict"
import { test } from "node:test"

import { DevToolsProvider, TwDevTools } from "../dist/index.js"

test("devtools package exports React component entry points", () => {
  assert.equal(typeof TwDevTools, "function")
  assert.equal(typeof DevToolsProvider, "function")
})
