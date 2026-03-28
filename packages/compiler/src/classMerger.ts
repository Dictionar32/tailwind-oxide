/**
 * tailwind-styled-v4 — classMerger
 *
 * FIX #05: Ganti custom UTILITY_GROUPS resolver dengan twMerge.
 *
 * WHY: Custom regex resolver memiliki banyak edge case yang salah
 * (ring-, text- grouping, dll). tailwind-merge sudah jadi dependency,
 * lebih akurat, dan di-maintain oleh komunitas Tailwind.
 *
 * RESULT: Output compile-time dan runtime kini identik — tidak ada
 * behavior perbedaan antara dev mode dan production build.
 */

import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind classes statically at compile time.
 * Menggunakan tailwind-merge untuk conflict resolution yang akurat.
 *
 * FIX #05: Sebelumnya pakai custom UTILITY_GROUPS regex yang tidak
 * kompatibel dengan tailwind-merge runtime. Sekarang keduanya identik.
 *
 * @example
 * mergeClassesStatic("p-4 p-2 bg-red-500 bg-blue-500")
 * → "p-2 bg-blue-500"
 *
 * mergeClassesStatic("ring-2 ring-4")
 * → "ring-4"  ✓ (custom resolver dulu return "ring-2 ring-4" — salah!)
 */
export function mergeClassesStatic(classes: string): string {
  return twMerge(classes)
}

/**
 * Normalize raw class string — trim, dedupe whitespace, join lines.
 */
export function normalizeClasses(raw: string): string {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}
