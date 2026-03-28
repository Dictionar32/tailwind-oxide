# API Reference

## Core API

### `tw` — styled component factory

```tsx
import { tw } from "tailwind-styled-v4"
```

**Template literal:**
```tsx
const Box = tw.div`p-4 bg-zinc-900 rounded-xl`
const Title = tw.h1`text-4xl font-bold tracking-tight`
```

**Object config (with variants):**
```tsx
const Button = tw.button({
  base: "px-4 py-2 rounded-lg font-medium",
  variants: {
    variant: { primary: "bg-blue-500 text-white", ghost: "border" },
    size:    { sm: "h-8 text-sm", lg: "h-12 text-base" },
  },
  compoundVariants: [
    { variant: "primary", size: "lg", class: "shadow-lg" }
  ],
  defaultVariants: { variant: "primary", size: "sm" },
})

// Usage
<Button variant="primary" size="lg" />
```

**Extend component:**
```tsx
const HeroCard = Card.extend`shadow-2xl ring-1 ring-zinc-700`
```

**Wrap any component:**
```tsx
import Link from "next/link"
const StyledLink = tw(Link)`underline text-blue-400 hover:text-blue-300`
```

**TypeScript generics:**
```tsx
interface BadgeProps { $isActive: boolean }
const Badge = tw.span<BadgeProps>`
  px-2 py-1 rounded
  ${({ $isActive }) => $isActive ? "bg-blue-500" : "bg-zinc-700"}
`
```

---

### `tw.server.*` — Server-Only Components

```tsx
// Compiler guarantees these NEVER enter the client bundle
const Layout = tw.server.section`min-h-screen bg-zinc-950`
const Nav = tw.server.nav`flex items-center justify-between px-6`
```

---

### `cv()` — Class Variant Function

Standalone function tanpa React — cocok untuk shadcn/ui, Radix, Headless UI.

```tsx
import { cv } from "tailwind-styled-v4"

const buttonVariants = cv({
  base: "inline-flex items-center justify-center rounded-md text-sm font-medium",
  variants: {
    variant: {
      default:     "bg-zinc-900 text-white hover:bg-zinc-800",
      destructive: "bg-red-500 text-white hover:bg-red-600",
      outline:     "border border-zinc-700 hover:bg-zinc-800",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm:      "h-9 px-3",
      lg:      "h-11 px-8",
      icon:    "h-10 w-10",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
})

// Usage
<button className={buttonVariants({ variant: "outline", size: "lg" })}>Click</button>
```

**InferVariantProps** — TypeScript helper:
```tsx
import type { InferVariantProps } from "tailwind-styled-v4"
type ButtonVariants = InferVariantProps<typeof buttonVariants>
// { variant?: "default" | "destructive" | "outline", size?: "default" | "sm" | "lg" | "icon" }
```

---

### `cx()` / `cxm()` — Class Utilities

```tsx
import { cx, cxm } from "tailwind-styled-v4"

// cx — simple join, no conflict resolution
cx("p-4", isActive && "bg-blue-500", undefined, "rounded") // "p-4 bg-blue-500 rounded"

// cxm — conflict-aware merge (wraps tailwind-merge)
cxm("p-4 p-2", "bg-red-500 bg-blue-500") // "p-2 bg-blue-500"
```

---

## Next.js Plugin

```ts
// next.config.ts
import { withTailwindStyled } from "tailwind-styled-v4/next"

export default withTailwindStyled({
  // Transform mode
  mode: "zero-runtime",           // "zero-runtime" | "runtime"

  // Debug
  addDataAttr: true,              // adds data-tw="Component:classes"

  // RSC
  autoClientBoundary: true,       // auto "use client" when needed

  // Performance
  hoist: true,                    // hoist tw components out of render()
  atomic: false,                  // atomic CSS class names

  // Route CSS
  routeCss: false,                // per-route CSS bundling
  routeCssDir: ".next/static/css/tw",

  // Zero-config
  zeroConfig: true,               // auto-generate config if missing
  scanDirs: ["src"],
  safelistOutput: ".tailwind-styled-safelist.json",
})(nextConfig)
```

---

## Vite Plugin

```ts
// vite.config.ts
import { tailwindStyledPlugin } from "tailwind-styled-v4/vite"

export default defineConfig({
  plugins: [
    react(),
    tailwindStyledPlugin({
      mode: "zero-runtime",
      addDataAttr: process.env.NODE_ENV !== "production",
      autoClientBoundary: true,
    }),
  ],
})
```

---

## Preset

```ts
// tailwind.config.ts
import { defaultPreset } from "tailwind-styled-v4/preset"

export default {
  presets: [defaultPreset],    // includes design tokens + animation
  content: ["./src/**/*.{tsx,ts,jsx,js}"],
  theme: {
    extend: {
      colors: { brand: "#ff6b35" }   // override / extend
    }
  }
}
```

**Design tokens included:**
- Colors: `primary`, `secondary`, `accent`, `success`, `warning`, `danger`
- Font: `InterVariable`, `JetBrains Mono`
- Animations: `fade-in`, `slide-up`, `scale-in`
- Border radius: `sm`, `md`, `lg`, `xl`, `2xl`

---

## CSS Injector (Route CSS Mode)

```tsx
// app/layout.tsx — Server Component
import { TwCssInjector } from "tailwind-styled-v4/css"

export default function Layout({ children }) {
  return (
    <html>
      <head>
        <TwCssInjector/>                    {/* inject route CSS */}
        <TwCssInjector asLink />            {/* inject as <link> (cached) */}
        <TwCssInjector route="/dashboard"/> {/* explicit route */}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## Compiler API

```ts
import {
  transformSource,     // transform source code
  extractAllClasses,   // extract tw classes from source
  generateSafelist,    // generate safelist JSON
  analyzeFile,         // RSC analysis
  hoistComponents,     // hoist tw components
  loadTailwindConfig,  // load tw config with fallback
  isZeroConfig,        // check if project has no config
  bootstrapZeroConfig, // auto-generate config files
} from "tailwind-styled-v4/compiler"
```
