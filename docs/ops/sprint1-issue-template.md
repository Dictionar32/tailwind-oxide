## Judul: [Track A] Upgrade `<fitur>` dari Prototipe ke Buildable

### Gate Checklist
- [ ] Build matrix hijau (Linux/macOS/Windows + Node 18/20/22)
- [ ] Smoke test fitur berjalan tanpa error
- [ ] Fallback path tanpa dependency native tervalidasi
- [ ] Dokumentasi: tambahkan "Known limitations" di docs terkait

### Detail Teknis
- Lokasi kode: `<path>`
- Dependensi opsional: `<dependency/fallback>`
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
