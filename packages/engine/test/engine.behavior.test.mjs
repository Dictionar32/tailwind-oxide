import { test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../../..")
process.chdir(ROOT)

const { createEngine } = await import(pathToFileURL(path.resolve(__dirname, "../dist/index.js")))

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "tw-engine-test-"))
}

function writeSource(root, content, file = "index.tsx") {
  fs.writeFileSync(path.join(root, file), content)
}

test("tailwindConfigPath invalid path throws during build", async () => {
  const root = createTempProject()
  writeSource(root, `export const x = <div className=\"text-red-500\" />`)

  const engine = await createEngine({
    root,
    tailwindConfigPath: "./missing-tailwind-config.js",
  })

  await assert.rejects(
    () => engine.build(),
    (error) => {
      assert.match(error.message, /tailwindConfigPath not found/)
      return true
    }
  )
})

test("plugin transformClasses can return empty array and override class list", async () => {
  const root = createTempProject()
  writeSource(root, `export const x = <div className=\"text-red-500 bg-blue-500\" />`)

  const engine = await createEngine({
    root,
    plugins: [
      {
        name: "clear-classes",
        transformClasses() {
          return []
        },
      },
    ],
  })

  const result = await engine.build()
  assert.equal(result.mergedClassList, "")
  assert.equal(result.css, "")
})

test("analyze mode returns analyzer-backed diagnostics without requiring CSS compilation", async () => {
  const root = createTempProject()
  writeSource(root, `export const x = <div className=\"text-red-500 bg-blue-500\" />`)

  const engine = await createEngine({
    root,
    analyze: true,
    compileCss: false,
  })

  const result = await engine.build()
  assert.ok(result.analysis, "analysis should be present")
  assert.ok(result.analysis.report, "full analyzer report should be present")
  assert.ok(Array.isArray(result.analysis.unusedClasses))
  assert.ok(Array.isArray(result.analysis.classConflicts))
  assert.ok(typeof result.analysis.classUsage["text-red-500"] === "number")
})

test("plugin onError is called when build lifecycle throws", async () => {
  const root = createTempProject()
  writeSource(root, `export const x = <div className=\"text-red-500\" />`)

  const seen = []
  const engine = await createEngine({
    root,
    plugins: [
      {
        name: "throw-before-build",
        beforeBuild() {
          throw new Error("beforeBuild failed")
        },
        onError(error) {
          seen.push(error.message)
        },
      },
    ],
  })

  await assert.rejects(() => engine.build(), /beforeBuild failed/)
  assert.deepEqual(seen, ["beforeBuild failed"])
})

test("build writes dashboard metrics snapshot to .tw-cache/metrics.json", async () => {
  const root = createTempProject()
  writeSource(root, `export const x = <div className=\"text-red-500\" />`)

  const engine = await createEngine({ root })
  const result = await engine.build()
  const metricsPath = path.join(root, ".tw-cache", "metrics.json")

  assert.ok(result.css.length >= 0)
  assert.equal(fs.existsSync(metricsPath), true)

  const metrics = JSON.parse(fs.readFileSync(metricsPath, "utf8"))
  assert.equal(metrics.mode, "build")
  assert.equal(typeof metrics.buildMs, "number")
  assert.equal(typeof metrics.scanMs, "number")
  assert.equal(metrics.fileCount >= 1, true)
  assert.equal(metrics.classCount >= 1, true)
})


test("watch emits error event when plugin fails during incremental build", async () => {
  const root = createTempProject()
  const filePath = path.join(root, "index.tsx")
  writeSource(root, `export const x = <div className=\"text-red-500\" />`)

  let shouldFail = false
  const events = []

  const engine = await createEngine({
    root,
    plugins: [
      {
        name: "flaky-transform",
        transformClasses(classes) {
          if (shouldFail) throw new Error("transform failed in watch")
          return classes
        },
      },
    ],
  })

  const watcher = await engine.watch((event) => {
    events.push(event)
  }, { debounceMs: 20 })

  await new Promise((resolve) => setTimeout(resolve, 120))

  shouldFail = true
  fs.writeFileSync(filePath, `export const x = <div className=\"text-blue-500\" />`)

  const deadline = Date.now() + 3000
  while (Date.now() < deadline) {
    if (events.some((event) => event.type === "error" && /transform failed in watch/.test(event.error))) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 30))
  }

  watcher.close()

  assert.ok(events.some((event) => event.type === "initial"))
  assert.ok(events.some((event) => event.type === "error" && /transform failed in watch/.test(event.error)))
})
