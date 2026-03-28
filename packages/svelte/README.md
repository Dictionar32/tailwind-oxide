# @tailwind-styled/svelte

Svelte 4/5 adapter for tailwind-styled — class variants, utility merger, and styled action.

[![npm](https://img.shields.io/npm/v/@tailwind-styled/svelte)](https://www.npmjs.com/package/@tailwind-styled/svelte)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

## Installation

```bash
npm install @tailwind-styled/svelte tailwind-merge
```

> `tailwind-merge` is a peer dependency. Ensure version 2.x or 3.x is installed.

## API

### `cv()` — Class Variant Resolver

Defines a component with base class and variants based on props.

```svelte
<script>
  import { cv } from '@tailwind-styled/svelte'

  const button = cv({
    base: 'px-4 py-2 rounded font-medium transition-colors',
    variants: {
      intent: {
        primary: 'bg-blue-500 text-white hover:bg-blue-600',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
      },
      size: {
        sm: 'h-8 text-sm px-3',
        md: 'h-10 text-base',
        lg: 'h-12 text-lg px-6',
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  })

  export let intent = 'primary'
  export let size = 'md'
</script>

<button class={button({ intent, size })}>
  <slot />
</button>
```

### `tw()` — Simple Class Merger

Merges class strings with automatic conflict resolution (via tailwind-merge).

```svelte
<script>
  import { tw } from '@tailwind-styled/svelte'

  export let isActive = false
  const cls = tw(
    'px-4 py-2 rounded',
    'bg-gray-100 text-gray-900',
    isActive && 'bg-blue-500 text-white'
  )
</script>

<div class={cls}>
  <slot />
</div>
```

### `styled` — Svelte Action

Applies variant-based class to any element via `use:` directive.

```svelte
<script>
  import { styled } from '@tailwind-styled/svelte'

  const config = {
    base: 'p-4 rounded-lg border',
    variants: {
      size: {
        sm: 'h-8 text-sm',
        lg: 'h-16 text-xl',
      },
      elevated: {
        true: 'shadow-lg',
        false: 'shadow-sm',
      },
    },
    defaultVariants: {
      size: 'sm',
      elevated: false,
    },
  }
</script>

<div use:styled={{ config, props: { size: 'lg', elevated: true } }}>
  Styled via action
</div>
```

### `createVariants()` — Svelte 5 Runes Integration

Creates reactive class names that automatically update when state changes.
Designed specifically for Svelte 5 runes.

```svelte
<script>
  import { createVariants } from '@tailwind-styled/svelte'

  let size = $state('sm')
  let disabled = $state(false)

  const { className } = createVariants(
    {
      base: 'px-4 py-2 rounded font-medium transition-all',
      variants: {
        size: {
          sm: 'h-8 text-sm',
          md: 'h-10 text-base',
          lg: 'h-12 text-lg',
        },
        disabled: {
          true: 'opacity-50 cursor-not-allowed',
          false: 'cursor-pointer hover:opacity-90',
        },
      },
    },
    () => ({ size, disabled })
  )
</script>

<button class={className()} onclick={() => (size = size === 'sm' ? 'lg' : 'sm')}>
  Toggle size: {size}
</button>
```

## When to Use `cv()` vs `createVariants()`?

| Feature | `cv()` | `createVariants()` |
|---|---|---|
| Reactive (Svelte 5 runes) | Manual | Automatic |
| For reusable components | Yes | Yes |
| For inline state | No | Yes |
| Svelte 4 compatible | Yes | Needs adapter |

## Compatibility

| Version | Svelte | tailwind-merge | Node.js |
|---|---|---|---|
| 5.0.0 | 4.x - 5.x | 2.x - 3.x | >= 20 |

## License

MIT
