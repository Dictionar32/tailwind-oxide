import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { describe, test } from "node:test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const runtime = require(path.join(ROOT, "packages/runtime/dist/index.cjs"))

const {
  applyTokenSet,
  createComponent,
  cx,
  getToken,
  getTokens,
  liveToken,
  liveTokenEngine,
  setToken,
  subscribeTokens,
  tokenRef,
  tokenVar,
} = runtime

function isForwardRefComponent(value) {
  return value !== null && typeof value === "object" && typeof value.render === "function"
}

describe("@tailwind-styled/runtime cx()", () => {
  test("joins strings and nested arrays", () => {
    assert.equal(cx("foo", ["bar", ["baz"]]), "foo bar baz")
  })

  test("filters falsy values", () => {
    assert.equal(cx("foo", false, null, undefined, "", "bar"), "foo bar")
  })
})

describe("@tailwind-styled/runtime token bridge", () => {
  test("exports token helpers", () => {
    assert.equal(tokenVar("color-primary"), "--tw-token-color-primary")
    assert.equal(tokenRef("color-primary"), "var(--tw-token-color-primary)")
  })

  test("setToken/getToken/getTokens stay in sync", () => {
    setToken("runtime-primary", "#112233")
    assert.equal(getToken("runtime-primary"), "#112233")
    assert.equal(getTokens()["runtime-primary"], "#112233")
  })

  test("subscribeTokens observes updates", () => {
    let observed
    const unsubscribe = subscribeTokens((tokens) => {
      observed = tokens["runtime-subscriber"]
    })

    setToken("runtime-subscriber", "#445566")
    unsubscribe()

    assert.equal(observed, "#445566")
  })

  test("liveToken and applyTokenSet expose the theme bridge", () => {
    const theme = liveToken({ "runtime-brand": "#778899" })
    assert.equal(theme.get("runtime-brand"), "#778899")

    applyTokenSet({ "runtime-brand": "#aabbcc" })
    assert.equal(getToken("runtime-brand"), "#aabbcc")
    assert.equal(typeof liveTokenEngine.getToken, "function")
    assert.equal(typeof liveTokenEngine.subscribeTokens, "function")
  })
})

describe("@tailwind-styled/runtime createComponent()", () => {
  test("creates a forwardRef base component", () => {
    const Button = createComponent("button", "Button_hash")
    assert.ok(isForwardRefComponent(Button))
    assert.equal(Button.displayName, "tw.button")
  })

  test("attaches subcomponents with their own display names", () => {
    const Card = createComponent("div", "Card_hash", {
      header: { tag: "header", class: "Card_header_hash" },
      body: { class: "Card_body_hash" },
    })

    assert.ok(isForwardRefComponent(Card.header))
    assert.ok(isForwardRefComponent(Card.body))
    assert.equal(Card.header.displayName, "tw.div.header")
    assert.equal(Card.body.displayName, "tw.div.body")
  })

  test("accepts conditional class maps", () => {
    assert.doesNotThrow(() => {
      createComponent(
        "button",
        "Button_hash",
        { icon: { class: "Button_icon_hash" } },
        { fullWidth: "w-full", elevated: "shadow-lg" }
      )
    })
  })
})
