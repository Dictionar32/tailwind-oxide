# FASE 8 — Compatibility Matrix & Hardening

## Tujuan
Memastikan kompatibilitas lintas environment utama sebelum release candidate.

## Task 8.1 CI compatibility matrix
- Tambah workflow matrix untuk Node 18 dan Node 20.
- Jalankan build + test inti.
- Simpan artefak summary per matrix run.

## Task 8.2 Adapter sanity checks
- Jalankan smoke build untuk package penting: compiler, scanner, engine, vite, cli.
- Tandai failure lebih awal sebelum release branch.

## Exit criteria Fase 8
- Workflow matrix berjalan otomatis pada push/PR.
- Tersedia summary artifact untuk audit hasil.
