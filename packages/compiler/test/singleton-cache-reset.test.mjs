/**
 * Compiler singleton/cache reset behavior tests.
 *
 * Run: node --test packages/compiler/test/singleton-cache-reset.test.mjs
 */
import { afterEach, beforeEach, describe, test } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const loadBuiltModule = (relativePath, label) => {
  try {
    return require(path.resolve(__dirname, relativePath))
  } catch {
    console.warn(`[singleton-cache-reset test] ${label} dist not found - run \`cd packages/compiler && npm run build\` first`)
    process.exit(0)
  }
}

const publicApi = loadBuiltModule("../dist/index.cjs", "compiler public")
const internalApi = loadBuiltModule("../dist/internal.cjs", "compiler internal")

const {
  getIncrementalEngine,
  resetIncrementalEngine,
  getBucketEngine,
  resetBucketEngine,
  loadTailwindConfig,
  invalidateConfigCache,
  getNativeBridge,
  resetNativeBridgeCache,
  getCollector,
  getAllRoutes,
  getRouteClasses,
  registerFileClasses,
  registerGlobalClasses,
  resetCollector,
} = publicApi

const { getStyleRegistry, resetStyleRegistry } = internalApi

const clearRequiredModule = (filePath) => {
  try {
    delete require.cache[require.resolve(filePath)]
  } catch {
    // Ignore modules that were not loaded yet.
  }
}

const captureConsoleLog = (action) => {
  const messages = []
  const originalLog = console.log
  console.log = (...args) => {
    messages.push(args.join(" "))
  }

  try {
    return { result: action(), messages }
  } finally {
    console.log = originalLog
  }
}

const saveEnv = (...keys) =>
  Object.fromEntries(keys.map((key) => [key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined]))

const restoreEnv = (snapshot) => {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

beforeEach(() => {
  invalidateConfigCache()
  resetNativeBridgeCache()
  resetCollector()
  resetIncrementalEngine()
  resetBucketEngine()
  resetStyleRegistry()
})

afterEach(() => {
  invalidateConfigCache()
  resetNativeBridgeCache()
  resetCollector()
  resetIncrementalEngine()
  resetBucketEngine()
  resetStyleRegistry()
})

describe("loadTailwindConfig", () => {
  test("reuses cached config for the same cwd and reloads after invalidation", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tws-config-"))
    const configPath = path.join(tempDir, "tailwind.config.cjs")

    try {
      fs.writeFileSync(
        configPath,
        "module.exports = { theme: { extend: { colors: { brand: 'red' } } } }\n",
        "utf8"
      )

      clearRequiredModule(configPath)
      const firstLoad = captureConsoleLog(() => loadTailwindConfig(tempDir))
      const secondLoad = captureConsoleLog(() => loadTailwindConfig(tempDir))

      assert.equal(firstLoad.result.theme.extend.colors.brand, "red")
      assert.equal(firstLoad.messages.length, 1)
      assert.equal(secondLoad.result, firstLoad.result)
      assert.equal(secondLoad.messages.length, 0)

      fs.writeFileSync(
        configPath,
        "module.exports = { theme: { extend: { colors: { brand: 'blue' } } } }\n",
        "utf8"
      )

      const stillCached = captureConsoleLog(() => loadTailwindConfig(tempDir))
      assert.equal(stillCached.result.theme.extend.colors.brand, "red")
      assert.equal(stillCached.messages.length, 0)

      invalidateConfigCache()
      clearRequiredModule(configPath)

      const reloaded = captureConsoleLog(() => loadTailwindConfig(tempDir))
      assert.equal(reloaded.result.theme.extend.colors.brand, "blue")
      assert.notEqual(reloaded.result, firstLoad.result)
      assert.equal(reloaded.messages.length, 1)
    } finally {
      clearRequiredModule(configPath)
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

describe("getNativeBridge", () => {
  test("reflects environment changes after cache reset", () => {
    const originalEnv = saveEnv("TWS_NO_NATIVE", "TWS_NO_RUST")

    try {
      process.env.TWS_NO_NATIVE = "1"
      assert.throws(
        () => getNativeBridge(),
        /environment variable is set/
      )

      delete process.env.TWS_NO_NATIVE
      assert.throws(
        () => getNativeBridge(),
        /Native binding is required but not available/
      )

      resetNativeBridgeCache()
      process.env.TWS_NO_RUST = "1"
      assert.throws(
        () => getNativeBridge(),
        /environment variable is set/
      )
    } finally {
      restoreEnv(originalEnv)
      resetNativeBridgeCache()
    }
  })
})

describe("route collector", () => {
  test("resets state and supports fresh registrations afterwards", () => {
    registerGlobalClasses(["font-sans"])
    registerFileClasses("/project/app/dashboard/page.tsx", ["text-red-500"])

    assert.deepEqual(getAllRoutes(), ["/dashboard"])
    assert.deepEqual([...getRouteClasses("/dashboard")].sort(), ["font-sans", "text-red-500"])
    assert.equal(getCollector().files.size, 1)

    resetCollector()

    assert.deepEqual(getAllRoutes(), [])
    assert.equal(getCollector().files.size, 0)
    assert.deepEqual([...getRouteClasses("/dashboard")], [])

    registerFileClasses("/project/pages/blog/index.tsx", ["text-blue-500"])

    assert.deepEqual(getAllRoutes(), ["/blog"])
    assert.deepEqual([...getRouteClasses("/blog")], ["text-blue-500"])
  })
})

describe("singletons", () => {
  test("incremental engine returns the same instance until reset", () => {
    const first = getIncrementalEngine({ outputPath: path.join(os.tmpdir(), "atomic-a.css") })
    const second = getIncrementalEngine({ outputPath: path.join(os.tmpdir(), "atomic-b.css") })

    assert.equal(first, second)

    resetIncrementalEngine()

    const third = getIncrementalEngine({ outputPath: path.join(os.tmpdir(), "atomic-c.css") })
    assert.notEqual(third, first)
  })

  test("style registry reset provides a fresh registry", () => {
    const first = getStyleRegistry()
    first.register("flex", "display: flex")

    assert.equal(first.stats().totalEntries, 1)
    assert.equal(getStyleRegistry(), first)

    resetStyleRegistry()

    const second = getStyleRegistry()
    assert.notEqual(second, first)
    assert.equal(second.stats().totalEntries, 0)
    assert.equal(second.getAtomicClass("flex"), undefined)
  })

  test("bucket engine reset provides a fresh engine", () => {
    const first = getBucketEngine()
    first.add({
      twClass: "flex",
      atomicClass: "tw-0001",
      declaration: "display:flex",
    })

    assert.equal(first.stats().totalNodes, 1)
    assert.equal(getBucketEngine(), first)

    resetBucketEngine()

    const second = getBucketEngine()
    assert.notEqual(second, first)
    assert.equal(second.stats().totalNodes, 0)
  })
})
