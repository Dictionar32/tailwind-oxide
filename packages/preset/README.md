# @tailwind-styled-v4/preset

Default preset and design tokens for tailwind-styled-v4.

## Installation

```bash
npm install tailwind-styled-v4
```

## Quick Start (Zero-Config)

Zero-config setup — no configuration needed:

```bash
npm install tailwind-styled-v4
```

Then use directly:

```tsx
import { tw } from "tailwind-styled-v4"

function App() {
  return <tw.div p-4 bg-blue-500 text-white rounded-lg>Hello</tw.div>
}
```

## Design Tokens

### Colors

| Token | Default Value |
|-------|---------------|
| `primary` | `#3b82f6` |
| `primary-hover` | `#2563eb` |
| `primary-active` | `#1d4ed8` |
| `primary-foreground` | `#ffffff` |
| `secondary` | `#6366f1` |
| `secondary-hover` | `#4f46e5` |
| `secondary-active` | `#4338ca` |
| `secondary-foreground` | `#ffffff` |
| `accent` | `#f59e0b` |
| `accent-hover` | `#d97706` |
| `accent-active` | `#b45309` |
| `accent-foreground` | `#000000` |
| `success` | `#10b981` |
| `success-foreground` | `#ffffff` |
| `warning` | `#f59e0b` |
| `warning-foreground` | `#000000` |
| `danger` | `#ef4444` |
| `danger-foreground` | `#ffffff` |
| `info` | `#3b82f6` |
| `info-foreground` | `#ffffff` |
| `surface` | `#18181b` |
| `border` | `#27272a` |
| `muted` | `#71717a` |
| `subtle` | `#3f3f46` |

### Fonts

| Token | Default Value |
|-------|---------------|
| `font-sans` | `InterVariable, Inter, system-ui, sans-serif` |
| `font-mono` | `JetBrains Mono, Fira Code, Consolas, monospace` |

### Spacing

| Token | Value |
|-------|-------|
| `spacing-1` | `0.25rem` |
| `spacing-2` | `0.5rem` |
| `spacing-3` | `0.75rem` |
| `spacing-4` | `1rem` |
| `spacing-5` | `1.25rem` |
| `spacing-6` | `1.5rem` |
| `spacing-8` | `2rem` |
| `spacing-10` | `2.5rem` |
| `spacing-12` | `3rem` |
| `spacing-16` | `4rem` |

### Breakpoints

| Token | Value |
|-------|-------|
| `sm` | `40rem` |
| `md` | `48rem` |
| `lg` | `64rem` |
| `xl` | `80rem` |
| `2xl` | `96rem` |

### Border Radius

| Token | Value |
|-------|-------|
| `radius-sm` | `0.25rem` |
| `radius-md` | `0.5rem` |
| `radius-lg` | `0.75rem` |
| `radius-xl` | `1rem` |
| `radius-2xl` | `1.5rem` |
| `radius-full` | `9999px` |

### Animations

| Token | Value |
|-------|-------|
| `animate-fade-in` | `fadeIn 0.2s ease-out` |
| `animate-fade-out` | `fadeOut 0.2s ease-in` |
| `animate-slide-up` | `slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)` |
| `animate-slide-down` | `slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)` |
| `animate-scale-in` | `scaleIn 0.2s ease-out` |

## Using with Tailwind v4 CSS-first

### defaultThemeCss

Import the ready-to-use `@theme` block:

```css
/* globals.css */
@import "tailwindcss";
@theme {
  --color-primary: #3b82f6;
  /* ... more tokens */
}
```

Or use the exported string directly:

```ts
import { defaultThemeCss } from "tailwind-styled-v4/preset"
import { writeFileSync } from "fs"

writeFileSync("globals.css", defaultThemeCss)
```

### generateTailwindCss

Generate CSS with custom content paths:

```ts
import { generateTailwindCss } from "tailwind-styled-v4/preset"

const css = generateTailwindCss(["./src/**/*.{tsx,ts}"])
console.log(css)
```

## Using with Tailwind v3 Config

### defaultPreset

Use as a Tailwind v3 preset:

```ts
// tailwind.config.ts
import { defaultPreset } from "tailwind-styled-v4/preset"

export default {
  presets: [defaultPreset],
  // your config
}
```

### generateTailwindConfig

Generate a complete Tailwind v3 config:

```ts
import { generateTailwindConfig } from "tailwind-styled-v4/preset"

const config = generateTailwindConfig()
console.log(config)
```

Output:

```ts
import type { Config } from "tailwindcss"
import { defaultPreset } from "tailwind-styled-v4/preset"

const safelist = (() => {
  try { return require(".tailwind-styled-safelist.json") as string[] }
  catch { return [] }
})()

export default {
  presets: [defaultPreset],
  content: ["./src/**/*.{tsx,ts,jsx,js,mdx}", /* ... */],
  safelist,
} satisfies Config
```

## Overriding Tokens Per-Project

### Tailwind v4 Override

Override in your CSS:

```css
@theme {
  --color-primary: #ff0000;
  --spacing-4: 1.5rem;
}
```

### Tailwind v3 Override

Extend the preset in `tailwind.config.ts`:

```ts
// tailwind.config.ts
import { defaultPreset } from "tailwind-styled-v4/preset"

export default {
  presets: [defaultPreset],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ff0000",
          hover: "#cc0000",
        },
      },
    },
  },
}
```

## Examples

### Zero-config (Recommended)

```tsx
import { tw } from "tailwind-styled-v4"

export function Button({ children }: { children: React.ReactNode }) {
  return (
    <tw.button
      px-4
      py-2
      bg-primary
      hover:bg-primary-hover
      text-primary-foreground
      rounded-md
      font-medium
      transition-colors
    >
      {children}
    </tw.button>
  )
}
```

### With Custom Colors

```css
/* globals.css */
@theme {
  --color-primary: #8b5cf6;
  --color-primary-hover: #7c3aed;
}
```

### With Animation

```tsx
import { tw } from "tailwind-styled-v4"

export function FadeIn({ children }: { children: React.ReactNode }) {
  return (
    <tw.div animate-fade-in>
      {children}
    </tw.div>
  )
}
```

### With Dark Mode

```tsx
import { tw } from "tailwind-styled-v4"

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <tw.div 
      class="dark"
      bg-surface
      dark:bg-white
      border
      border-border
      dark:border-gray-200
      rounded-lg
      p-4
    >
      {children}
    </tw.div>
  )
}
```
