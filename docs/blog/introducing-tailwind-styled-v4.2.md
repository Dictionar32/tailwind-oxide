# Introducing tailwind-styled v4.2.0

**Release date:** 2026-03-15

We're excited to announce `tailwind-styled-v4` v4.2.0 — the biggest release since v2.0. This release closes all Sprint 1 and Sprint 2 gaps, adds Vue and Svelte adapters, real Oxc-powered parsing, and a live metrics dashboard.

## What's new

### Vue and Svelte adapters

`tailwind-styled` now works natively in Vue 3 and Svelte 4/5.

**Vue 3:**
```typescript
import { tw, cv } from '@tailwind-styled/vue'

const Button = tw('button', {
  base: 'px-4 py-2 rounded font-medium transition-colors',
  variants: {
    intent: {
      primary: 'bg-blue-500 text-white hover:bg-blue-600',
      danger: 'bg-red-500 text-white hover:bg-red-600',
    },
    size: { sm: 'h-8 text-sm', md: 'h-10', lg: 'h-12 text-lg' },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
})
```

**Svelte 4/5:**
```svelte
<script>
  import { cv } from '@tailwind-styled/svelte'

  const buttonClass = cv({
    base: 'px-4 py-2 rounded',
    variants: { intent: { primary: 'bg-blue-500', danger: 'bg-red-500' } },
    defaultVariants: { intent: 'primary' },
  })

  export let intent = 'primary'
</script>

<button class={buttonClass({ intent })}>
  <slot />
</button>
```

### Real Oxc-powered parsing (v4.6)

`tw parse` now uses a 3-tier strategy: `oxc-parser` (Rust, ~10x faster) → `@babel/parser` → regex fallback. It correctly extracts classes from JSX, template literals, and utility function calls like `twMerge()` and `cn()`.

```bash
$ tw parse src/Button.tsx
{
  "mode": "oxc-parser",
  "classCount": 23,
  "classes": ["px-4", "py-2", "bg-blue-500", ...],
  "parseMs": 4
}
```

### Real CSS tree shaking (v4.7)

`tw shake` now does actual CSS selector analysis — it scans your source files to find which classes are used, then removes rules whose selectors don't match anything. Not sentinel strings.

```bash
$ tw shake dist/output.css --classes-from src/
{
  "originalRules": 847,
  "keptRules": 203,
  "removedRules": 644,
  "savedPercent": "76.0%"
}
```

### Live metrics dashboard

The dashboard server now reads real build metrics from the engine:

```bash
npm run v4.2:dashboard
# Opens http://localhost:3000
# Shows: build time, scan time, class count, CSS size, memory — live
```

### AI component generator

```bash
$ tw ai "card with header and footer, shadow variants"
# Calls Anthropic API if ANTHROPIC_API_KEY is set
# Falls back to smart static template otherwise
```

### Design token sync (W3C DTCG format)

```bash
$ tw sync init        # Creates tokens.sync.json
$ tw sync push --to=tailwind  # Exports to @theme block
@theme {
  --color-primary: #3b82f6;
  --color-danger: #ef4444;
  --spacing-md: 1rem;
  ...
}
```

### Testing utilities

```typescript
import { expectClasses, expandVariantMatrix, testAllVariants } from '@tailwind-styled/testing'

// Assert element has exact classes
expectClasses(element, ['px-4', 'py-2', 'bg-blue-500'])

// Auto-test all variant combinations
testAllVariants(
  { intent: ['primary', 'danger'], size: ['sm', 'md', 'lg'] },
  (variant) => {
    const { container } = render(<Button {...variant} />)
    expect(container.firstChild).not.toBeNull()
  }
)
```

### Storybook addon

```typescript
import { generateArgTypes } from '@tailwind-styled/storybook-addon'

export default {
  title: 'Components/Button',
  component: Button,
  argTypes: generateArgTypes(buttonConfig), // Auto-generates dropdowns for all variants
}
```

## Benchmark

On a 2024 MacBook Pro M3 (8 cores):

| Operation | Result |
|-----------|--------|
| Parse (oxc mode) | ~180 files/sec |
| Parse (regex fallback) | ~90 files/sec |
| CSS tree shake (150 rules) | ~45ms, ~60% reduction |
| Cluster build (4 workers, 100 files) | ~280 files/sec |

## Migration from v4.1

No breaking changes. Install new packages as needed:

```bash
npm install @tailwind-styled/vue     # Vue 3 adapter
npm install @tailwind-styled/svelte  # Svelte adapter
npm install @tailwind-styled/testing # Testing utilities
```

## Known limitations

See [`docs/known-limitations/`](./known-limitations/) for full details on `tw parse`, `tw transform`, and `tw lint`.

## What's next (Sprint 4)

- Studio Desktop (Electron app)
- Remote build server for cluster
- `@theme` live token refresh in dev mode
- Figma token sync integration
- v4.9 CSS code splitting per route (production)

---

Full changelog: [CHANGELOG.md](../../CHANGELOG.md)
