# tailwind-styled-v5

⚡ **Zero-config, zero-runtime, compiler-driven Tailwind styling**

[![npm](https://img.shields.io/npm/v/tailwind-styled-v5?color=blue)](https://npmjs.com/package/tailwind-styled-v5)
[![license](https://img.shields.io/npm/l/tailwind-styled-v5)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org)

## Features

- **Zero runtime overhead** — CSS generated at build time
- **Type-safe variants API** — IntelliSense for all variants
- **RSC-aware** — Automatic client/server boundary detection
- **Multi-framework** — Next.js, Vite, Rspack, Webpack, Turbopack
- **Rust-powered** — ~60x faster class compilation

## Quick Start

```bash
npm install tailwind-styled-v5
```

### Template Literal

```tsx
import { tw } from "tailwind-styled-v5"

const Button = tw.button`
  inline-flex items-center rounded-lg px-4 py-2
  bg-blue-600 text-white font-medium
  hover:bg-blue-700 transition
`

<Button>Click me</Button>
```

### Object API with Variants

```tsx
const Button = tw.button({
  base: "inline-flex items-center rounded-lg px-4 py-2 font-medium transition",
  variants: {
    intent: {
      primary:   "bg-blue-600 text-white hover:bg-blue-700",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
      danger:    "bg-red-600 text-white hover:bg-red-700",
    },
    size: {
      sm: "text-sm px-3 py-1.5",
      md: "text-base px-4 py-2",
      lg: "text-lg px-6 py-3",
    },
  },
  defaultVariants: { intent: "primary", size: "md" },
})

<Button intent="danger" size="lg">Delete</Button>
```

### Sub-components (Inline)

Bisa definisikan sub-component langsung di dalam template literal dengan syntax `name { classes }`:

```tsx
import { tw } from "tailwind-styled-v5"

const Card = tw.article`
  rounded-2xl border border-gray-200 bg-white shadow-sm
  icon { mt-0.5 shrink-0 text-lg }
  title { font-semibold text-gray-900 }
  body { text-sm text-gray-500 }
`

// Gunakan dengan .namaSubComponent
function MyCard() {
  return (
    <Card>
      <Card.icon>ℹ️</Card.icon>
      <Card.title>Judul Card</Card.title>
      <Card.body>Isi konten card di sini...</Card.body>
    </Card>
  )
}
```

Gabungkan dengan `cx()` untuk conditional styling:

```tsx
import { tw, cx } from "tailwind-styled-v5"

const AlertRoot = tw.div`
  relative flex gap-3 rounded-xl border p-4 text-sm
  icon { mt-0.5 shrink-0 text-lg }
`

const colorMap = {
  info:    "border-blue-200 bg-blue-50 text-blue-800",
  success: "border-green-200 bg-green-50 text-green-800",
  error:   "border-red-200 bg-red-50 text-red-800",
}

function Alert({ type = "info", children }) {
  return (
    <AlertRoot className={cx(colorMap[type])}>
      <AlertRoot.icon>ℹ️</AlertRoot.icon>
      {children}
    </AlertRoot>
  )
}
```

## Framework Setup

### Next.js (App Router)

```ts
// next.config.ts
import { withTailwindStyled } from "tailwind-styled-v5/next"

export default withTailwindStyled()(nextConfig)
```

### Vite

```ts
// vite.config.ts
import { tailwindStyled } from "tailwind-styled-v5/vite"

export default {
  plugins: [tailwindStyled()],
}
```

### Rspack

```ts
// rspack.config.mjs
import { tailwindStyled } from "tailwind-styled-v5/vite"

export default {
  plugins: [tailwindStyled()],
}
```

## API

| Export | Description |
|--------|-------------|
| `tw` | Create styled components with template literals or object config |
| `cx` | Conditional class merge (like clsx) |
| `cv` | Headless class variants |
| `cn` | Merge with tailwind-merge |

## Sub-exports

- `tailwind-styled-v5/next` — Next.js adapter
- `tailwind-styled-v5/vite` — Vite adapter  
- `tailwind-styled-v5/preset` — Tailwind preset
- `tailwind-styled-v5/css` — CSS utilities
- `tailwind-styled-v5/animate` — Animation DSL
- `tailwind-styled-v5/theme` — Theme engine
- `tailwind-styled-v5/devtools` — DevTools overlay

## License

MIT © Dictionar32

### .extend() — Inheritance

```tsx
const Button = tw.button`bg-blue-500 text-white px-4 py-2`

// Turunkan dengan class tambahan tanpa override base
const IconButton = Button.extend`aspect-square p-2 rounded-full`

const LoadingButton = Button.extend`opacity-60 cursor-wait`
```

### cv() — Class Variants (Headless)

```tsx
import { cv } from "tailwind-styled-v5"

// Tanpa element HTML — untuk komponen custom
const alertStyles = cv({
  base: "rounded-lg border p-4 text-sm",
  variants: {
    type: {
      info:    "border-blue-200 bg-blue-50 text-blue-800",
      success: "border-green-200 bg-green-50 text-green-800",
      error:   "border-red-200 bg-red-50 text-red-800",
    },
  },
})

function Alert({ type, children }) {
  return <div className={alertStyles({ type })}>{children}</div>
}
```

### State Engine — Zero-JS State Management

```tsx
// Tanpa React state — pakai data attribute langsung
const Button = tw.button({
  base: "transition transform",
  state: {
    active: "bg-blue-600 scale-95",
    loading: "opacity-70 cursor-wait",
    disabled: "opacity-50 cursor-not-allowed",
  },
})
// Usage: <Button data-active="true">Click</Button>
// Ketika data-active="true", style aktif otomatis tanpa re-render
```

### Container Query Engine

```tsx
const Card = tw.div({
  container: {
    sm: "flex-col",
    md: "flex-row",
    lg: "grid grid-cols-2",
  },
})
// Auto-generate container queries, tidak perlu tulis @container sendiri
```

### Live Token Engine — Dynamic CSS Variables

```tsx
import { liveToken } from "tailwind-styled-v5"

const tokens = liveToken({
  primary: "#3b82f6",
  secondary: "#64748b",
  radius: "0.5rem",
})
// Auto-generate CSS variables: --tw-primary, --tw-secondary, dll
// Subscribe perubahan: tokens.subscribe(callback)
```

### tw.server — RSC-only Components

```tsx
const Avatar = tw.server`rounded-full object-cover`
// Hanya render di server (Next.js App Router)
// Auto-inject 'use client' kalo diperlukan
```

### Component Wrapping — tw(ExistingComponent)

```tsx
// Wrap komponen manapun dengan styling tambahan
const StyledCard = tw(Card)`shadow-lg border`
const BigButton = tw(Button)`text-xl px-8 py-4`
// Bisa juga pakai .extend():
const IconButton = Button.extend`p-2 rounded-full`
```

### Pattern untuk "4 Anak yang Mewarisi Style Base"

Karena sub-components TIDAK mewarisi style base, gunakan salah satu pattern ini:

**Pattern A: Base Variable**
```tsx
const base = "flex flex-col p-4 rounded-xl"
const Card = tw.div`${base} bg-white shadow`
const CardHeader = tw.div`${base} font-bold`
const CardBody = tw.div`${base} text-gray-600`
const CardFooter = tw.div`${base} border-t`
```

**Pattern B: .extend()**
```tsx
const Card = tw.div`flex flex-col p-4 bg-white shadow`
const CardHeader = Card.extend`font-bold text-lg`
const CardBody = Card.extend`text-gray-600`
const CardFooter = Card.extend`border-t pt-4`
```

**Pattern C: tw() Wrapper**
```tsx
const base = "flex flex-col p-4 rounded-xl"
const Card = tw.div`${base} bg-white shadow`
const CardHeader = tw(Card)`font-bold text-lg`
const CardBody = tw(Card)`text-gray-600`
const CardFooter = tw(Card)`border-t pt-4`
```