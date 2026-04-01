/**
 * Basic smoke tests for @tailwind-styled/runtime
 * Run with: node --experimental-vm-modules packages/runtime/src/index.ts.test.ts
 * (or via vitest / jest after build)
 */

// These tests are type-checked via tsc but not executed in CI yet.
// They document expected behaviour.

import { type ComponentMetadata, createComponent, cx } from "./index"

// cx
const a = cx("foo", "bar") // "foo bar"
const b = cx("foo", false, "baz") // "foo baz"
const c = cx(["foo", ["bar"]]) // "foo bar"
void a
void b
void c

// createComponent — simple
const _Div = createComponent("div", "Container_abc")
// Div is a React component — no subcomponents

// createComponent — compound
const Button = createComponent(
  "button",
  "Button_xyz",
  {
    icon: { tag: "span", class: "Button_icon_xyz" },
    text: { tag: "span", class: "Button_text_xyz" },
  },
  { fullWidth: "w-full" }
)
// Button.icon and Button.text should be React components
void Button.icon
void Button.text

// ComponentMetadata type
const meta: ComponentMetadata = {
  component: "Button",
  tag: "button",
  baseClass: "Button_xyz",
  subComponents: {
    icon: { tag: "span", class: "Button_icon_xyz" },
  },
}
void meta
