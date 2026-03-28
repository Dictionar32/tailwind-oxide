# Examples

## 1) Parser v4

```ts
import { parseTailwindClasses } from "tailwind-styled-v4"

const parsed = parseTailwindClasses("dark:hover:bg-blue-500/50 bg-(--brand)")
```

## 2) CSS-first Theme Reader

```ts
import { extractThemeFromCSS } from "tailwind-styled-v4"

const theme = extractThemeFromCSS(`
@theme {
  --color-primary: #3b82f6;
  --color-brand: var(--color-primary);
}
`)
```

## 3) Styled Resolver

```ts
import { styled } from "tailwind-styled-v4"

const button = styled({
  base: "px-4 py-2 rounded",
  variants: {
    intent: {
      primary: "bg-blue-500 text-white",
      secondary: "bg-gray-200 text-gray-900",
    },
  },
  defaultVariants: { intent: "primary" },
})
```

## 4) Vue 3 — tw() component

```ts
import { tw } from "@tailwind-styled/vue"

const Button = tw("button", {
  base: "px-4 py-2 rounded font-medium transition-colors",
  variants: {
    intent: {
      primary: "bg-blue-500 text-white hover:bg-blue-600",
      danger:  "bg-red-500 text-white hover:bg-red-600",
    },
    size: { sm: "h-8 text-sm", md: "h-10", lg: "h-12 text-lg" },
  },
  defaultVariants: { intent: "primary", size: "md" },
})
```

## 5) Svelte 4/5 — cv() resolver

```svelte
<script>
  import { cv } from "@tailwind-styled/svelte"

  const badge = cv({
    base: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
    variants: {
      color: {
        blue:  "bg-blue-100 text-blue-800",
        green: "bg-green-100 text-green-800",
        red:   "bg-red-100 text-red-800",
      },
    },
    defaultVariants: { color: "blue" },
  })

  export let color = "blue"
</script>

<span class={badge({ color })}><slot /></span>
```

## 6) CLI — parse + shake pipeline

```bash
# Parse file untuk lihat semua classes yang dipakai
tw parse src/components/Button.tsx

# Shake CSS — hapus rules tidak terpakai (hemat ~60-80%)
tw shake dist/output.css --classes-from src/

# Generate component dengan AI
tw ai "data table with sortable headers and pagination"

# Token sync ke Tailwind @theme
tw sync init
tw sync push --to=tailwind
```

## 7) Testing utilities

```ts
import { expectClasses, expandVariantMatrix, testAllVariants } from "@tailwind-styled/testing"
import { render } from "@testing-library/react"
import { Button } from "./Button"

test("Button renders all variants correctly", () => {
  testAllVariants(
    { intent: ["primary", "danger"], size: ["sm", "md", "lg"] },
    (variant) => {
      const { container } = render(<Button {...(variant as any)} />)
      expect(container.firstChild).not.toBeNull()
    }
  )
})

test("primary button has correct classes", () => {
  const { container } = render(<Button intent="primary" size="lg" />)
  expectClasses(container.firstChild as Element, ["bg-blue-500", "text-white", "h-12"])
})
```

## 8) Storybook addon

```ts
import { generateArgTypes, getVariantClass } from "@tailwind-styled/storybook-addon"
import { buttonConfig } from "./Button"
import { Button } from "./Button"

export default {
  title: "Components/Button",
  component: Button,
  argTypes: generateArgTypes(buttonConfig),
  args: { intent: "primary", size: "md" },
}

export const Default = {}
export const Danger = { args: { intent: "danger" } }
export const Large  = { args: { size: "lg" } }
```
