# @tailwind-styled/next

Next.js integration for tailwind-styled-v5 with native-first architecture.

Part of the tailwind-styled-v5 ecosystem. For the core styling API, see [@tailwind-styled/core](https://www.npmjs.com/package/tailwind-styled-v4).

## Installation

```bash
npm install @tailwind-styled/next
```

## Quick Start

```typescript
// next.config.ts
import { withTailwindStyled } from "@tailwind-styled/next"

export default withTailwindStyled({
  scanDirs: ["src"],
  routeCss: true,
})({
  // your next config
})
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scanDirs` | `string[]` | `["src"]` | Directories to scan for components |
| `safelistOutput` | `string` | `"src/app/__tw-safelist.css"` | Output path for safelist CSS |
| `addDataAttr` | `boolean` | `true` in dev | Add data-tw attributes |
| `autoClientBoundary` | `boolean` | `true` | Auto-add "use client" boundary |
| `hoist` | `boolean` | `true` | Hoist static variants |
| `routeCss` | `boolean` | `true` in prod | Generate route-level CSS |
| `routeCssDir` | `string` | `.next/static/css/tw` | Route CSS output directory |
| `devManifest` | `boolean` | `true` in dev | Serve manifest in dev mode |
| `zeroConfig` | `boolean` | `true` | Use Tailwind zero-config |
| `plugins` | `TwPlugin[]` | `[]` | Plugin array |
| `devtools` | `boolean` | `true` in dev | Enable DevTools overlay |

## Deprecated Options (v5)

The following options are deprecated in v5 and will be silently ignored:

| Deprecated | Replacement |
|------------|-------------|
| `mode` | Only zero-runtime supported |
| `atomic` | Use `@tailwind-styled/atomic` package |
| `staticVariants` | Handled by engine automatically |
| `deadStyleElimination` | Use engine with `analyze: true` |
| `incremental` | Handled by engine internally |
| `styleBuckets` | Handled by engine internally |

## Engine Integration

v5 uses `@tailwind-styled/engine` for build processing. The engine handles:
- Scanning workspace for components
- Incremental builds and caching
- CSS generation
- Dead style elimination (via `analyze` option)

## Route CSS Middleware

```typescript
import { getRouteCssLinks } from "@tailwind-styled/next/route-css"

// In your layout or pages
const links = getRouteCssLinks()
// Returns array of <link> elements for route CSS
```

## Breaking Changes in v5

- Removed `mode` option (only zero-runtime)
- Removed `atomic` option (use separate package)
- Removed direct compiler calls (use engine)
- Removed script calls (`split-routes.mjs`, `shake-css.mjs`)
- Simplified API - fewer options needed

## See Also

- [@tailwind-styled/core](https://www.npmjs.com/package/tailwind-styled-v4) - Core styling API (tw, cx, cv)
- [@tailwind-styled/vite](https://www.npmjs.com/package/@tailwind-styled/vite) - Vite plugin
- [@tailwind-styled/rspack](https://www.npmjs.com/package/@tailwind-styled/rspack) - Rspack adapter