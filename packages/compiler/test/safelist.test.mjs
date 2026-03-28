import { afterEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

let mod
try {
  mod = require(path.resolve(__dirname, "../dist/index.js"))
} catch {
  console.warn("[safelist test] compiler dist not found — run `npm run build -w packages/compiler` first")
  process.exit(0)
}

const { loadSafelist } = mod

const tempRoot = path.resolve(__dirname, "../.tmp-tests")
const tempDirs = []

const writeSafelistFile = (name, content) => {
  fs.mkdirSync(tempRoot, { recursive: true })
  const dir = fs.mkdtempSync(path.join(tempRoot, "safelist-"))
  tempDirs.push(dir)
  const file = path.join(dir, name)
  fs.writeFileSync(file, content)
  return file
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe("loadSafelist", () => {
  test("loads a valid string array", () => {
    const file = writeSafelistFile("valid.json", JSON.stringify(["bg-blue-500", "text-white"]))
    assert.deepEqual(loadSafelist(file), ["bg-blue-500", "text-white"])
  })

  test("returns empty array for malformed json", () => {
    const file = writeSafelistFile("broken.json", "{not-valid")
    assert.deepEqual(loadSafelist(file), [])
  })

  test("returns empty array for schema-invalid payload", () => {
    const file = writeSafelistFile("invalid.json", JSON.stringify(["bg-blue-500", 42]))
    assert.deepEqual(loadSafelist(file), [])
  })
})
