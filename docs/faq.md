# FAQ

## Apakah semua fitur roadmap sudah selesai?
Sebagian besar sudah. Per v4.2.0, hampir semua item Sprint 1–5 sudah Production-ready. Yang tersisa (Sprint 7+): RSC auto-inject route CSS, dynamic route splitting, Figma push (Enterprise plan), plugin marketplace, docs bilingual ID/EN. Lihat `docs/status-dashboard.md` untuk status lengkap.

## Kenapa ada lockfile berubah?
Karena ada perubahan dependency workspace agar package baru (scanner/engine/vite integration/cli) bisa di-resolve konsisten.

## Apakah wajib pakai Rust parser?
Tidak. Itu fase optimasi lanjutan (opsional). Default tetap JS path dengan fallback aman.

## Apa yang harus ditingkatkan agar bisa digunakan semua orang?
Agar adopsi lebih luas (pemula sampai tim enterprise), prioritas peningkatan yang paling berdampak adalah:

1. **Onboarding 5 menit (copy-paste ready)**
   - Sediakan 1 jalur cepat per ekosistem: Next.js, Vite, Rspack.
   - Setiap jalur wajib punya langkah install, config minimum, dan contoh komponen pertama.

2. **Reliability lintas environment**
   - Uji resmi di Node 18/20/22 pada Linux/macOS/Windows.
   - Tambahkan preflight check di CLI untuk mendeteksi dependency belum terpasang (mis. plugin bundler), lalu tampilkan saran perbaikan yang jelas.

3. **Error message yang manusiawi**
   - Semua error umum harus punya:
     - penyebab,
     - dampak,
     - langkah perbaikan 1–2 baris,
     - tautan ke halaman docs terkait.

4. **Dokumentasi berbahasa ganda (ID + EN)**
   - Minimal untuk halaman: getting started, migrasi, troubleshooting, dan CLI.
   - Ini penting agar bisa dipakai tim global, komunitas lokal, dan pembelajar baru.

5. **Aksesibilitas default komponen contoh**
   - Semua snippet contoh menyertakan praktik a11y dasar (`aria-*`, focus state, semantic HTML).
   - Tambahkan checklist a11y di docs supaya developer tidak perlu menebak.

6. **Stabilitas migrasi dari versi lama**
   - Perluas aturan `migrate --dry-run` dan berikan ringkasan perubahan yang mudah dipahami.
   - Sediakan “known limitations” secara eksplisit agar ekspektasi tim realistis sebelum migrasi.

7. **Template starter resmi**
   - Publish starter repo per stack (next/vite/rspack) dengan CI hijau.
   - Pengguna bisa langsung `degit`/`create` lalu jalan tanpa setup manual panjang.

Jika tujuh area ini konsisten ditingkatkan, paket akan lebih mudah dipakai oleh pemula, tim produk kecil, maupun organisasi besar.

## Apa beda status Prototipe, Buildable, DONE/Production-ready, dan Released?
Gunakan definisi ini untuk membaca progres fitur secara konsisten:

| Status | Arti | Kode jalan? | Production-ready? | Contoh di proyek |
| --- | --- | --- | --- | --- |
| **Prototipe** | Implementasi awal; fitur inti sudah bisa dicoba, tapi masih eksperimental dan perlu validasi lanjutan. | ✅ Ya | ❌ Belum | — (tidak ada fitur di status ini) |
| **Buildable** | Kode bisa dikompilasi dan paket bisa dipasang, tetapi stabilitas/operasional belum final. | ✅ Ya | ⚠️ Mungkin (butuh pengujian) | — (tidak ada fitur di status ini) |
| **DONE / Production-ready** | Fitur stabil, tervalidasi baik, dan siap dipakai di lingkungan produksi. | ✅ Ya | ✅ Ya | Core Engine, scanner, CLI, Vue/Svelte adapters, Oxide pipeline (v4.6–v4.9), dashboard, testing, studio, AI, sync |
| **RELEASED** | Sudah dipublikasikan ke npm dan tersedia untuk adopsi publik. | ✅ Ya | ✅ Ya (sesuai scope rilis) | Paket yang sudah dipublish di kanal rilis |

Ringkasnya:
- **Prototipe**: bisa diuji, masih kasar.
- **Buildable**: bisa dibangun/diinstall, perlu hardening.
- **DONE/Production-ready**: stabil dan aman untuk produksi.
- **Released**: sudah terbit secara publik.

## Aku mau semua sekaligus: apa rencana eksekusinya?
Bisa. Gunakan pendekatan **parallel track** agar peningkatan status berjalan serempak tapi tetap terukur:

### Track A — Prototipe ➜ Buildable
Target fitur: v4.5 (Studio Desktop, AI Assistant, Token Sync) + command Oxc v4.6–v4.8.

Checklist minimum:
- Build matrix CI hijau: Node 18/20/22 pada Linux/macOS/Windows.
- Smoke test command utama: `parse`, `transform`, `minify`, `lint`, `format`, `lsp`, `benchmark`.
- Fallback path wajib lolos tanpa dependency native.
- Dokumentasi `known limitations` per command.

### Track B — Buildable ➜ DONE/Production-ready
Target fitur: v4.2 Plugin Registry, Dashboard, Testing Utilities.

Checklist minimum:
- Integration test untuk alur utama pengguna (happy path + edge case).
- Error handling standar (sebab, dampak, langkah perbaikan).
- Telemetri/observability dasar (durasi, error count, memory trend).
- SLO internal: p95 runtime, error rate, dan reliability threshold.

### Track C — DONE ➜ Released
Target fitur yang sudah production-ready.

Checklist minimum:
- Rilis bertahap (canary/rc ➜ stable) + changelog jelas.
- Verifikasi instalasi paket setelah publish.
- Post-release smoke test pada contoh proyek resmi.

### Urutan kerja 2 sprint (praktis)
1. Sprint 1: kunci Track A (semua prototipe menjadi buildable baseline).
2. Sprint 2: hardening Track B + rilis kandidat untuk Track C.

Dengan pola ini, tim bisa mendorong semua status sekaligus tanpa kehilangan kontrol kualitas.
Referensi checklist detail: `docs/ops/status-upgrade-playbook.md`.

## Apakah status "missing: 0" berarti semua roadmap selesai 100%?
Tidak.

`missing: 0` pada `validate:pr5:gaps` hanya berarti daftar checklist audit PR5 saat ini sudah terpenuhi. Itu **bukan** indikator bahwa seluruh roadmap multi-fase sudah selesai.

Contoh item yang masih bisa berada di backlog roadmap meskipun gap-check sudah hijau:
- hardening watch mode untuk edge-case skala besar,
- strategi invalidasi + observability metric,
- pengayaan ekosistem plugin/analyzer,
- inisiatif milestone lanjutan (mis. tooling/editor integration).

Jadi, baca status dengan urutan berikut:
1. Gate kualitas saat ini (`validate:final`, `health:summary`, `validate:pr5:gaps`).
2. Status milestone roadmap jangka menengah/panjang.
