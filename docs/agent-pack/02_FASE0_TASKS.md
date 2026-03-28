# FASE 0 — Foundation

## Task 0.1 Analisis breaking changes
- Petakan semua file yang terdampak Tailwind v4.
- Prioritaskan:
  - parser class (`bg-blue-500/50`, `bg-(--x)`, variant chaining)
  - config move (`tailwind.config.*` vs `@theme`)
  - utility rename (`flex-grow -> grow`, dll)

**Output wajib:**
- file impact list
- prioritas High/Medium/Low
- proposal urutan implementasi

## Task 0.2 Struktur workspace
Pastikan struktur package mendukung:
- core
- scanner
- engine
- plugin-vite
- plugin-postcss
- plugin-rspack
- cli
- shared

## Task 0.3 Baseline testing
Buat baseline tests untuk:
- parser
- merge
- styled API

## Task 0.4 API snapshot
Dokumentasikan API existing sebagai baseline sebelum perubahan besar.

**Exit criteria Fase 0:**
- ada baseline test
- ada daftar gap kompatibilitas
- ada urutan eksekusi fase berikutnya
