import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const vite = await import(pathToFileURL(path.join(ROOT, "packages/vite/dist/plugin.js")))

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
  fs.mkdirSync(path.join(root, "stories"), { recursive: true })
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
  test("transforms matching source files via an injected transform runner", async () => {
    const plugin = vite.tailwindStyledPlugin({
      __internalTransformRunner({ source }) {
        return {
          changed: true,
          code: `/* @tw-transformed */\n${source}`,
          classes: ["bg-red-500", "px-4"],
        }
      },
    })

    const result = await plugin.transform(
      "const Button = tw.button`bg-red-500 px-4`",
      "/src/App.tsx"
    )

    assert.ok(result)
    assert.equal(typeof result.code, "string")
    assert.match(result.code, /@tw-transformed/)
  })

  test("warns and no-ops when the transform runner is unavailable", async () => {
    const warnings = []
    const originalWarn = console.warn
    console.warn = (...args) => warnings.push(args.map(String).join(" "))

    try {
      const plugin = vite.tailwindStyledPlugin({
        __internalTransformRunner() {
          throw new Error("native compiler bridge unavailable")
        },
      })

      const result = await plugin.transform(
        "const Button = tw.button`bg-red-500 px-4`",
        "/src/App.tsx"
      )

      assert.equal(result, null)
      assert.ok(
        warnings.some((message) => message.includes("Transform skipped for /src/App.tsx")),
        warnings.join(" | ")
      )
    } finally {
      console.warn = originalWarn
    }
  })

  test("skips excluded or unmatched files", async () => {
    const plugin = vite.tailwindStyledPlugin({ include: /\.custom$/ })

    assert.equal(await plugin.transform("const x = 1", "/src/App.tsx"), null)
    assert.equal(await plugin.transform("const x = 1", "/node_modules/pkg/index.custom"), null)
  })

  test("strips query strings before include/exclude checks", async () => {
    const plugin = vite.tailwindStyledPlugin({
      __internalTransformRunner({ source }) {
        return { changed: false, code: source, classes: [] }
      },
    })
    const result = await plugin.transform("const x = 1", "/src/App.tsx?import=static")
    assert.equal(result, null)
  })
})

describe("@tailwind-styled/vite buildEnd()", () => {
  test("uses the engine facade for safelist and report generation", async () => {
    const root = makeTempRoot()
    const calls = []

    const plugin = vite.tailwindStyledPlugin({
      useEngineBuild: false,
      scanDirs: ["src"],
      __internalCreateEngine: async (options) => {
        calls.push(options)
        return {
          async scanWorkspace() {
            return {
              files: [
                {
                  file: path.join(root, "src", "App.tsx"),
                  classes: ["bg-red-500", "px-4"],
                },
                {
                  file: path.join(root, "stories", "Button.stories.tsx"),
                  classes: ["text-blue-500"],
                },
              ],
              totalFiles: 2,
              uniqueClasses: ["bg-red-500", "px-4", "text-blue-500"],
            }
          },
          async build() {
            throw new Error("build should not run when useEngineBuild=false")
          },
        }
      },
    })

    plugin.configResolved({ root, command: "build" })
    await plugin.buildEnd()

    const safelist = JSON.parse(
      fs.readFileSync(path.join(root, ".tailwind-styled-safelist.json"), "utf8")
    )
    const report = JSON.parse(
      fs.readFileSync(path.join(root, ".tailwind-styled-scan-report.json"), "utf8")
    )

    assert.deepEqual(safelist, ["bg-red-500", "px-4"])
    assert.equal(report.totalFiles, 1)
    assert.equal(report.uniqueClassCount, 2)
    assert.deepEqual(calls[0]?.scanner?.includeExtensions, [".tsx", ".ts", ".jsx", ".js"])
  })

  test("warns when engine scan fails without crashing the build", async () => {
    const root = makeTempRoot()
    const warnings = []
    const originalWarn = console.warn
    console.warn = (...args) => warnings.push(args.map(String).join(" "))

    try {
      const plugin = vite.tailwindStyledPlugin({
        useEngineBuild: false,
        __internalCreateEngine: async () => ({
          async scanWorkspace() {
            throw new Error("scanner unavailable")
          },
          async build() {
            return undefined
          },
        }),
      })

      plugin.configResolved({ root, command: "build" })
      await plugin.buildEnd()

      assert.ok(
        warnings.some((message) => message.includes("Engine scan phase failed")),
        warnings.join(" | ")
      )
    } finally {
      console.warn = originalWarn
    }
  })

  test("build errors warn by default and throw in strict mode", async () => {
    const root = makeTempRoot()
    const warnings = []
    const originalWarn = console.warn
    console.warn = (...args) => warnings.push(args.map(String).join(" "))

    try {
      const warnPlugin = vite.tailwindStyledPlugin({
        __internalCreateEngine: async () => ({
          async scanWorkspace() {
            return { files: [], totalFiles: 0, uniqueClasses: [] }
          },
          async build() {
            throw new Error("engine build failed")
          },
        }),
      })

      warnPlugin.configResolved({ root, command: "build" })
      await warnPlugin.buildEnd()

      const strictPlugin = vite.tailwindStyledPlugin({
        strict: true,
        __internalCreateEngine: async () => ({
          async scanWorkspace() {
            return { files: [], totalFiles: 0, uniqueClasses: [] }
          },
          async build() {
            throw new Error("engine build failed")
          },
        }),
      })

      strictPlugin.configResolved({ root, command: "build" })
      await assert.rejects(() => strictPlugin.buildEnd(), /Engine build step failed/)
      assert.ok(
        warnings.some((message) => message.includes("Engine build step failed")),
        warnings.join(" | ")
      )
    } finally {
      console.warn = originalWarn
    }
  })

  test("does nothing in dev mode", async () => {
    const root = makeTempRoot()
    const plugin = vite.tailwindStyledPlugin({
      __internalCreateEngine: async () => {
        throw new Error("engine should not be created in dev mode")
      },
    })

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
