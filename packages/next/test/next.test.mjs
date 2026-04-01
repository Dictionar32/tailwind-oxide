import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const next = await import(pathToFileURL(path.join(ROOT, "packages/next/dist/index.js")))

const isTailwindStyledRule = (rule) =>
  Array.isArray(rule?.use) &&
  rule.use.some(
    (entry) => typeof entry?.loader === "string" && /webpackLoader\.(cjs|js)$/.test(entry.loader)
  )

const countTailwindStyledRules = (rules = []) => rules.filter((rule) => isTailwindStyledRule(rule)).length

describe("@tailwind-styled/next exports", () => {
  test("exports withTailwindStyled", () => {
    assert.equal(typeof next.withTailwindStyled, "function")
  })
})

describe("@tailwind-styled/next withTailwindStyled()", () => {
  test("injects a single webpack rule and preserves loader options", async () => {
    const wrapped = next.withTailwindStyled({
      include: /\.view\.tsx$/,
      exclude: /vendor/,
      autoClientBoundary: false,
      addDataAttr: false,
      verbose: true,
    })({
      reactStrictMode: true,
    })

    assert.equal(wrapped.reactStrictMode, true)
    assert.equal(typeof wrapped.webpack, "function")

    const webpackConfig = await wrapped.webpack(
      { module: { rules: [{ test: /\.css$/ }] } },
      {}
    )

    assert.equal(countTailwindStyledRules(webpackConfig.module.rules), 1)
    assert.equal(webpackConfig.module.rules.length, 2)

    const injectedRule = webpackConfig.module.rules[0]
    const loaderEntry = injectedRule.use[0]

    assert.equal(String(injectedRule.test), String(/\.view\.tsx$/))
    assert.equal(String(injectedRule.exclude), String(/vendor/))
    assert.match(loaderEntry.loader, /webpackLoader\.(cjs|js)$/)
    assert.equal(fs.existsSync(loaderEntry.loader), true)
    assert.equal(loaderEntry.options.mode, "zero-runtime")
    assert.equal(loaderEntry.options.autoClientBoundary, false)
    assert.equal(loaderEntry.options.addDataAttr, false)
    assert.equal(loaderEntry.options.verbose, true)
    assert.equal(loaderEntry.options.preserveImports, true)
  })

  test("wraps an existing webpack function and remains idempotent", async () => {
    const wrapped = next.withTailwindStyled({})({
      webpack(config) {
        return {
          ...config,
          customFlag: "from-user",
        }
      },
    })

    const initialConfig = { module: { rules: [] } }
    const firstPass = await wrapped.webpack(initialConfig, {})
    const secondPass = await wrapped.webpack(firstPass, {})

    assert.equal(firstPass.customFlag, "from-user")
    assert.equal(countTailwindStyledRules(firstPass.module.rules), 1)
    assert.equal(countTailwindStyledRules(secondPass.module.rules), 1)
  })

  test("generates turbopack rules and preserves existing entries", () => {
    const wrapped = next.withTailwindStyled({
      include: /\.tsx$/,
      exclude: /vendor/,
      autoClientBoundary: false,
    })({
      turbopack: {
        rules: {
          "*.mdx": { loaders: [{ loader: "mdx-loader" }] },
        },
      },
    })

    assert.equal(typeof wrapped.turbopack, "object")
    assert.deepEqual(wrapped.turbopack.rules["*.mdx"], {
      loaders: [{ loader: "mdx-loader" }],
    })

    for (const key of ["*.js", "*.jsx", "*.ts", "*.tsx"]) {
      const rule = wrapped.turbopack.rules[key]
      assert.equal(Array.isArray(rule.loaders), true)
      assert.match(rule.loaders[0].loader, /turbopackLoader\.(cjs|js)$/)
      assert.equal(fs.existsSync(rule.loaders[0].loader), true)
      assert.equal(rule.loaders[0].options.mode, "zero-runtime")
      assert.equal(rule.loaders[0].options.autoClientBoundary, false)
      assert.equal(rule.loaders[0].options.preserveImports, true)
    }
  })
})

describe("@tailwind-styled/next loader artifacts", () => {
  test("ships both loader entrypoints in dist", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "packages/next/dist/webpackLoader.js")), true)
    assert.equal(fs.existsSync(path.join(ROOT, "packages/next/dist/turbopackLoader.js")), true)
  })
})
