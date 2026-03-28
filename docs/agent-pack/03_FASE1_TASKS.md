# FASE 1 — Core Engine

## Task 1.1 Parser v4
Implement parser yang mendukung:
- opacity modifier (`/50`)
- arbitrary value (`bg-(--token)`)
- multi variants (`dark:hover:...`)

## Task 1.2 Theme reader (CSS-first)
Implement `@theme` extractor:
- parse CSS variables
- kategori token (color/spacing/font/...)
- resolve nested `var(--x)`

## Task 1.3 Merge layer
Integrasikan `tailwind-merge` untuk konflik utility.

## Task 1.4 Styled API
Pastikan styled API mendukung:
- base
- variants
- defaultVariants
- compoundVariants
- className override

## Task 1.5 Benchmark
Benchmark parser + merger untuk ukuran input kecil/sedang/besar.

**Exit criteria Fase 1:**
- unit tests core lulus
- parser v4 behavior tervalidasi
- benchmark report tersedia
