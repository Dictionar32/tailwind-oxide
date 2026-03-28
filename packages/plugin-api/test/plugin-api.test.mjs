import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { afterEach, describe, test } from "node:test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const pluginApi = require(path.join(ROOT, "packages/plugin-api/dist/index.cjs"))

afterEach(() => {
  pluginApi.resetGlobalRegistry()
  delete globalThis.__TW_TOKEN_ENGINE__
})

describe("@tailwind-styled/plugin-api global registry", () => {
  test("registerTransform and registerToken update the shared registry", () => {
    pluginApi.registerTransform((config) => config)
    pluginApi.registerToken("brand", "#112233")

    const registry = pluginApi.getGlobalRegistry()
    assert.equal(registry.transforms.length, 1)
    assert.equal(registry.tokens.brand, "#112233")
  })

  test("resetGlobalRegistry clears plugin registry state", () => {
    const registry = pluginApi.createPluginRegistry()
    registry.plugins.add("demo")
    pluginApi.resetGlobalRegistry()
    assert.deepEqual(pluginApi.getGlobalRegistry(), { transforms: [], tokens: {} })
  })
})

describe("@tailwind-styled/plugin-api token engine helpers", () => {
  test("resolveTokenEngine reads the global bridge", () => {
    globalThis.__TW_TOKEN_ENGINE__ = {
      getToken(name) {
        return name === "brand" ? "#112233" : undefined
      },
    }

    const engine = pluginApi.resolveTokenEngine()
    assert.equal(pluginApi.readToken(engine, "brand"), "#112233")
  })

  test("readToken falls back to getTokens()", () => {
    const engine = {
      getTokens() {
        return { accent: "#445566" }
      },
    }

    assert.equal(pluginApi.readToken(engine, "accent"), "#445566")
  })
})

describe("@tailwind-styled/plugin-api context builders", () => {
  test("createPluginContext records variants, utilities, tokens, transforms, and hooks", () => {
    const registry = pluginApi.createPluginRegistry()
    const ctx = pluginApi.createPluginContext(registry, { debug: true })

    ctx.addVariant("hover", (selector) => `${selector}:hover`)
    ctx.addUtility("stack", { display: "grid" })
    ctx.addToken("Brand Color", "#778899")
    ctx.addTransform((config) => config)
    ctx.onGenerateCSS((css) => css)
    ctx.onBuildEnd(() => {})

    assert.equal(registry.variants.has("hover"), true)
    assert.equal(registry.utilities.has("stack"), true)
    assert.equal(registry.tokens.get("brand-color"), "#778899")
    assert.equal(registry.transforms.length, 1)
    assert.equal(registry.cssHooks.length, 1)
    assert.equal(registry.buildHooks.length, 1)
    assert.equal(ctx.config.debug, true)
  })

  test("use() keeps legacy plugin transforms and tokens visible to the compiler registry", () => {
    pluginApi.use({
      name: "legacy-bridge",
      setup(ctx) {
        ctx.addToken("Brand Color", "#778899")
        ctx.addTransform((config) => ({
          ...config,
          base: `${config.base} tracking-wide`.trim(),
        }))
      },
    })

    const registry = pluginApi.getGlobalRegistry()
    assert.equal(registry.tokens["brand-color"], "#778899")
    assert.equal(registry.transforms.length, 1)

    const transformed = registry.transforms[0](
      {
        base: "inline-flex",
        variants: {},
        compoundVariants: [],
        defaultVariants: {},
      },
      { componentName: "Button", tag: "button" }
    )

    assert.equal(transformed.base, "inline-flex tracking-wide")
  })

  test("subscribeTokens uses subscribeTokens or subscribe from the live engine", () => {
    let calls = 0
    globalThis.__TW_TOKEN_ENGINE__ = {
      subscribe(callback) {
        callback({ accent: "#aabbcc" })
        calls += 1
        return () => {
          calls += 1
        }
      },
    }

    const registry = pluginApi.createPluginRegistry()
    const ctx = pluginApi.createPluginContext(registry)
    const unsubscribe = ctx.subscribeTokens(() => {})
    unsubscribe()

    assert.equal(calls, 2)
  })

  test("createTw returns an isolated registry with use()", () => {
    const tw = pluginApi.createTw()

    tw.use({
      name: "demo-plugin",
      setup(ctx) {
        ctx.addUtility("pill", { "border-radius": "9999px" })
      },
    })

    assert.equal(tw.registry.plugins.has("demo-plugin"), true)
    assert.equal(tw.registry.utilities.has("pill"), true)
  })
})
