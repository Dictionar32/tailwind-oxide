# Sprint 1 Launch Checklist (Eksekusi)

Dokumen ini dipakai untuk **menjalankan pembuatan Sprint 1** secara operasional, bukan sekadar perencanaan.

## 1) Setup manajemen sprint
- [ ] Buat milestone: **Sprint 1: Upgrade Status Q2 2025** (durasi 2 minggu).
- [ ] Tetapkan PIC per track:
  - [ ] Track A (Prototipe → Buildable)
  - [ ] Track B (Buildable → Production-ready)
  - [ ] Track C (Production-ready → Released)
- [ ] Buat label GitHub:
  - [ ] `status/prototipe`
  - [ ] `status/buildable`
  - [ ] `status/production`
  - [ ] `track/A`
  - [ ] `track/B`
  - [ ] `track/C`

## 2) Seed issue Sprint 1 (Track A prioritas)
Gunakan file issue siap tempel berikut:
- [ ] `docs/ops/issues/track-a-tw-parse.md`
- [ ] `docs/ops/issues/track-a-tw-transform.md`
- [ ] `docs/ops/issues/track-a-tw-lint.md`

Issue tambahan bisa dibuat dari template umum:
- [ ] `docs/ops/sprint1-issue-template.md`

## 3) Baseline verifikasi teknis
- [ ] Jalankan: `npm run build`
- [ ] Jalankan: `npm run test:smoke`
- [ ] Jalankan: `npm run test:smoke:fallback`
- [ ] Pastikan workflow CI matrix aktif: `.github/workflows/build-matrix.yml`

## 4) Ritme eksekusi harian
- [ ] Standup harian pakai: `docs/ops/daily-standup-template.md`
- [ ] Update dashboard harian: `docs/status-dashboard.md`
- [ ] Mid-week checkpoint: review blocker lintas track
- [ ] End-of-week review: promote status hanya jika semua gate ✅

## 5) Definisi DONE Sprint 1
Sprint 1 dianggap selesai jika:
- [ ] Tiga fitur prioritas Track A punya issue aktif + owner.
- [ ] Dashboard terupdate harian minimal 5 hari kerja.
- [ ] Minimal 1 fitur Track A memenuhi semua gate termasuk Docs.
- [ ] Track B punya minimal 1 pilot integration-test issue aktif.
