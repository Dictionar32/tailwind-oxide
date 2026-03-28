# PR #5 Review Response — Architecture Reality Check & Next Steps

Dokumen ini merespons feedback teknis reviewer untuk PR #5, dengan fokus pada:
- status implementasi **aktual**,
- keputusan desain yang disengaja,
- backlog prioritas untuk penguatan jangka menengah.

## 1) Status Aktual (Sudah Ada)

### Scanner
- Traversal workspace rekursif sudah ada.
- Filtering extension + ignore dirs sudah ada.
- Ekstraksi class sudah jalan via `@tailwind-styled/compiler` (`extractAllClasses`).
- Implementasi saat ini menggunakan Node `fs/path` (tanpa `fast-glob`).
- Cache scanner file-based (`.cache/tailwind-styled/scanner-cache.json`) sudah aktif.

### Engine
- `createEngine()` sudah tersedia.
- `scan()` sudah tersedia.
- `build()` sudah tersedia untuk alur scan → merge class → optional CSS compile.
- `watch()` sudah tersedia untuk event `initial/change/unlink` dengan incremental update + fallback full rescan.

### CLI
- Command aktif: `init`, `scan`, `migrate`, `migrate --wizard`, `analyze`, `stats`, `extract`.
- Wizard interaktif berjalan via `readline/promises` native Node.js.

### Validation & Gate
- Validasi final: `npm run validate:final`.
- Ringkasan health: `npm run health:summary`.
- Konsistensi dependency matrix: `npm run validate:deps`.
- Audit gap PR #5 (AST parser, benchmark CI, fixture besar, API docs, examples): `npm run validate:pr5:gaps`.
- Audit gap sekarang memeriksa kualitas minimum (bukan sekadar keberadaan file).
- Hasil audit gap ditulis ke artifact `artifacts/pr5-gap-check.json` untuk referensi cepat reviewer.

## 2) Keputusan Desain Saat Ini (Disengaja)

- **Tanpa `commander`/`@inquirer/prompts`/`picocolors`** pada CLI.
  - Tujuan: minim dependency tree dan startup overhead.
- **Tanpa `fast-glob`** pada scanner saat ini.
  - Tujuan: baseline sederhana dan deterministik sebelum optimasi lanjutan.
- **Engine bergantung ke package internal** (`compiler` + `scanner`) alih-alih dependency langsung `postcss/tailwindcss`.
  - Tujuan: pemisahan concern agar surface area engine tetap kecil.

## 3) Gap yang Diakui & Backlog Prioritas

### P1 — Scanner Hardening
1. AST extraction JSX/TSX sudah dipindah ke parser berbasis TypeScript AST (bukan regex murni).
2. Fixture besar memiliki generator + sampel berkas yang di-commit untuk validasi cepat.
3. Benchmark CI sudah memakai threshold environment dan upload artifact hasil benchmark.

### P2 — Incremental DX
1. Hardening watch mode untuk edge-case rename/symlink/large workspace.
2. Penyempurnaan invalidation strategy per-file + observability metric.
3. Tambah benchmark incremental resmi ke pipeline validasi.

### P3 — Analyzer Layer (Project-Aware)
1. Tambah package `@tailwind-styled/analyzer` (proposal).
2. Surface awal: top classes, duplicate pattern candidates, output JSON.
3. Integrasi command CLI tambahan berbasis report (non-breaking).

## 4) Non-goals (Saat Ini)

Agar scope PR #5 tetap terkendali, item berikut **tidak** dianggap selesai dalam PR ini:
- static extraction penuh lintas framework,
- visualizer/studio,
- plugin API ecosystem lengkap,
- native scanner production-ready.

## 5) Exit Criteria untuk Melanjutkan ke Fase Berikutnya

Sebelum menambah fitur besar baru:
1. `validate:final` dan `health:summary` harus PASS konsisten.
2. `validate:deps` harus PASS.
3. Scanner benchmark baseline terdokumentasi.
4. Tidak ada mismatch antara dokumentasi dependency dan manifest aktual.

---

Dokumen ini dimaksudkan sebagai referensi reviewer/maintainer agar diskusi tidak bercampur antara:
- **status implementasi saat ini**, dan
- **proposal arsitektur masa depan**.
