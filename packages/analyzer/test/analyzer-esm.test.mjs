import assert from "node:assert/strict"
import path from "node:path"
import { describe, test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const analyzerUrl = pathToFileURL(path.join(ROOT, "packages/analyzer/dist/index.js")).href

describe("@tailwind-styled/analyzer ESM smoke", () => {
  test("esm entry exports analyzer helpers", async () => {
    const analyzer = await import(analyzerUrl)

    assert.equal(typeof analyzer.analyzeWorkspace, "function")
    assert.equal(typeof analyzer.classToCss, "function")

    const report = await analyzer.analyzeWorkspace(path.join(ROOT, "definitely-missing-dir"), {
      classStats: { top: 3, frequentThreshold: 2 },
    })
    assert.equal(report.totalFiles, 0)
    assert.ok(Array.isArray(report.classStats.top))

    const css = await analyzer.classToCss("opacity-0", { strict: true })
    assert.ok(css.declarations.includes("opacity: 0"))
  })
})
