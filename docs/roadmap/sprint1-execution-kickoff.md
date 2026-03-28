# Sprint 1 Execution Kickoff (Roadmap-Driven)

Dokumen ini memulai eksekusi roadmap dengan langkah kerja konkret untuk Sprint 1 (2 minggu), fokus Track A, sambil menyiapkan Track B.

## Scope Sprint 1

### Track A — Prototipe → Buildable
Prioritas minggu ini:
1. `tw parse`
2. `tw transform`
3. `tw lint`

Gate wajib per fitur:
- Build matrix hijau (Linux/macOS/Windows + Node 18/20/22)
- Smoke test lulus
- Fallback test lulus (non-native)
- Known limitations terdokumentasi

### Track B — Buildable → Production-ready (pilot)
- Pilot: Plugin Registry integration-test skeleton
- Target sprint: issue aktif + test plan siap dieksekusi Sprint 2

## Rencana Eksekusi Minggu 1

| Hari | Fokus | Output |
| --- | --- | --- |
| Senin | Kickoff + assignment owner | PIC per fitur, issue aktif |
| Selasa | Validasi gate teknis `tw parse` | Build/Smoke/Fallback evidence |
| Rabu | Validasi gate teknis `tw transform` | Build/Smoke/Fallback evidence |
| Kamis | Validasi gate teknis `tw lint` | Build/Smoke/Fallback evidence |
| Jumat | Docs known limitations + weekly review | 3 fitur siap promote (jika docs ✅) |

## Artefak yang dipakai
- Launch checklist: `docs/ops/sprint1-launch-checklist.md`
- Execution board: `docs/ops/sprint1-execution-board.md`
- Dashboard harian: `docs/status-dashboard.md`
- Template issue: `docs/ops/sprint1-issue-template.md`
- Issue Track A siap pakai:
  - `docs/ops/issues/track-a-tw-parse.md`
  - `docs/ops/issues/track-a-tw-transform.md`
  - `docs/ops/issues/track-a-tw-lint.md`

## Command baseline (harian)
Jalankan minimal sekali per hari kerja:
- `npm run build`
- `npm run test:smoke`
- `npm run test:smoke:fallback`

## Exit Criteria Sprint 1
- Tiga fitur Track A memiliki owner + issue aktif.
- Tiga fitur Track A memenuhi Build/Smoke/Fallback `✅`.
- Minimal 1 fitur Track A mencapai docs `✅` dan bisa dipromosikan ke Buildable.
- Track B memiliki 1 pilot issue integration-test aktif.
