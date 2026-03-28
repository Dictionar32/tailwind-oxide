/**
 * Test suite: @tailwind-styled/animate v5
 */
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import path from "node:path"
import { describe, test } from "node:test"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const animate = require(path.join(ROOT, "packages/animate/dist/index.cjs"))

describe("animate v5 async api", () => {
  test("exports async-first functions", () => {
    assert.equal(typeof animate.initAnimate, "function")
    assert.equal(typeof animate.animate, "function")
    assert.equal(typeof animate.keyframes, "function")
    assert.equal(typeof animate.createAnimationRegistry, "function")
    assert.equal(typeof animate.extractAnimationCss, "function")
    assert.equal(typeof animate.resetAnimationRegistry, "function")
  })

  test("compileAnimation returns compiled object", async () => {
    animate.resetAnimationRegistry()
    const compiled = await animate.compileAnimation({
      from: "opacity-0",
      to: "opacity-100",
      duration: 220,
      name: "fade-test",
    })

    assert.equal(typeof compiled.className, "string")
    assert.ok(compiled.keyframesCss.includes("@keyframes"))
    assert.ok(compiled.animationCss.includes("animation"))
  })

  test("animate returns className string", async () => {
    animate.resetAnimationRegistry()
    const className = await animate.animate({
      from: "opacity-0 translate-y-2",
      to: "opacity-100 translate-y-0",
      duration: 300,
    })
    assert.equal(typeof className, "string")
    assert.ok(className.length > 0)
  })

  test("keyframes compiles multi-stop keyframes", async () => {
    animate.resetAnimationRegistry()
    const className = await animate.keyframes("bounce", {
      "0%": "translate-y-0",
      "50%": "translate-y-4",
      "100%": "translate-y-0",
    })

    assert.equal(typeof className, "string")
    const css = animate.extractAnimationCss()
    assert.ok(css.includes("@keyframes"))
    assert.ok(css.includes(className))
  })

  test("instance registry is isolated and resettable", async () => {
    const registry = animate.createAnimationRegistry()
    const className = await animate.animate(
      {
        from: "opacity-0",
        to: "opacity-100",
      },
      registry
    )

    assert.equal(typeof className, "string")
    const css = animate.extractAnimationCss(registry)
    assert.ok(css.includes(className))

    animate.resetAnimationRegistry(registry)
    assert.equal(animate.extractAnimationCss(registry), "")
  })

  test("preset animations return class names", async () => {
    animate.resetAnimationRegistry()
    const className = await animate.animations.fadeIn()
    assert.equal(typeof className, "string")
    assert.ok(className.length > 0)
  })

  test("registry reuses cached animation signatures", async () => {
    animate.resetAnimationRegistry()
    const first = await animate.compileAnimation({
      from: "opacity-0",
      to: "opacity-100",
      duration: 200,
    })
    const cssAfterFirst = animate.extractAnimationCss()
    const second = await animate.compileAnimation({
      from: "opacity-0",
      to: "opacity-100",
      duration: 200,
    })

    assert.equal(first.className, second.className)
    const cssAfterSecond = animate.extractAnimationCss()
    assert.equal(cssAfterSecond, cssAfterFirst)
  })

  test("registry respects LRU cacheLimit", async () => {
    const registry = animate.createAnimationRegistry({ cacheLimit: 1 })
    const first = await animate.compileAnimation(
      {
        from: "opacity-0",
        to: "opacity-100",
        duration: 200,
      },
      registry
    )
    const second = await animate.compileAnimation(
      {
        from: "opacity-0 translate-y-4",
        to: "opacity-100 translate-y-0",
        duration: 200,
      },
      registry
    )

    assert.equal(registry.has(first.className), false)
    assert.equal(registry.has(second.className), true)

    const css = animate.extractAnimationCss(registry)
    assert.ok(!css.includes(`.${first.className} {`))
    assert.ok(css.includes(`.${second.className} {`))
  })

  test("preset cache survives repeated calls and rehydrates after reset", async () => {
    animate.resetAnimationRegistry()
    const first = await animate.animations.fadeIn()
    const second = await animate.animations.fadeIn()
    assert.equal(first, second)

    animate.resetAnimationRegistry()
    const third = await animate.animations.fadeIn()
    assert.equal(third, first)
    const css = animate.extractAnimationCss()
    assert.ok(css.includes(`.${third}`))
  })

  test("injectAnimationCss can be silent in non-browser runtime", () => {
    assert.doesNotThrow(() => animate.injectAnimationCss(undefined, { silent: true }))
  })

  test("compileAnimation surfaces unknown classes with context", async () => {
    await assert.rejects(
      animate.compileAnimation({
        from: "unknown-class-token",
        to: "opacity-100",
        name: "invalid-fade",
      }),
      /unknown Tailwind classes/i
    )
  })

  test("compileKeyframes surfaces invalid stop classes", async () => {
    await assert.rejects(
      animate.compileKeyframes("invalid-kf", {
        "0%": "opacity-0",
        "100%": "unknown-class-token",
      }),
      /100%.*unknown Tailwind classes/i
    )
  })

  test("invalid classes are surfaced by analyzer classToCss strict mode", async () => {
    await assert.rejects(
      require(path.join(ROOT, "packages/analyzer/dist/index.cjs")).classToCss("unknown-class-token", {
        strict: true,
      }),
      /Unknown Tailwind classes/
    )
  })
})
