/**
 * Test suite: @tailwind-styled/analyzer v5
 */
import { describe, test } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const analyzer = require(path.join(ROOT, "packages/analyzer/dist/index.cjs"))

describe("analyzeWorkspace", () => {
  test("exports analyzeWorkspace function", () => {
    assert.equal(typeof analyzer.analyzeWorkspace, "function")
  })

  test("validates analyzeWorkspace option boundaries", async () => {
    await assert.rejects(
      analyzer.analyzeWorkspace(path.join(ROOT, "non-existent-dir-xyz"), {
        classStats: { top: "3" },
      }),
      /options\.classStats\.top must be a number/
    )
    await assert.rejects(
      analyzer.analyzeWorkspace(path.join(ROOT, "non-existent-dir-xyz"), {
        includeClass: "yes",
      }),
      /options\.includeClass must be a function/
    )
  })

  test("non-existent dir does not crash", async () => {
    const report = await analyzer.analyzeWorkspace(path.join(ROOT, "non-existent-dir-xyz"), {
      classStats: { top: 3 },
    })
    assert.equal(report.totalFiles, 0)
    assert.equal(report.uniqueClassCount, 0)
  })

  test("non-existent dir still returns the expected report shape", async () => {
    const report = await analyzer.analyzeWorkspace(path.join(ROOT, "non-existent-dir-xyz"), {
      semantic: true,
      classStats: { top: 5, frequentThreshold: 2 },
    })

    assert.ok(typeof report === "object")
    assert.equal(typeof report.totalFiles, "number")
    assert.equal(typeof report.uniqueClassCount, "number")
    assert.ok(Array.isArray(report.classStats.all))
    assert.ok(Array.isArray(report.classStats.top))
    assert.ok(Array.isArray(report.classStats.frequent))
    assert.ok(Array.isArray(report.classStats.unique))
    assert.ok(typeof report.classStats.distribution === "object")
    assert.ok(report.classStats.top.length <= 5)
    assert.ok(report.semantic, "semantic report should exist")
    assert.ok(Array.isArray(report.semantic.unusedClasses))
    assert.ok(Array.isArray(report.semantic.unknownClasses))
    assert.ok(Array.isArray(report.semantic.conflicts))
  })
})

describe("classToCss", () => {
  test("resolves declarations for known classes", async () => {
    const result = await analyzer.classToCss("opacity-0 translate-y-2", { strict: true })
    assert.ok(result.declarations.includes("opacity: 0"))
    assert.ok(result.declarations.includes("transform: translateY(0.5rem)"))
    assert.ok(Array.isArray(result.resolvedClasses))
    assert.equal(result.unknownClasses.length, 0)
  })

  test("throws in strict mode when unknown classes are present", async () => {
    await assert.rejects(
      analyzer.classToCss("unknown-class-token", { strict: true }),
      /Unknown Tailwind classes/
    )
  })

  test("validates classToCss options and input shape", async () => {
    await assert.rejects(
      analyzer.classToCss("opacity-0", { strict: "yes" }),
      /options\.strict must be a boolean/
    )
    await assert.rejects(
      analyzer.classToCss("opacity-0", { prefix: 12 }),
      /options\.prefix must be a string or null/
    )
    await assert.rejects(
      analyzer.classToCss(["opacity-0", 42]),
      /input array must contain only strings/
    )
  })
})

describe("__internal helpers", () => {
  test("parse helpers validate runtime boundaries", () => {
    const options = analyzer.__internal.parseAnalyzerOptions({
      classStats: { top: 4, frequentThreshold: 2 },
      semantic: { tailwindConfigPath: "tailwind.config.ts" },
    })
    assert.equal(options.classStats.top, 4)
    assert.equal(options.semantic.tailwindConfigPath, "tailwind.config.ts")

    assert.throws(
      () => analyzer.__internal.parseNativeReport({ root: 42 }),
      /Native analyzer report is invalid/
    )
    assert.throws(
      () => analyzer.__internal.parseNativeCssCompileResult({ css: 12 }),
      /Native CSS compile result is invalid/
    )
  })

  test("normalizeClassInput trims string and array input", () => {
    assert.deepEqual(
      analyzer.__internal.normalizeClassInput(" opacity-0   translate-y-2 "),
      ["opacity-0", "translate-y-2"]
    )
    assert.deepEqual(
      analyzer.__internal.normalizeClassInput([" opacity-0 ", "", " translate-y-2"]),
      ["opacity-0", "translate-y-2"]
    )
  })

  test("splitVariantAndBase splits variants correctly", () => {
    assert.deepEqual(analyzer.__internal.splitVariantAndBase("hover:bg-red-500"), {
      variantKey: "hover",
      base: "bg-red-500",
    })
    assert.deepEqual(analyzer.__internal.splitVariantAndBase("md:hover:text-sm"), {
      variantKey: "md:hover",
      base: "text-sm",
    })
  })

  test("resolveConflictGroup handles standard and arbitrary utilities", () => {
    assert.equal(analyzer.__internal.resolveConflictGroup("bg-red-500"), "bg")
    assert.equal(analyzer.__internal.resolveConflictGroup("bg-[#f00]"), null)
    assert.equal(analyzer.__internal.resolveConflictGroup("inline-flex"), "display")
  })

  test("collectClassCounts aggregates occurrences", () => {
    const counts = analyzer.__internal.collectClassCounts({
      files: [
        { file: "a.tsx", classes: ["bg-red-500", "p-2"] },
        { file: "b.tsx", classes: ["bg-red-500", "mt-2"] },
      ],
      totalFiles: 2,
      uniqueClasses: ["bg-red-500", "p-2", "mt-2"],
    })
    assert.equal(counts.get("bg-red-500"), 2)
    assert.equal(counts.get("p-2"), 1)
    assert.equal(counts.get("mt-2"), 1)
  })

  test("buildDistribution bins counts correctly", () => {
    const distribution = analyzer.__internal.buildDistribution([
      { name: "a", count: 1 },
      { name: "b", count: 2 },
      { name: "c", count: 3 },
      { name: "d", count: 4 },
      { name: "e", count: 7 },
      { name: "f", count: 8 },
    ])
    assert.deepEqual(distribution, {
      "1": 1,
      "2-3": 2,
      "4-7": 2,
      "8+": 1,
    })
  })

  test("utilityPrefix normalizes utility families", () => {
    assert.equal(analyzer.__internal.utilityPrefix("min-w-4"), "min-w")
    assert.equal(analyzer.__internal.utilityPrefix("bg-[#f00]"), "arbitrary")
    assert.equal(analyzer.__internal.utilityPrefix("rounded-lg"), "rounded")
    assert.equal(analyzer.__internal.utilityPrefix("-translate-x-2"), "translate")
  })
})
