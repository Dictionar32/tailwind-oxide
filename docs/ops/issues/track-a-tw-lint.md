## Judul: [Track A] Upgrade `tw lint` dari Prototipe ke Buildable

### Gate Checklist
- [x] Build matrix hijau (Linux/macOS/Windows + Node 18/20/22)
- [x] Smoke test: `tw lint packages/cli/src 2` berjalan tanpa error
- [x] Fallback path: jalankan `test:smoke:fallback` dengan `TWS_DISABLE_NATIVE=1`
- [x] Dokumentasi:  ✅ Sprint 1

### Detail Teknis
- Lokasi implementasi command: `packages/cli/src/index.ts` (dispatch) + `scripts/v48/lint-parallel.mjs`
- Dependensi: Oxc-native lint path (opsional), fallback lint path sesuai script v48
- Cara test:
  - `npm run build`
  - `npm run test:smoke`
  - `npm run test:smoke:fallback`

### Assignee
- @nama

### Label
- `status/prototipe`
- `status/buildable`
- `track/A`
