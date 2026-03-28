# tw split & tw optimize — Known Limitations (v4.9)

## tw split [root] [outDir]

### 1. CSS generation hanya menghasilkan subset class yang dikenali
- **Status**: By design (atomic CSS map terbatas)
- **Impact**: Class diluar peta (`grid-cols-3`, arbitrary values `w-[340px]`, dll) tidak menghasilkan CSS rule
- **Workaround**: Gunakan Tailwind CLI untuk generate CSS lengkap, lalu jalankan `tw shake` untuk tree-shaking
- **Target fix**: v4.9.1 — integrasi dengan `@tailwindcss/postcss` untuk generate CSS lengkap

### 2. Dynamic class names tidak bisa di-split per route
- **Status**: By design (static analysis only)
- **Impact**: `className={`bg-${color}-500`}` tidak terdeteksi — class tidak masuk ke route chunk
- **Workaround**: Tambahkan dynamic class ke safelist di Tailwind config

### 3. App Router nested layouts belum sepenuhnya dipetakan
- **Status**: Partial
- **Impact**: `/app/dashboard/settings/page.tsx` dipetakan ke `/dashboard/settings`, tapi shared layout classes (`/app/dashboard/layout.tsx`) masuk ke `__global` bukan ke semua dashboard routes
- **Workaround**: Ini adalah behavior yang benar untuk most cases — global CSS di-load sekali

### 4. `css-manifest.json` — konsumsi via routeCssMiddleware ✅ Sprint 6
- **Status**: Done — `packages/next/src/routeCssMiddleware.ts`
- `getRouteCssLinks(route)` — inject `<link>` tags di layout.tsx
- `injectRouteCssIntoHtml(html, route)` — inject ke HTML string (edge middleware)
- ✅ Sprint 7 done: RSC auto-inject via webpackLoader + turbopackLoader
- Sprint 10: dev mode auto-serving (manifest auto-served di dev server)

### 5. Vite plugin integrasi ✅ Sprint 6
- **Status**: Done — `tailwindStyledPlugin({ routeCss: true })`
- Auto-run split-routes + shake di `buildEnd`
- Konfigurasi: `routeCssDir`, `deadStyleElimination`

## tw optimize [file]

### 1. Constant folding hanya support ternary literal sederhana
- **Impact**: `condition ? 'a' : 'b'` bisa di-fold, tapi `fn() ? 'a' : 'b'` tidak
- **Workaround**: Ini by design — hanya compile-time constants yang aman di-fold

### 2. Partial eval `twMerge` hanya support 2 string literal arguments
- **Impact**: `twMerge('a', 'b', 'c')` dengan 3+ args tidak di-pre-compute
- **Target fix**: v4.9.1

### 3. Output overwrite tanpa backup
- **Status**: Known risk
- **Impact**: `tw optimize src/Button.tsx` langsung overwrite file asli
- **Workaround**: Gunakan version control (git) sebelum menjalankan optimize
- **Fix done**: `--backup` flag tersedia (Sprint 7)

## Changelog
- v4.9: `split-routes.mjs` production — atomic CSS generation per route
- v4.9: `optimize.mjs` — constant folding, dedup, partial eval
- v4.9: Next.js `withTailwindStyled` terintegrasi dengan `split-routes` pipeline
- Sprint 10+ (planned): Tailwind PostCSS integration untuk full CSS generation
- ✅ Sprint 7 done: RSC auto-inject di webpackLoader + turbopackLoader
- Sprint 9: dev mode serving otomatis

---

## Status aktual (v4.2.0 — 2026-03-16)

| Limitation | Status |
|-----------|--------|
| Atomic CSS map terbatas | ⚠️ Known — workaround: `tw shake` untuk full CSS |
| Dynamic class names | ⚠️ By design (static analysis) |
| App Router layout mapping | ✅ Layout → `__global`, pages → per-route |
| `<link>` injection | ✅ Sprint 6 — `routeCssMiddleware.ts` + `getRouteCssLinks()` |
| Vite plugin integrasi | ✅ Sprint 6 — `tailwindStyledPlugin({ routeCss: true })` |
| `--backup` flag | ✅ Sprint 7 |
| `tw critical --inline --out=file` | ✅ Implemented v4.9.1 |
