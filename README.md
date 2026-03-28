<div align="center">

# tailwind-styled-v4

### ⚡ Rust-powered Tailwind CSS untuk React
**Build-time compiler · Zero runtime overhead · RSC-aware · Next.js / Vite / Rspack**

[![npm](https://img.shields.io/npm/v/tailwind-styled-v4?color=blue)](https://npmjs.com/package/tailwind-styled-v4)
[![license](https://img.shields.io/npm/l/tailwind-styled-v4)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.75+-orange?logo=rust)](https://rust-lang.org)
[![Node](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org)
[![test](https://img.shields.io/badge/tests-84%2F86%20passing-brightgreen)](#)
[![bundle](https://img.shields.io/badge/runtime-~4.5kb-green)](https://bundlephobia.com/package/tailwind-styled-v4)

</div>

---

## Apa ini?

`tailwind-styled-v4` adalah library styling untuk React yang menggabungkan **utility-first** Tailwind CSS dengan **engine berbasis Rust**. Tulis komponen dengan `tw.button` atau `tw.div({ variants })` — compiler extract dan optimasi CSS di build time, bukan runtime.

**Perbandingan singkat:**

| | tailwind-styled-v4 | styled-components | Tailwind CSS biasa |
|---|---|---|---|
| Build-time CSS | ✅ | ❌ | ✅ |
| Runtime overhead | ~0 | ~15KB | ~0 |
| Variants API | ✅ | terbatas | ❌ |
| RSC support | ✅ otomatis | ❌ | ✅ manual |
| Engine | 🦀 Rust | JS | JS |

---

## Instalasi

```bash
# npm
npm install tailwind-styled-v4

# Lalu jalankan setup otomatis
npx tw setup
```

`npx tw setup` akan otomatis:
- Mendeteksi bundler (Next.js / Vite / Rspack)
- Meng-inject plugin ke `next.config.ts` / `vite.config.ts`
- Membuat `tailwind-styled.config.json`
- Menambahkan `@import "tailwindcss"` ke CSS entry

---

## Quick Start

### 1. Template Literal

```tsx
import { tw } from "tailwind-styled-v4"

const Button = tw.button`
  inline-flex items-center rounded-lg px-4 py-2
  bg-blue-600 text-white font-medium
  hover:bg-blue-700 transition
`

// Pakai seperti komponen biasa
<Button onClick={handleClick}>Klik saya</Button>
```

### 2. Object Config + Variants

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

// TypeScript tahu variant apa yang valid
<Button intent="primary" size="lg">Submit</Button>
<Button intent="danger">Hapus</Button>
```

### 3. `.extend()` — Inheritance

```tsx
// Turunan dari Button, tambah styling tanpa override base
const IconButton = Button.extend`
  aspect-square justify-center rounded-full p-2
`

const LoadingButton = Button.extend`
  opacity-60 cursor-wait
`
```

### 4. `cx()` — Conditional Class Merge

```tsx
import { cx } from "tailwind-styled-v4"

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={cx(
      "h-2.5 w-2.5 rounded-full",
      online ? "bg-green-500" : "bg-gray-300"
    )} />
  )
}
```

### 5. `cv()` — Class Variants (headless)

```tsx
import { cv } from "tailwind-styled-v4"

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

### 6. Sub-components (Inline)

```tsx
// Semua dalam satu definition — tapi TIDAK mewarisi style base
const Card = tw.div`
  flex flex-col p-4 rounded-xl
  header { font-bold text-lg }
  body { text-gray-600 }
  footer { border-t pt-4 }
`
// Usage: <Card.header>Title</Card.header>
// CATATAN: Sub-components TIDAK mewarisi style base secara otomatis
```

### 7. State Engine — Zero-JS State Management

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

### 8. Container Query Engine

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

### 9. Live Token Engine — Dynamic CSS Variables

```tsx
import { liveToken } from "tailwind-styled-v4"

const tokens = liveToken({
  primary: "#3b82f6",
  secondary: "#64748b",
  radius: "0.5rem",
})
// Auto-generate CSS variables: --tw-primary, --tw-secondary, dll
// Subscribe perubahan: tokens.subscribe(callback)
```

### 10. tw.server — RSC-only Components

```tsx
const Avatar = tw.server`rounded-full object-cover`
// Hanya render di server (Next.js App Router)
// Auto-inject 'use client' kalo diperlukan
```

### 11. Component Wrapping — tw(ExistingComponent)

```tsx
// Wrap komponen manapun dengan styling tambahan
const StyledCard = tw(Card)`shadow-lg border`
const BigButton = tw(Button)`text-xl px-8 py-4`
// Bisa juga pakai .extend():
const IconButton = Button.extend`p-2 rounded-full`
```

---

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

---

## Bundler Integration

### Next.js (App Router)

```ts
// next.config.ts
import type { NextConfig } from "next"
import { withTailwindStyled } from "@tailwind-styled/next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default withTailwindStyled(nextConfig)
```

```tsx
// app/page.tsx — Server Component, tidak perlu 'use client'
import { tw } from "tailwind-styled-v4"

// Compiler otomatis deteksi RSC boundary
const Hero = tw.section`py-24 text-center`
const Title = tw.h1`text-5xl font-bold text-gray-900`

export default function Page() {
  return (
    <Hero>
      <Title>Hello from RSC</Title>
    </Hero>
  )
}
```

### Vite

```ts
// vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tailwindStyled } from "@tailwind-styled/vite"

export default defineConfig({
  plugins: [react(), tailwindStyled()],
})
```

### Rspack

```js
// rspack.config.mjs
import { defineConfig } from "@rspack/cli"
import { tailwindStyled } from "@tailwind-styled/rspack"

export default defineConfig({
  entry: "./src/index.ts",
  plugins: [tailwindStyled()],
})
```

---

## CLI

```bash
# Setup otomatis (interaktif — pilih project type)
npx tw setup

# Verifikasi setup
npx tw preflight

# Analisis workspace
npx tw audit

# Benchmark performa
npx tw benchmark
```

---

## Benchmark

Diukur di Debian Linux, Node.js 22, Rust 1.75.

| Operasi | tailwind-styled-v4 | Tailwind CSS (JS) | Speedup |
|---|---|---|---|
| Scan 1000 file | **0.8 ms** | ~340 ms | **~425×** |
| Compile 500 class | **0.02 ms** | ~1.2 ms | **~60×** |
| Parse class string | **0.010 ms** | ~0.8 ms | **~80×** |
| Cache read/write | **0.009 ms** | ~0.5 ms | **~55×** |
| Watch mode rebuild | **< 5 ms** | ~85 ms | **~17×** |

*Benchmark dijalankan via `npm run bench` (scripts/benchmark/run.mjs)*

---

## Arsitektur

```
tailwind-styled-v4/
├── native/                    # Rust engine (N-API, 27 functions)
│   ├── src/lib.rs             # Entry, 27 N-API exports
│   ├── src/oxc_parser.rs      # Oxc AST + regex hybrid parser
│   ├── src/scan_cache.rs      # DashMap in-memory cache
│   └── src/watcher.rs         # notify v6 file watcher
│
├── packages/
│   ├── core/                  # tw, cx, cv, cn — core API
│   ├── compiler/              # AST transform, CSS generation
│   ├── scanner/               # File scanner (Rust-backed)
│   ├── engine/                # Build engine, incremental diff
│   ├── animate/               # Animation DSL
│   ├── theme/                 # Multi-theme engine
│   ├── plugin/                # Plugin system
│   ├── cli/                   # CLI (tw setup, tw audit, dll)
│   ├── next/                  # Next.js adapter
│   ├── vite/                  # Vite adapter
│   └── rspack/                # Rspack adapter
│
└── examples/
    ├── vite/                  # Vite demo
    ├── vite-react/            # Vite React demo (dark mode)
    ├── standar-config-next-js-app/  # Next.js App Router demo
    └── rspack/                # Rspack + Node.js demo
```

---

## Development

```bash
# Clone
git clone https://github.com/Dictionar32/tailwind-styled-v4.git
cd tailwind-styled-v4

# Install dependencies
npm install

# Build Rust binary + semua packages
npm run build

# Test (Rust + JS)
npm run test

# Dev mode (watch all packages)
npm run dev

# Benchmark
npm run bench
```

**Requirements:**
- Node.js 20+
- Rust 1.75+ (untuk build dari source)
- Pre-built binary sudah disertakan untuk Linux x64

---

## Contributing

PR dan issue sangat welcome! Baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan.

Prioritas saat ini:
- [ ] macOS & Windows pre-built binary
- [ ] Docs website

---

## License

[MIT](LICENSE) © Dictionar32

---

## Engine Architecture (v4.5 Platform Overhaul)

Sprint 6–10 membawa perombakan arsitektur besar pada engine. Berikut ringkasannya.

### 🦀 Rust-backed pipeline

| Komponen | Implementasi | Fallback |
|---|---|---|
| Class scanner | `scan_workspace` (Rust) | JS `scanWorkspace` |
| Persistent cache | `cache_read/write` (Rust) | JS `ScanCache` |
| Incremental diff | `process_file_change` + DashMap | JS class set diff |
| File watcher | `notify` crate via polling IPC | Node.js `fs.watch` |
| Class analyzer | `analyze_classes` (Rust) | — |

### ⚡ Performance

- Cold start scan: **<10ms** (was >100ms) via persistent Rust cache
- Incremental update: **~0ms** untuk unchanged files
- Watch idle CPU: **~66% reduction** (500ms poll interval)
- Cache hit rate: typically **>95%** pada incremental dev

### 🔌 Platform Adapters

Semua adapter (Next.js, Vite, Rspack) sekarang **bundle compiler secara inline** — user tidak perlu menginstall `@tailwind-styled/compiler` secara terpisah.

```ts
// next.config.ts
import { withTailwindStyled } from 'tailwind-styled-v4/next'
export default withTailwindStyled()(nextConfig)

// vite.config.ts
import { tailwindStyledPlugin } from 'tailwind-styled-v4/vite'
export default defineConfig({ plugins: [tailwindStyledPlugin()] })
```

`preserveImports: true` diset di semua loader — `cv`, `cx`, `cn` tetap tersedia di output.

### 📊 Developer Tooling

```bash
# Analisis workspace (Rust engine)
tw analyze .
tw stats .

# Dashboard metrics real-time
tw dashboard

# Watch mode incremental
tw watch .
```

DevTools overlay (`Ctrl+Shift+D`) menampilkan:
- **Inspector** — hover element → lihat variant props & classes
- **State** — reactive state components
- **Container** — container query breakpoints aktif
- **Tokens** — live token editor (perubahan instan)
- **Analyzer** — DOM scan + engine metrics dari dashboard

### 🖥️ Studio Desktop (Electron)

```bash
# Dev mode
npm run dev -w @tailwind-styled/studio-desktop

# Build distribusi
npm run build:mac     # macOS DMG + ZIP
npm run build:win     # Windows NSIS installer
npm run build:linux   # AppImage + DEB
npm run build:all     # Semua platform sekaligus
```

Engine tersedia langsung dari renderer via `window.studioDesktop`:

```js
const result = await window.studioDesktop.engineBuild()
// { ok: true, totalFiles: 42, uniqueClasses: 312, cssLength: 18540 }

window.studioDesktop.onEngineEvent((event) => {
  if (event.type === 'change') console.log('Rebuilt:', event.result.css.length, 'bytes')
})
await window.studioDesktop.engineWatchStart()
```

### 🧪 Testing

```ts
import { expectEngineMetrics, toHaveEngineMetrics, tailwindMatchersWithMetrics } from '@tailwind-styled/testing'

// Assertion langsung
expectEngineMetrics(metrics, { minFiles: 10, maxBuildTimeMs: 500, cacheHitRateMin: 0.9 })

// Vitest/Jest custom matcher
expect.extend(tailwindMatchersWithMetrics)
expect(metrics).toHaveEngineMetrics({ minFiles: 5 })
```

### 🔧 Environment Variables

| Variable | Default | Deskripsi |
|---|---|---|
| `TWS_LOG_LEVEL` | `info` | `debug\|info\|warn\|error\|silent` |
| `TWS_NO_NATIVE` | `0` | `1` = paksa JS fallback |
| `TWS_NO_RUST` | `0` | Alias untuk `TWS_NO_NATIVE` |
| `TWS_DEBUG_SCANNER` | `0` | `1` = aktifkan scanner debug logs |
| `STUDIO_PORT` | `3030` | Port studio server |
| `STUDIO_VERBOSE` | tidak ada | Tampilkan stdout/stderr studio server |
