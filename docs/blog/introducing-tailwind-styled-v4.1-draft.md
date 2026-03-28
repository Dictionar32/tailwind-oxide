# Introducing tailwind-styled-v4.1: Faster Scanning, Clearer Ops, Better Onboarding

> Draft announcement for v4.1.0

## Why this release

v4.1.0 berfokus pada tiga hal:
1. **Performa dan stabilitas skala besar**.
2. **Contoh implementasi yang lebih realistis**.
3. **Dokumentasi kontribusi yang lebih jelas**.

## Highlights

### 1) Scale benchmark workflow makin jelas
- Namespace `ci:scale:*` diposisikan sebagai primary interface untuk automation.
- Namespace `bench:scale:*` tetap dipertahankan sebagai alias kompatibilitas.
- Alur download/compare/baseline kini terdokumentasi step-by-step.

### 2) Public benchmark in README
- README sekarang menyertakan ringkasan benchmark publik + command reproduksi.
- Tujuannya agar performa bisa diverifikasi tanpa akses tooling internal.

### 3) Existing Next.js frontend example
- Menggunakan frontend existing `examples/standar-config-next-js-app` untuk mencontohkan:
  - server component,
  - client component,
  - live token switching,
  - pola frontend app real-world sederhana.

### 4) Contributing guide lebih lengkap
- Setup, struktur package, workflow branch, validasi pre-PR, dan checklist review diperjelas.

## What’s next

- Menyelesaikan integrasi Rust parser default dengan fallback JS yang aman.
- Menambahkan asset video/GIF demo untuk alur CLI + live theme switch.
- Menutup data benchmark lintas OS/Node dari CI artifacts sebagai baseline publik final.

## Call for feedback

Jika Anda memakai tailwind-styled-v4 di project production, kami butuh feedback pada:
- waktu scan di codebase besar,
- pengalaman migrasi dari setup sebelumnya,
- kebutuhan tooling tambahan untuk DX.
