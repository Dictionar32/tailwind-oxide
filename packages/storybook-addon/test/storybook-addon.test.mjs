import assert from "node:assert/strict"
import { test } from "node:test"

import {
  createVariantStoryArgs,
  enumerateVariantProps,
  generateArgTypes,
  getVariantClass,
  withTailwindStyled,
} from "../dist/index.js"

test("enumerateVariantProps expands every combination", () => {
  const combinations = enumerateVariantProps({
    intent: ["primary", "danger"],
    size: ["sm", "lg"],
  })

  assert.equal(combinations.length, 4)
  assert.deepEqual(combinations[0], { intent: "primary", size: "sm" })
})

test("generateArgTypes and getVariantClass stay compatible with config shape", () => {
  const config = {
    base: "btn",
    variants: {
      size: { sm: "btn-sm", lg: "btn-lg" },
      intent: { primary: "btn-primary", danger: "btn-danger" },
    },
    defaultVariants: { size: "sm", intent: "primary" },
    compoundVariants: [{ class: "btn-lg-primary", size: "lg", intent: "primary" }],
  }

  const argTypes = generateArgTypes(config)
  const variantClass = getVariantClass(config, { size: "lg", intent: "primary" })
  const storyArgs = createVariantStoryArgs(config)

  assert.deepEqual(argTypes.size.options, ["sm", "lg"])
  assert.match(variantClass, /btn-lg-primary/)
  assert.equal(storyArgs.combinations.length, 4)
})

test("withTailwindStyled falls back to StoryFn result in node runtime", () => {
  const result = withTailwindStyled(() => "story", {
    parameters: { tailwindStyled: { padding: "p-4" } },
  })

  assert.equal(result, "story")
})
