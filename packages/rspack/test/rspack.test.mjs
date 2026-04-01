import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, test } from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const rspack = await import(pathToFileURL(path.join(ROOT, "packages/rspack/dist/index.js")))

const countMarkedRules = (rules = []) =>
  rules.filter((rule) => rule && rule._tailwindStyledRspackMarker === true).length

describe("@tailwind-styled/rspack exports", () => {
  test("exports the plugin factory and class", () => {
    const fn = rspack.tailwindStyledRspackPlugin ?? rspack.default
    assert.equal(typeof fn, "function")
    assert.equal(typeof rspack.TailwindStyledRspackPlugin, "function")
  })
})

describe("@tailwind-styled/rspack plugin", () => {
  test("injects a single loader rule and preserves options", () => {
    const fn = rspack.tailwindStyledRspackPlugin ?? rspack.default
    const plugin = fn({
      include: /\.view\.tsx$/,
      exclude: /vendor/,
      addDataAttr: false,
    })
    const compiler = {
      options: {
        mode: "production",
        module: {
          rules: [{ test: /\.css$/ }],
        },
      },
    }

    plugin.apply(compiler)

    assert.equal(countMarkedRules(compiler.options.module.rules), 1)
    assert.equal(compiler.options.module.rules.length, 2)

    const injectedRule = compiler.options.module.rules[0]
    const loaderEntry = injectedRule.use[0]

    assert.equal(String(injectedRule.test), String(/\.view\.tsx$/))
    assert.equal(String(injectedRule.exclude), String(/vendor/))
    assert.match(loaderEntry.loader, /loader\.(cjs|js)$/)
    assert.equal(fs.existsSync(loaderEntry.loader), true)
    assert.equal(loaderEntry.options.mode, "zero-runtime")
    assert.equal(loaderEntry.options.addDataAttr, false)
    assert.equal(loaderEntry.options.preserveImports, true)
  })

  test("apply is idempotent", () => {
    const plugin = new rspack.TailwindStyledRspackPlugin()
    const compiler = {
      options: {
        mode: "development",
        module: {
          rules: [],
        },
      },
    }

    plugin.apply(compiler)
    plugin.apply(compiler)

    assert.equal(countMarkedRules(compiler.options.module.rules), 1)
  })

  test("invalid options fail fast", () => {
    assert.throws(
      () => new rspack.TailwindStyledRspackPlugin({ addDataAttr: "yes" }),
      /rspack plugin options are invalid/
    )
  })
})

describe("@tailwind-styled/rspack dist structure", () => {
  test("ships both plugin and loader artifacts", () => {
    assert.equal(fs.existsSync(path.join(ROOT, "packages/rspack/dist/index.js")), true)
    assert.equal(fs.existsSync(path.join(ROOT, "packages/rspack/dist/loader.js")), true)
    assert.equal(fs.existsSync(path.join(ROOT, "packages/rspack/dist/index.d.ts")), true)
  })

  test("keeps native binaries out of the published adapter dist", () => {
    const distDir = path.join(ROOT, "packages/rspack/dist")
    const distFiles = fs.readdirSync(distDir)

    assert.equal(distFiles.some((file) => file.endsWith(".node")), false)

    for (const file of distFiles.filter((name) => /\.(?:cjs|js|d\.ts)$/.test(name))) {
      const content = fs.readFileSync(path.join(distDir, file), "utf8")
      assert.equal(/\.node\b/.test(content), false, `${file} should not reference .node files`)
      assert.equal(
        /@tailwindcss\/oxide|tailwindcss-oxide|oxide-/.test(content),
        false,
        `${file} should not reference Tailwind native binaries`
      )
    }
  })
})

describe("@tailwind-styled/rspack loader export", () => {
  test("loader can be imported from the subpath artifact", async () => {
    const loader = await import(pathToFileURL(path.join(ROOT, "packages/rspack/dist/loader.js")))
    assert.equal(typeof loader.default, "function")
  })
})
