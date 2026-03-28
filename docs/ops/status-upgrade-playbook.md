# Status Upgrade Playbook (Semua Sekaligus)

Dokumen ini memetakan eksekusi paralel untuk menaikkan status fitur secara serempak:
**Prototipe → Buildable → Production-ready → Released**.

## 1) Inventaris status saat ini + target

| Status Saat Ini | Fitur | Target Status | Track |
| --- | --- | --- | --- |
| Prototipe | v4.5 Studio Desktop, AI Assistant, Token Sync | Buildable | A |
| Prototipe | Command Oxc v4.6–v4.8 (`parse`, `transform`, `minify`, `lint`, `format`, `lsp`, `benchmark`) | Buildable | A |
| Buildable | v4.2 Plugin Registry, Dashboard, Testing Utilities | Production-ready | B |
| Production-ready | Core Engine (scanner, CLI), Rust parser + fallback, v4.3 Unified CLI | Released | C |

## 2) Gate wajib per track

### Track A — Prototipe → Buildable
- Build matrix hijau: Linux/macOS/Windows + Node 18/20/22.
- Smoke test command utama:
  - `tw parse`, `tw transform`, `tw minify`, `tw lint`, `tw format`, `tw lsp`, `tw benchmark`.
  - Studio: minimal `npm run tauri dev` tidak crash.
  - AI Assistant: `tw ai "test"` menghasilkan output.
  - Token Sync: `tw sync init` + `tw sync pull` tidak error.
- Fallback path tanpa native dependency tervalidasi:
  - Oxc command tetap berjalan dengan fallback JS.
  - Studio tanpa Rust toolchain memberi pesan informatif.
- Dokumentasi `known limitations` per fitur.

### Track B — Buildable → Production-ready
- Integration test untuk alur utama + edge-case prioritas:
  - Registry: `tw plugin search`, `tw plugin install`, `tw plugin list`.
  - Dashboard: mode dev dapat diakses + endpoint metrics merespons.
  - Testing Utilities: contoh Vitest/Jest berjalan.
- Error handling standar: penyebab, dampak, langkah perbaikan.
- Observability dasar: durasi command, error count, memory trend.
- SLO internal awal:
  - p95 runtime < 500ms untuk command CLI.
  - Error rate < 1% dalam 100 eksekusi.

### Track C — Production-ready → Released
- Release candidate (`rc`) + changelog terperinci.
- Verifikasi instalasi di environment bersih (`npm install -g`, `npm create`).
- Post-release smoke test pada contoh resmi (Next.js, Vite).
- Rollback plan terdokumentasi (pakai tag npm sebelumnya).

## 3) Timeline 2 sprint (4 minggu)

### Sprint 1 (Minggu 1–2)

| Minggu | Track A (Prototipe → Buildable) | Track B (Buildable → Production-ready) | Track C (Production-ready → Released) |
| --- | --- | --- | --- |
| 1 | Setup CI matrix + smoke test 3 fitur pertama | Analisis kode + desain integration test prioritas | - |
| 2 | Selesaikan smoke test semua fitur, fallback path, docs limitations | Mulai integration test untuk 1 fitur | - |

**Deliverable Sprint 1:** seluruh Track A mencapai baseline **Buildable**.

### Sprint 2 (Minggu 3–4)

| Minggu | Track A | Track B | Track C |
| --- | --- | --- | --- |
| 3 | - | Selesaikan integration tests + error handling + observability | Siapkan changelog + rilis canary/rc |
| 4 | - | Verifikasi SLO + dokumentasi final | Rilis stable + post-release smoke test |

**Deliverable Sprint 2:**
- Track B naik ke **Production-ready**.
- Track C menjadi **Released**.

## 4) Dashboard kemajuan gabungan — Status Aktual v4.2.0 (2026-03-16)

| Track | Fitur | Build Matrix | Smoke | Fallback | Docs | Integration | Error Handling | Observability | SLO | Status Akhir |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | Oxc parse (v4.6) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Production |
| A | Studio (v4.5) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Production |
| A | AI Assistant (v4.5) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Production |
| A | Token Sync (v4.5) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Production |
| A | Figma Sync | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | ✅ Production |
| A | tw preflight (v4.4) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | ✅ Production |
| B | Plugin Registry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Production |
| B | Dashboard (live) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Production |
| B | Testing Utilities | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Production |
| B | Vue Adapter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | ✅ Production |
| B | Svelte Adapter | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | ✅ Production |
| B | @tailwind-styled/shared | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - | ✅ Production |
| C | Core Engine | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Released |
| C | Rust parser | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Released |
| C | Unified CLI (v4.3) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Released |
| D | Studio Desktop | ✅ | ✅ | ✅ | ✅ | - | - | - | - | ✅ Production (Sprint 6) |

## 5) Contoh checklist siap pakai

### `tw parse` (Track A)
- [ ] CI matrix Linux/macOS/Windows + Node 18/20/22 lulus.
- [ ] `tw parse src/test.tsx` menghasilkan output tanpa crash.
- [ ] Setelah dependency Oxc dilepas, fallback JS tetap jalan.
- [ ] Docs limitation ditambahkan (contoh: file besar >1MB bisa lebih lambat).

### Plugin Registry (Track B)
- [ ] `tw plugin search react` mengembalikan hasil non-kosong.
- [ ] `tw plugin install @tailwind-styled/plugin-animation` sukses.
- [ ] `tw plugin list` menampilkan plugin terpasang.
- [ ] Error plugin tidak ditemukan memberi saran tindakan.
- [ ] Logging durasi command aktif lewat flag debug.

## 6) Tata kelola eksekusi
1. Tetapkan PIC per track (A/B/C).
2. Buat issue per checklist item dan tautkan ke board sprint.
3. Promote status hanya jika seluruh gate track terpenuhi.


## 7) Bootstrap Sprint 1 (Infrastructure & Issue Setup)
- Buat milestone GitHub: **Sprint 1: Upgrade Status Q2 2025** (deadline 2 minggu).
- Buat label: `status/prototipe`, `status/buildable`, `status/production`, `track/A`, `track/B`, `track/C`.
- Buat issue per fitur Track A memakai template `docs/ops/sprint1-issue-template.md`.
- Siapkan dashboard harian: `docs/status-dashboard.md`.
- Jalankan kickoff praktis via `docs/ops/sprint1-launch-checklist.md` dan `docs/ops/sprint1-execution-board.md`.
- Eksekusi harian mengacu `docs/roadmap/sprint1-execution-kickoff.md`.
