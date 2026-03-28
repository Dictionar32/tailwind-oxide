import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const scanner = require(path.join(ROOT, "packages/scanner/dist/index.cjs"))

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tw-scanner-test-"))
}

describe("@tailwind-styled/scanner boundaries", () => {
  test("exports scan helpers and validators", () => {
    assert.equal(typeof scanner.scanWorkspace, "function")
    assert.equal(typeof scanner.scanWorkspaceAsync, "function")
    assert.equal(typeof scanner.parseScanWorkspaceOptions, "function")
    assert.equal(typeof scanner.parseScanWorkspaceResult, "function")
    assert.equal(typeof scanner.parseScannerWorkerMessage, "function")
  })

  test("validates scanner option boundaries", () => {
    assert.throws(
      () => scanner.parseScanWorkspaceOptions({ includeExtensions: ".tsx" }),
      /scanner options are invalid/
    )
    assert.throws(
      () => scanner.parseScanWorkspaceOptions({ useCache: "yes" }),
      /scanner options are invalid/
    )
  })

  test("validates scan result boundaries", () => {
    assert.throws(
      () =>
        scanner.parseScanWorkspaceResult({
          files: [],
          totalFiles: 1,
          uniqueClasses: [],
        }),
      /totalFiles must match files\.length/
    )
    assert.throws(
      () => scanner.parseScannerWorkerMessage({ ok: true, result: { files: "bad" } }),
      /scanner worker message is invalid/
    )
  })

  test("scanWorkspace keeps a valid empty result shape", () => {
    const root = createTempDir()
    try {
      const result = scanner.scanWorkspace(root, { useCache: false })
      assert.equal(result.totalFiles, 0)
      assert.deepEqual(result.files, [])
      assert.deepEqual(result.uniqueClasses, [])
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  test("scanWorkspaceAsync validates options before work starts", async () => {
    const root = createTempDir()
    try {
      await assert.rejects(
        scanner.scanWorkspaceAsync(root, { ignoreDirectories: "node_modules" }),
        /scanner options are invalid/
      )
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
