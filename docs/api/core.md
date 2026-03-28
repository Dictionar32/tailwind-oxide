# Core API

Dokumen ini menjelaskan API inti dari `tailwind-styled-v4`.

## `tw`
`tw` adalah tagged-template helper untuk membuat komponen berbasis utility classes.

```ts
import { tw } from "tailwind-styled-v4"

const Button = tw.button`px-4 py-2 rounded bg-blue-600 text-white`
```

## `styled`
`styled` dipakai untuk konfigurasi komponen berbasis object (`base`, `variants`, `defaultVariants`, dll).

```ts
import { styled } from "tailwind-styled-v4"

const Card = styled("div", {
  base: "rounded border bg-white p-4",
  variants: {
    tone: {
      neutral: "border-slate-200",
      brand: "border-blue-500",
    },
  },
  defaultVariants: { tone: "neutral" },
})
```

## `cx`
`cx` menggabungkan class name secara kondisional.

```ts
import { cx } from "tailwind-styled-v4"

const className = cx("p-4", isActive && "bg-blue-500")
```

## `liveToken`
`liveToken` dan `setToken` membantu mengelola token runtime secara terpusat.

```ts
import { liveToken, setToken } from "tailwind-styled-v4"

const tokens = liveToken({ brand: "#2563eb" })
setToken("brand", "#0ea5e9")
setToken("primary", "#3b82f6")
setToken("spacing.section", "3rem")
```

> Gunakan API ini saat membutuhkan theming dinamis tanpa meninggalkan utility-first workflow.

## `cv` — Class Variants
`cv` membuat resolver class berdasarkan variant props. Framework-agnostic.

```ts
import { cv } from "tailwind-styled-v4"

const button = cv({
  base: "px-4 py-2 rounded font-medium",
  variants: {
    intent: { primary: "bg-blue-500 text-white", danger: "bg-red-500 text-white" },
    size:   { sm: "h-8 text-sm", md: "h-10", lg: "h-12 text-lg" },
  },
  defaultVariants: { intent: "primary", size: "md" },
})

button({ intent: "danger", size: "lg" })
// → "px-4 py-2 rounded font-medium bg-red-500 text-white h-12 text-lg"
```

## Vue adapter — `@tailwind-styled/vue`
```ts
import { tw, cv } from "@tailwind-styled/vue"

const Button = tw("button", { base: "...", variants: { intent: { primary: "..." } } })
```
Lihat [packages/vue/src/index.ts] untuk API lengkap.

## Svelte adapter — `@tailwind-styled/svelte`
```svelte
<script>
  import { cv } from "@tailwind-styled/svelte"
  const button = cv({ base: "px-4", variants: { size: { sm: "h-8", lg: "h-12" } } })
  export let size = "sm"
</script>
<button class={button({ size })}><slot /></button>
```
