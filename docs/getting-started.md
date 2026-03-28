# Getting Started

## Installation

```bash
npm install tailwind-styled-v4
```

**Itu saja.** Tidak perlu install tailwindcss, postcss, atau setup apapun.

---

## Quick Start

### 1. Setup Next.js

```ts
// next.config.ts
import { withTailwindStyled } from "tailwind-styled-v4/next"
export default withTailwindStyled()(nextConfig)
```

Plugin otomatis:
- Generate `tailwind.config.ts` jika belum ada
- Generate `globals.css` jika belum ada
- Enable compiler transform untuk semua `.tsx/.ts/.jsx/.js`

### 2. Mulai styling

```tsx
// src/app/page.tsx
import { tw, cv } from "tailwind-styled-v4"

const Hero = tw.div`
  min-h-screen flex flex-col items-center justify-center
  bg-zinc-950 text-white
`

const Button = tw.button({
  base: "px-4 py-2 rounded-lg font-medium transition",
  variants: {
    variant: {
      primary: "bg-blue-500 text-white hover:bg-blue-600",
      ghost:   "border border-zinc-700 hover:bg-zinc-800",
    },
    size: { sm: "h-8 text-sm", lg: "h-12 text-base" },
  },
  defaultVariants: { variant: "primary", size: "sm" },
})

export default function Page() {
  return (
    <Hero>
      <Button variant="primary" size="lg">Get Started</Button>
    </Hero>
  )
}
```

---

## What Happens at Build Time

```
tw.div`p-4 bg-zinc-900`

  ↓ compiler

React.forwardRef(function _Tw_div(props, ref) {
  const { className, ...rest } = props;
  return React.createElement("div", {
    ref, ...rest,
    className: ["p-4 bg-zinc-900", className].filter(Boolean).join(" ")
  });
})
```

**No runtime. No styled-components. No resolver. Pure React.**

---

## Zero-Config Mode

Ketika `withTailwindStyled()` dipanggil pertama kali dan project tidak punya config:

```
Auto-generated: tailwind.config.ts
Auto-generated: src/app/globals.css
```

`tailwind.config.ts` berisi preset dari library:
```ts
import { defaultPreset } from "tailwind-styled-v4/preset"
export default { presets: [defaultPreset], content: [...], safelist: [...] }
```

Developer bisa override kapanpun:
```ts
// tailwind.config.ts
import { defaultPreset } from "tailwind-styled-v4/preset"
export default {
  presets: [defaultPreset],
  theme: {
    extend: {
      colors: { brand: "#ff6b35" }
    }
  }
}
```

---

## RSC-Aware Styling

```tsx
// Server Component — no "use client" needed
import { tw } from "tailwind-styled-v4"

// tw.server.* → compiler guarantees this stays server-only
const Layout = tw.server.div`min-h-screen bg-zinc-950`

// tw.* → auto-detect, CSS injected at server
const Card = tw.div`bg-zinc-900 rounded-xl p-6`
```

**Auto client boundary:**
```tsx
// Compiler detects onClick → auto injects "use client"
const Button = tw.button`px-4 py-2 bg-blue-500`
// Used with: <Button onClick={handler}> → "use client" injected
```

---

## Route-Level CSS (Advanced)

```ts
// next.config.ts
export default withTailwindStyled({ routeCss: true })(nextConfig)
```

Build output:
```
.next/static/css/tw/
  _global.css       ← 1.2kb (base + reset)
  index.css         ← 3.4kb (homepage only)
  about.css         ← 1.8kb (about page only)
  dashboard.css     ← 5.2kb (dashboard only)
```

vs Tailwind default: ~300kb global CSS untuk semua routes.

Inject di layout:
```tsx
// app/layout.tsx
import { TwCssInjector } from "tailwind-styled-v4/css"

export default function Layout({ children }) {
  return (
    <html>
      <head>
        <TwCssInjector/>    {/* Server Component, zero JS */}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## Vue 3

```bash
npm install @tailwind-styled/vue tailwind-merge
```

```vue
<script setup>
import { tw, cv } from '@tailwind-styled/vue'

const Button = tw('button', {
  base: 'px-4 py-2 rounded font-medium transition-colors',
  variants: {
    intent: {
      primary: 'bg-blue-500 text-white hover:bg-blue-600',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    },
  },
  defaultVariants: { intent: 'primary' },
})
</script>

<template>
  <Button intent="primary">Click me</Button>
</template>
```

---

## Svelte 4/5

```bash
npm install @tailwind-styled/svelte tailwind-merge
```

```svelte
<script>
  import { cv } from '@tailwind-styled/svelte'

  const buttonClass = cv({
    base: 'px-4 py-2 rounded font-medium',
    variants: { intent: { primary: 'bg-blue-500 text-white', danger: 'bg-red-500 text-white' } },
    defaultVariants: { intent: 'primary' },
  })
  export let intent = 'primary'
</script>

<button class={buttonClass({ intent })}>
  <slot />
</button>
```

---

## CLI quickstart

```bash
# Generate component dengan AI
tw ai "primary button with danger and ghost variants"

# Parse file untuk cek classes
tw parse src/Button.tsx

# Shake CSS — hapus rules yang tidak dipakai
tw shake dist/output.css --classes-from src/

# Token sync
tw sync init
tw sync push --to=tailwind
```
