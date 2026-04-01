import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { afterEach, describe, test } from "node:test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const plugin = require(path.join(ROOT, "packages/plugin/dist/index.cjs"))

afterEach(() => {
  plugin.resetGlobalRegistry()
  delete globalThis.__TW_TOKEN_ENGINE__
})

describe("@tailwind-styled/plugin exports", () => {
  test("re-exports the plugin-api helpers", () => {
    assert.equal(typeof plugin.createPluginRegistry, "function")
    assert.equal(typeof plugin.createPluginContext, "function")
    assert.equal(typeof plugin.createTw, "function")
    assert.equal(typeof plugin.use, "function")
    assert.equal(typeof plugin.getGlobalRegistry, "function")
  })

  test("createTwPlugin returns a rollup-style plugin wrapper", () => {
    const twPlugin = plugin.createTwPlugin()
    assert.equal(typeof twPlugin.resolveId, "function")
    assert.equal(typeof twPlugin.load, "function")
    assert.equal(typeof twPlugin.transform, "function")
    assert.equal(typeof twPlugin.getToken, "function")
    assert.equal(typeof twPlugin.subscribeTokens, "function")
  })
})

describe("@tailwind-styled/plugin createTwPlugin()", () => {
  test("resolveId skips unrelated imports", async () => {
    const twPlugin = plugin.createTwPlugin()
    const result = await twPlugin.resolveId.call(
      {
        resolve() {
          throw new Error("resolve should not be called")
        },
      },
      "react",
      "/src/App.tsx"
    )

    assert.equal(result, null)
  })

  test("resolveId strips tw. and tw: prefixes before delegating", async () => {
    const resolvedIds = []
    const twPlugin = plugin.createTwPlugin()

    const result = await twPlugin.resolveId.call(
      {
        async resolve(source) {
          resolvedIds.push(source)
          return { id: `/virtual/${source}.js` }
        },
      },
      "tw.button",
      "/src/App.tsx"
    )

    assert.deepEqual(resolvedIds, ["button"])
    assert.deepEqual(result, { id: "/virtual/button.js" })
  })

  test("getToken and subscribeTokens use the live token engine bridge", () => {
    let subscriber
    globalThis.__TW_TOKEN_ENGINE__ = {
      getToken(name) {
        return name === "brand" ? "#112233" : undefined
      },
      subscribeTokens(callback) {
        subscriber = callback
        return () => {
          subscriber = undefined
        }
      },
    }

    const twPlugin = plugin.createTwPlugin()
    assert.equal(twPlugin.getToken("brand"), "#112233")

    let observed
    const unsubscribe = twPlugin.subscribeTokens((tokens) => {
      observed = tokens.brand
    })
    subscriber({ brand: "#445566" })
    unsubscribe()

    assert.equal(observed, "#445566")
  })

  test("invalid plugin options fail fast", () => {
    assert.throws(
      () => plugin.createTwPlugin({ debug: "yes" }),
      /plugin options are invalid/
    )
  })
})

describe("@tailwind-styled/plugin plugin-api passthrough", () => {
  test("global transform registry can be reset and reused", () => {
    plugin.registerToken("brand", "#abcdef")
    plugin.registerTransform((config) => config)
    plugin.resetGlobalRegistry()

    const registry = plugin.getGlobalRegistry()
    assert.deepEqual(registry, { transforms: [], tokens: {} })
  })
})
