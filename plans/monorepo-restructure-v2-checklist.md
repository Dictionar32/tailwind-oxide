# Approved Implementation Checklist

Source of truth:
- [monorepo-restructure-v2-mermaid.md](c:/Users/User/Documents/demoPackageNpm/focus/tailwind-styled-v4.5-platform-modify-v3_fixed%20(1)/library/plans/monorepo-restructure-v2-mermaid.md)
- Execution handoff: [monorepo-restructure-v2-execution-log.md](c:/Users/User/Documents/demoPackageNpm/focus/tailwind-styled-v4.5-platform-modify-v3_fixed%20(1)/library/plans/monorepo-restructure-v2-execution-log.md)

## Status
- `Approved`
- Direction: `tanpa mengurangi fungsi + memperkuat fungsi lama + menambah fungsi baru`
- Execution snapshot: `2026-03-29` root gate verified green setelah perbaikan fallback/native bridge di compiler.
- Wave 4 observability snapshot: `doctor`, `trace`, `why`, engine metrics write, dan dashboard summary/health surface sudah masuk production prototype; devtools traces dan plugin starter masih pending.

## Success Criteria
- Root import, root subpath import, dan direct import `@tailwind-styled/*` tetap berjalan.
- Fungsi lama menjadi lebih kuat: lebih typed, lebih stabil, lebih bisa di-debug, dan lebih ter-cover test.
- Fungsi baru bersifat additive dan tidak memaksa breaking rewrite.
- Semua gate tetap hijau: `build`, `check`, `test`, `pack:check`.

## Stream 1: Preserve Existing Features
### Compatibility Shell
- [ ] Pertahankan root package `tailwind-styled-v4` sebagai umbrella publik.
- [ ] Pertahankan semua wrapper di `src/umbrella/`.
- [ ] Pertahankan semua root subpath export yang sudah ada.
- [ ] Pertahankan package import `@tailwind-styled/*` yang sudah ada.
- [ ] Pastikan tidak ada perubahan nama package publik tanpa migration layer.

### Compatibility Gates
- [ ] Tambahkan smoke test untuk root import.
- [ ] Tambahkan smoke test untuk root subpath import.
- [ ] Tambahkan smoke test untuk direct workspace import.
- [ ] Tambahkan smoke test untuk alur `scanner -> analyzer -> compiler -> engine`.

## Stream 2: Strengthen Existing Features
### Typing and Contracts
- [ ] Perketat type contract pada `scanner`.
- [ ] Perketat type contract pada `analyzer`.
- [ ] Perketat type contract pada `compiler`.
- [ ] Perketat type contract pada `engine`.
- [ ] Kurangi jalur `implicit any` dan fallback type yang terlalu longgar.

### Stability and Fallbacks
- [x] Perkuat native binding resolution agar fallback behavior konsisten.
- [ ] Perkuat worker/bootstrap path agar artifact release aman.
- [ ] Pastikan adapter tidak bergantung pada internal package file lintas workspace.
- [ ] Pastikan package publish tidak bocor `src/`, fixture manifest, atau eksperimen.

### Diagnostics and Observability
- [x] Perkuat output `trace`.
- [x] Perkuat output `why`.
- [x] Perkuat surface `doctor`.
- [x] Perluas metrik yang bisa dipakai oleh `dashboard`.
- [ ] Perluas trace/inspection yang bisa dipakai oleh `devtools`.

### Tests and Regression Safety
- [ ] Tambahkan compatibility assertions untuk export root dan subpath.
- [ ] Tambahkan smoke test adapter untuk `vite`.
- [ ] Tambahkan smoke test adapter untuk `next`.
- [ ] Tambahkan smoke test adapter untuk `rspack`.
- [ ] Tambahkan artifact assertions untuk package publish utama.

## Stream 3: Add New Features
### Engine Facade Expansion
- [ ] Tambahkan atau stabilkan facade `scanWorkspace`.
- [ ] Tambahkan atau stabilkan facade `analyzeWorkspace`.
- [ ] Tambahkan atau stabilkan facade `build`.
- [ ] Tambahkan atau stabilkan facade `generateSafelist`.

### Tooling Additions
- [x] Tambahkan mode `doctor` yang lebih kaya untuk CLI.
- [ ] Tambahkan mode `trace` yang reusable untuk CLI, devtools, dan dashboard.
- [x] Tambahkan mode `why` untuk menjelaskan hasil transform/scan/build.
- [ ] Tambahkan helper codegen bila memang relevan dan tidak memperlebar coupling.

### Plugin and Preset Growth
- [ ] Pertahankan `plugin` sebagai wrapper kompatibel di atas `plugin-api`.
- [ ] Tambahkan validasi manifest/plugin registration yang lebih aman.
- [ ] Siapkan template atau starter untuk plugin baru.
- [ ] Siapkan jalur ekspansi preset tanpa memaksa perubahan compiler besar.

### Desktop and Tool Surfaces
- [ ] Pertahankan `studio-desktop` sebagai UI operator/offline tool.
- [ ] Tambahkan surface inspection yang konsisten dengan CLI/devtools.
- [ ] Pastikan desktop tetap buildable dan packaging tetap lolos.

## Stream 4: Delivery Hardening
### Build and Check
- [ ] Semua workspace punya script minimal: `build`, `test`, `check`, `clean`, `pack:check`.
- [x] `turbo` graph tetap memaksa dependency build order yang benar.
- [x] Boundary rules tetap mencegah coupling lama muncul kembali.

### Packaging
- [x] Jalankan `pack:check` untuk workspace publik utama.
- [ ] Verifikasi artifact root umbrella tetap tipis dan wrapper-only.
- [ ] Verifikasi package private tidak memaksakan kebijakan publish package publik.

### Release Readiness
- [ ] Siapkan canary-friendly validation untuk workspace penting.
- [ ] Pastikan umbrella package tetap bisa dirilis setelah workspace publish check lolos.

## Recommended Execution Order
1. Preserve compatibility shell.
2. Strengthen typing, tests, and fallback behavior.
3. Strengthen diagnostics and observability.
4. Add new facade/tooling capabilities.
5. Harden packaging and release flow.

## Validation Commands
- [x] `npm.cmd run build`
- [x] `npm.cmd run check`
- [x] `npm.cmd test`
- [x] `npx.cmd turbo run pack:check --continue`

## Notes
- Checklist ini sengaja turunan langsung dari dokumen Mermaid yang sudah approved.
- Fokus utamanya bukan rewrite, tetapi additive restructuring dengan compatibility-first approach.
- Gate sudah diverifikasi hijau pada `2026-03-29`; residual warning `import.meta` di beberapa build CJS masih ada tetapi tidak memblokir `build/check/test/pack:check`.
- Production prototype observability yang sudah diverifikasi pada `2026-03-29`: `tw doctor --cwd <path> --include workspace,tailwind,analysis`, `tw trace --target <path>`, `tw why <class>`, engine `.tw-cache/metrics.json`, dan dashboard endpoint `/summary` + `/health`.
- Item `trace` reusable lintas `cli/devtools/dashboard` tetap terbuka sampai surface bersama tidak lagi berhenti di CLI API export saja.
