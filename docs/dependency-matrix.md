# Dependency Matrix

Dokumen ini merangkum dependency package-level yang dianggap penting untuk release hygiene. Ini bukan dump lengkap dari semua `package.json`.

Catatan: dokumen ini tetap menjadi ringkasan package-level untuk manusia. Source of truth untuk dependency antar file ada di `monorepo-file-dependency-graph.json` di root repo.

## Root Monorepo
Sumber: `package.json`

### Key devDependencies
- `@biomejs/biome` `^2.4.7`
- `@types/node` `^20.19.37`
- `@types/react` `^19`
- `dependency-cruiser` `^16.10.4`
- `tsup` `^8`
- `turbo` `^2.1.3`
- `typescript` `^5`

### Internal workspace range
- Root package memakai range internal `^5.0.4` untuk paket workspace yang dipublish bersama.

## packages/core (`@tailwind-styled/core`)
Sumber: `packages/core/package.json`

### dependencies kunci
- `postcss` `^8`
- `tailwind-merge` `^3`

### peerDependencies
- `react` `>=18`
- `react-dom` `>=18`
- `@tailwindcss/postcss` `^4`
- `tailwindcss` `^4`

### peerDependenciesMeta
- `react.optional` `true`
- `react-dom.optional` `true`
- `@tailwindcss/postcss.optional` `true`
- `tailwindcss.optional` `true`

## packages/compiler (`@tailwind-styled/compiler`)
Sumber: `packages/compiler/package.json`

### internal dependencies
- `@tailwind-styled/plugin-api` `^5.0.4`
- `@tailwind-styled/shared` `^5.0.4`
- `@tailwind-styled/syntax` `^5.0.4`

### external contract
- `postcss` `^8`
- `tailwind-merge` `^3`
- peer `@tailwindcss/postcss` `^4`
- peer `tailwindcss` `^4`

## packages/vite (`@tailwind-styled/vite`)
Sumber: `packages/vite/package.json`

### internal dependencies
- `@tailwind-styled/compiler` `^5.0.4`
- `@tailwind-styled/engine` `^5.0.4`
- `@tailwind-styled/scanner` `^5.0.4`

### peerDependencies
- `vite` `>=6.2.0`

## Adapter dan App Penting
- `@tailwind-styled/vue` versi `5.0.4`, peer `vue >=3.3.0`, peer `tailwind-merge >=2.0.0`
- `@tailwind-styled/svelte` versi `5.0.4`, peer `svelte >=4.0.0`, peer `tailwind-merge >=2.0.0`
- `@tailwind-styled/testing` versi `5.0.4`
- `@tailwind-styled/storybook-addon` versi `5.0.4`
- `@tailwind-styled/studio-desktop` versi `5.0.4`, dependency `electron-updater ^6.0.0`

## Catatan
- Semua workspace package yang dipublish diharapkan tetap selaras pada versi `5.0.4`.
- Semua dependency internal antar workspace package diharapkan memakai range `^5.0.4`, bukan `*`.
- Validator tidak memeriksa setiap dependency eksternal di semua package. Validator memeriksa subset dependency publik yang penting dan keselarasan versi workspace secara dinamis.

## Validasi
1. Jalankan `npm run validate:deps` sebelum membuat PR yang mengubah dependency manifest.
2. Jika command gagal, update manifest terkait dan selaraskan `docs/dependency-matrix.md` bersama `scripts/validate/dependency-matrix-check.mjs`.
3. Untuk konteks dependency antar file, cek `monorepo-file-dependency-graph.json`.
