# FASE 9 — Release Candidate Gate & Observability

## Tujuan
Membuat gate otomatis untuk RC release dan health report yang mudah dibaca maintainer.

## Task 9.1 Release gate workflow
- Tambah workflow manual (`workflow_dispatch`) untuk RC gate.
- Jalankan `validate:final`.
- Upload `artifacts/validation-report.json`.
- Gagal jika ada check gagal.

## Task 9.2 Health summary script
- Generate ringkasan health dari validation report.
- Simpan sebagai `artifacts/health-summary.json`.
- Tampilkan status PASS/FAIL + metrik utama.

## Exit criteria Fase 9
- Maintainer bisa menjalankan RC gate sekali klik.
- Tersedia health summary artifact untuk keputusan rilis.
