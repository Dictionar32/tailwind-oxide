# FASE 6 — Stabilization & QA Automation

## Tujuan
Membuat validasi rilis bisa dijalankan otomatis dan menghasilkan artefak JSON yang konsisten.

## Task 6.1 Final validation runner
- Tambah script otomatis yang menjalankan:
  - test core
  - build compiler/scanner/engine/vite/cli
  - benchmark native parser
  - smoke test CLI
- Simpan hasil ke `artifacts/validation-report.json`.

## Task 6.2 Release gate
- Gunakan hasil report sebagai release gate (pass/fail summary).
- Jika ada check gagal, script exit code non-zero.

## Exit criteria Fase 6
- `npm run validate:final` menghasilkan report JSON.
- Report berisi summary passed/failed + benchmark parsing.
