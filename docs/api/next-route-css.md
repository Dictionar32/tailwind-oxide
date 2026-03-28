# Route CSS Middleware API — Next.js (Sprint 6)

Package: `tailwind-styled-v4/next/route-css`

Membaca `css-manifest.json` yang di-generate oleh `withTailwindStyled()` dan
menyediakan helper untuk inject `<link>` tags per route.

## Setup

Aktifkan di `next.config.ts`:

```ts
import { withTailwindStyled } from "tailwind-styled-v4/next"

export default withTailwindStyled({ routeCss: true })(nextConfig)
// → Setelah build, manifest ditulis ke .next/static/css/tw/css-manifest.json
```

## `getRouteCssLinks(route, opts?)`

Mengembalikan array link descriptor untuk route tertentu.

```tsx
// app/layout.tsx
import { getRouteCssLinks } from "tailwind-styled-v4/next/route-css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const homeLinks = getRouteCssLinks("/")
  return (
    <html>
      <head>
        {homeLinks.map((link) => (
          <link key={link.props.href} {...link.props} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## `injectRouteCssIntoHtml(html, route, opts?)`

Inject `<link>` tags ke dalam HTML string (untuk edge middleware / custom SSR).

```ts
import { injectRouteCssIntoHtml } from "tailwind-styled-v4/next/route-css"

const enrichedHtml = injectRouteCssIntoHtml(rawHtml, "/dashboard")
// Inserts <link rel="stylesheet" ...> before </head>
```

## `loadRouteCssManifest(path?)`

Load manifest secara manual (cached setelah pertama kali).

```ts
import { loadRouteCssManifest, invalidateRouteCssManifest } from "tailwind-styled-v4/next/route-css"

const manifest = loadRouteCssManifest()
// { "/": "artifacts/route-css/index.css", "__global": "artifacts/route-css/_global.css" }

invalidateRouteCssManifest() // clear cache setelah build baru
```

## Manifest format

```json
{
  "__global": ".next/static/css/tw/_global.css",
  "/": ".next/static/css/tw/index.css",
  "/dashboard": ".next/static/css/tw/dashboard.css"
}
```

## Known limitations

- ✅ Sprint 7 done: RSC auto-inject via webpackLoader/turbopackLoader
- ✅ Sprint 7 done: `getDynamicRouteCssLinks()` support `[id]` dan `[...slug]` segments
- ✅ Sprint 10+ done: `devManifest: true` (default di dev) — serve via `/__tw/css-manifest.json` dan `/__tw/:path*.css` via Next.js rewrites
