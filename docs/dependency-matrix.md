# Dependency Matrix (Aktual)

Dokumen ini merangkum dependency **aktual** berdasarkan `package.json` di repo saat ini.

## Root Monorepo
Sumber: `package.json`

- `@biomejs/biome` `^2.4.6`
- `@types/node` `^20`
- `@types/react` `^19`
- `oxlint` `^1.55.0`
- `tsup` `^8`
- `typescript` `^5`

## packages/core (`tailwind-styled-v4`)
Sumber: `packages/core/package.json`

### dependencies
- `postcss` `^8`
- `tailwind-merge` `^3`

### peerDependencies
- `react` `>=18`
- `react-dom` `>=18`

### peerDependenciesOptional
- `@tailwindcss/postcss` `^4`
- `tailwindcss` `^4`

### devDependencies
- `@tailwind-styled/animate` `*`
- `@types/node` `^20`
- `@types/react` `^19`
- `tsup` `^8`
- `typescript` `^5`

## packages/cli (`create-tailwind-styled`)
Sumber: `packages/cli/package.json`

### dependencies
- `@tailwind-styled/analyzer` `^5.0.0`
- `@tailwind-styled/next` `^5.0.0`
- `@tailwind-styled/rspack` `^5.0.0`
- `@tailwind-styled/scanner` `^5.0.0`
- `@tailwind-styled/svelte` `^5.0.0`
- `@tailwind-styled/vite` `^5.0.0`
- `@tailwind-styled/vue` `^5.0.0`

### devDependencies
- `@types/node` `^20`
- `tsup` `^8`
- `typescript` `^5`

## packages/vite (`@tailwind-styled/vite`)
Sumber: `packages/vite/package.json`

### dependencies
- `@tailwind-styled/compiler` `2.0.0`
- `@tailwind-styled/engine` `*`
- `@tailwind-styled/scanner` `*`

### peerDependencies
- `vite` `>=5`

### devDependencies
- `@types/node` `^20`
- `tsup` `^8`
- `typescript` `^5`
- `vite` `^5`

## packages/engine (`@tailwind-styled/engine`)
Sumber: `packages/engine/package.json`

### dependencies
- `@tailwind-styled/compiler` `*`
- `@tailwind-styled/scanner` `*`

### devDependencies
- `tsup` `^8`
- `typescript` `^5`

## packages/scanner (`@tailwind-styled/scanner`)
Sumber: `packages/scanner/package.json`

### dependencies
- `@tailwind-styled/compiler` `*`

### devDependencies
- `tsup` `^8`
- `typescript` `^5`

---

## Catatan penting
- Paket seperti `clsx`, `commander`, `@inquirer/prompts`, `fast-glob`, `@rspack/core`, `@napi-rs/cli`, `@swc/core`, `autoprefixer`, dan `vitest` **tidak tercantum** pada file `package.json` paket yang diringkas di atas pada state saat ini.
- Untuk validasi readiness rilis, gunakan:
  - `npm run validate:final`
  - `npm run health:summary`
- Untuk validasi konsistensi dependency matrix vs manifest, gunakan:
  - `npm run validate:deps`

## Status Implementasi (Diverifikasi dari Source)

### CLI (`packages/cli`)
- **Sudah implementasi**, bukan skeleton: command router untuk `init`, `scan`, `migrate`, `analyze`, `stats`, `extract` aktif di `src/index.ts`.
- `scan` sudah memanggil scanner dan bisa output JSON/top classes.
- `migrate` + `--wizard` sudah berjalan via `readline/promises` (tanpa dependency eksternal `commander`/`inquirer`).

### Scanner (`packages/scanner`)
- **Sudah implementasi** traversal workspace rekursif, filter extension, ignore dirs, scan file, dan agregasi unique class.
- Implementasi memakai Node `fs/path` + `extractAllClasses` dari compiler, **bukan** `fast-glob`.
- Scanner punya cache file-based default di `.cache/tailwind-styled/scanner-cache.json`.

### Engine (`packages/engine`)
- **Sudah implementasi** `createEngine()`, `scan()`, `build()`, dan `watch()` (initial/change/unlink) untuk alur scan → merge class → optional compile CSS.
- Integrasi dilakukan lewat `@tailwind-styled/compiler` + `@tailwind-styled/scanner`, sehingga tidak perlu dependency `postcss/tailwindcss` langsung di package engine.

### Catatan
- Ketidakhadiran package seperti `commander`, `@inquirer/prompts`, `picocolors`, `fast-glob` adalah keputusan implementasi saat ini, bukan bukti fitur belum ada.


## Cara Menggunakan Dependency Matrix

1. Jalankan `npm run validate:deps` sebelum membuat PR untuk memastikan daftar dependency di dokumen ini masih sinkron dengan `package.json` setiap package.
2. Jika command gagal, update salah satu dari dua sisi berikut:
   - dependency di manifest package terkait, atau
   - isi `docs/dependency-matrix.md` dan `scripts/validate/dependency-matrix-check.mjs`.
3. Untuk readiness rilis, lanjutkan dengan `npm run validate:final` dan `npm run health:summary`.
4. Untuk konteks review PR #5 (status aktual vs proposal lanjutan), lihat `docs/ops/pr5-review-response.md`.

## packages/vue (@tailwind-styled/vue) — NEW v4.2
### peerDependencies
- `vue` `>=3.3.0`
- `tailwind-merge` `>=2.0.0`

## packages/svelte (@tailwind-styled/svelte) — NEW v4.2
### peerDependencies
- `svelte` `>=4.0.0`
- `tailwind-merge` `>=2.0.0`

## packages/testing (@tailwind-styled/testing) — Updated v4.2
### peerDependencies (optional)
- `vitest` atau `jest` untuk custom matchers

## packages/storybook-addon (@tailwind-styled/storybook-addon) — Updated v4.2
### peerDependencies (optional)
- `@storybook/core` `>=7.0.0`

## packages/studio-desktop (@tailwind-styled/studio-desktop) — NEW v4.2
### dependencies
- `electron-updater` `^6.0.0`
### devDependencies
- `electron` `^33.0.0`
- `electron-builder` `^24.0.0`

## Packages baru v4.2 (summary)
| Package | Type |
|---------|------|
| `@tailwind-styled/vue` | Adapter |
| `@tailwind-styled/svelte` | Adapter |
| `@tailwind-styled/studio-desktop` | App (Electron) |
