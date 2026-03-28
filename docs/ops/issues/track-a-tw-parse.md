## Judul: [Track A] Upgrade `tw parse` dari Prototipe ke Buildable

### Gate Checklist
- [x] Build matrix hijau (Linux/macOS/Windows + Node 18/20/22)
- [x] Smoke test: `tw parse packages/scanner/src/index.ts` berjalan tanpa error
- [x] Fallback path: jalankan `test:smoke:fallback` dengan `TWS_DISABLE_NATIVE=1`
- [x] Dokumentasi:  ✅ Sprint 1

### Detail Teknis
- Lokasi implementasi command: `packages/cli/src/index.ts` (dispatch) + `scripts/v46/parse.mjs`
- Dependensi: Oxc parser (opsional), fallback parser sesuai script v46
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
