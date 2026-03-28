import test from "node:test"
import assert from "node:assert/strict"

const mod = await import("../dist/index.js")

test("parseTailwindClasses handles variants and opacity", () => {
  const parsed = mod.parseTailwindClasses("dark:hover:bg-blue-500/50")
  assert.equal(parsed.length, 1)
  assert.deepEqual(parsed[0].variants, ["dark", "hover"])
  assert.equal(parsed[0].base, "bg-blue-500")
  assert.equal(parsed[0].modifier?.type, "opacity")
  assert.equal(parsed[0].modifier?.value, "50")
})

test("parseTailwindClasses handles arbitrary token", () => {
  const parsed = mod.parseTailwindClasses("bg-(--brand)")
  assert.equal(parsed[0].modifier?.type, "arbitrary")
  assert.equal(parsed[0].modifier?.value, "--brand")
})

test("extractThemeFromCSS resolves nested token", () => {
  const theme = mod.extractThemeFromCSS(
    "@theme{--color-primary:#3b82f6;--color-brand:var(--color-primary);--spacing-4:1rem;}"
  )
  assert.equal(theme.colors.primary, "#3b82f6")
  assert.equal(theme.colors.brand, "#3b82f6")
  assert.equal(theme.spacing["4"], "1rem")
})

test("twMerge resolves conflict", () => {
  const merged = mod.twMerge("px-4 py-2", "px-6")
  assert.equal(merged, "py-2 px-6")
})

test("styled resolver applies variants and className override", () => {
  const button = mod.styled({
    base: "px-4 py-2 rounded",
    variants: {
      variant: {
        primary: "bg-blue-500 text-white",
        secondary: "bg-gray-100 text-gray-900",
      },
      size: {
        sm: "text-sm",
        lg: "text-lg px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "sm",
    },
  })

  const cls = button({ size: "lg", className: "px-8" })
  assert.match(cls, /bg-blue-500/)
  assert.match(cls, /text-lg/)
  assert.doesNotMatch(cls, /px-6/)
  assert.match(cls, /px-8/)
})
