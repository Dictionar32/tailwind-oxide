# Roadmap Flowchart Implementation Questionnaire

Daftar pertanyaan ini dipakai agar implementasi fitur selalu jelas, terukur, dan bisa langsung dipetakan ke flowchart + milestone.

## 1) Scope dan target pengguna

1. Fitur ini untuk siapa duluan? (core maintainer / pengguna aplikasi / plugin author)
2. Output utama apa? (API, CLI command, plugin bundler, dashboard)
3. Definition of Done-nya apa? (contoh: build < 1s di 1k file, API stabil, dokumen migrasi tersedia)

## 2) Integrasi arsitektur (Scanner / Engine / Shared)

1. Fitur masuk layer mana? (scanner, engine, shared, adapter)
2. Input dan output data kontraknya seperti apa? (JSON schema, TypeScript type)
3. Fallback behavior jika komponen native gagal apa? (fallback JS/manual)

## 3) Kinerja dan reliabilitas

1. Target latency build dan incremental berapa? (ms)
2. Batasan ukuran proyek (jumlah file) yang wajib lolos benchmark?
3. Error policy: fail-fast atau soft-fail dengan warning?

## 4) Kompatibilitas Tailwind v4

1. Fitur wajib mendukung CSS-first (`@theme`, `@utility`) sejauh mana?
2. Perlu dukung mode PostCSS dan Vite plugin sekaligus?
3. Perlu mode kompatibilitas legacy config (`tailwind.config.*`) atau tidak?

## 5) Prioritas roadmap

1. Fitur ini masuk fase berapa? (A/B/C)
2. Dependensi internal apa yang harus selesai dulu?
3. Risiko terbesar apa dan mitigasinya?

## 6) UX & DX

1. Bagaimana pengguna mengaktifkan fitur? (default on/off, flag)
2. Logging level apa yang dibutuhkan? (silent/info/debug)
3. Perlu telemetry opt-in untuk profiling?

## 7) Validasi

1. Test minimal apa yang wajib ada? (unit/integration/e2e)
2. Command validasi utama apa yang harus selalu lulus?
3. Artefak bukti apa yang perlu disimpan? (report JSON/screenshot)
