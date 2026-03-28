# tw registry & tw deploy — Known Limitations

## tw registry serve

### 1. Tarball support ✅ Sprint 7 done
- `registry-tarball.mjs` — pack via `npm pack`, upload base64, store di `tarballs/`
- `tw registry publish` + `tw install <pkg>`
- **Catatan**: npm-compatible protocol (npm install --registry=URL) — Sprint 10

### 2. Version history ✅ Sprint 7 done
- `registry.mjs` menyimpan version history di `.versions.json`
- `GET /packages/:name/versions` endpoint tersedia
- **Catatan**: Overwrite versi yang sama masih bisa — deduplikasi Sprint 10

### 3. Port harus dibuka manual, tidak ada systemd/launchd service
- **Status**: By design untuk local/team use
- **Workaround**: Gunakan `pm2 start scripts/v45/registry.mjs` untuk persistent

### 4. HTTPS tidak didukung (plain HTTP)
- **Status**: By design untuk local dev
- **Workaround**: Taruh di balik nginx/Caddy dengan TLS untuk production

## tw deploy

### 1. Remote publish hanya ke tw registry (bukan npmjs.com)
- **Status**: By design — `tw deploy --registry=URL` untuk custom registry
- **Workaround**: Gunakan `npm publish` untuk publish ke npmjs.com

### 2. Tidak ada rollback
- **Status**: Known
- **Workaround**: Simpan `.tw-cache/deploy-manifest.json` sebelum re-publish
