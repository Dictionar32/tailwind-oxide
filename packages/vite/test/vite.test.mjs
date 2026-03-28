import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { afterEach, describe, test } from "node:test"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const vite = require(path.join(ROOT, "packages/vite/dist/plugin.cjs"))

const tempDirs = []

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

function makeTempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tailwind-styled-vite-"))
  tempDirs.push(root)
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  return root
}

describe("@tailwind-styled/vite exports", () => {
  test("exports named and default plugin factories", () => {
    assert.equal(typeof vite.tailwindStyledPlugin, "function")
    assert.equal(typeof vite.default, "function")
  })
})

describe("@tailwind-styled/vite plugin structure", () => {
  test("plugin exposes standard Vite hooks", () => {
    const plugin = vite.tailwindStyledPlugin()
    assert.equal(plugin.name, "tailwind-styled-v4")
    assert.equal(plugin.enforce, "pre")
    assert.equal(typeof plugin.transform, "function")
    assert.equal(typeof plugin.buildEnd, "function")
    assert.equal(typeof plugin.handleHotUpdate, "function")
  })

  test("deprecated options warn once they are used", () => {
    const warnings = []
    const originalWarn = console.warn
    console.warn = (message) => warnings.push(String(message))

    try {
      vite.tailwindStyledPlugin({ mode: "zero-runtime", routeCss: true, incremental: true })
    } finally {
      console.warn = originalWarn
    }

    assert.ok(warnings.some((message) => message.includes("'mode' is deprecated in v5")))
    assert.ok(warnings.some((message) => message.includes("'routeCss' is deprecated in v5")))
    assert.ok(warnings.some((message) => message.includes("'incremental' is deprecated in v5")))
  })
})

describe("@tailwind-styled/vite transform()", () => {
  test("transforms matching source files", async () => {
    const plugin = vite.tailwindStyledPlugin()
    const result = await plugin.transform(
      "const Button = tw.button`bg-red-500 px-4`",
      "/src/App.tsx"
    )

    assert.ok(result)
    assert.equal(typeof result.code, "string")
    assert.match(result.code, /@tw-transformed/)
  })

  test("skips excluded or unmatched files", async () => {
    const plugin = vite.tailwindStyledPlugin({ include: /\.custom$/ })

    assert.equal(await plugin.transform("const x = 1", "/src/App.tsx"), null)
    assert.equal(await plugin.transform("const x = 1", "/node_modules/pkg/index.custom"), null)
  })

  test("strips query strings before include/exclude checks", async () => {
    const plugin = vite.tailwindStyledPlugin()
    const result = await plugin.transform("const x = 1", "/src/App.tsx?import=static")
    assert.equal(result, null)
  })
})

describe("@tailwind-styled/vite buildEnd()", () => {
  test("generates a safelist file in build mode", async () => {
    const root = makeTempRoot()
    fs.writeFileSync(path.join(root, "src", "App.tsx"), "const Button = tw.button`bg-red-500 px-4`")

    const plugin = vite.tailwindStyledPlugin({ useEngineBuild: false })
    plugin.configResolved({ root, command: "build" })
    await plugin.buildEnd()

    const safelistPath = path.join(root, ".tailwind-styled-safelist.json")
    assert.equal(fs.existsSync(safelistPath), true)

    const safelist = JSON.parse(fs.readFileSync(safelistPath, "utf8"))
    assert.ok(Array.isArray(safelist))
    assert.ok(safelist.includes("bg-red-500"))
  })

  test("handles scanner failures without crashing the build", async () => {
    const root = makeTempRoot()
    fs.writeFileSync(path.join(root, "src", "App.tsx"), "const Button = tw.button`bg-red-500`")
    const scanReportPath = path.join(root, "scan.json")

    const warnings = []
    const originalWarn = console.warn
    console.warn = (...args) => warnings.push(args.map(String).join(" "))

    try {
      const plugin = vite.tailwindStyledPlugin({ useEngineBuild: false, scanReportOutput: "scan.json" })
      plugin.configResolved({ root, command: "build" })
      await plugin.buildEnd()
    } finally {
      console.warn = originalWarn
    }

    assert.ok(
      fs.existsSync(scanReportPath) ||
        warnings.some((message) => message.includes("Scan report generation failed")),
      `warnings: ${warnings.join(" | ")}`
    )
  })

  test("does nothing in dev mode", async () => {
    const root = makeTempRoot()
    const plugin = vite.tailwindStyledPlugin({ useEngineBuild: false })
    plugin.configResolved({ root, command: "serve" })
    await plugin.buildEnd()

    assert.equal(fs.existsSync(path.join(root, ".tailwind-styled-safelist.json")), false)
    assert.equal(fs.existsSync(path.join(root, ".tailwind-styled-scan-report.json")), false)
  })
})

describe("@tailwind-styled/vite handleHotUpdate()", () => {
  test("triggers full reload for matching files only", () => {
    const sent = []
    const plugin = vite.tailwindStyledPlugin({ include: /\.tsx$/ })
    const server = { ws: { send(payload) { sent.push(payload) } } }

    plugin.handleHotUpdate({ file: "/src/App.tsx", server })
    plugin.handleHotUpdate({ file: "/src/styles.css", server })

    assert.deepEqual(sent, [{ type: "full-reload" }])
  })
})
