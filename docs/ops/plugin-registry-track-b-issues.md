# Plugin Registry (Track B) — Issue Templates Siap Salin

Dokumen ini berisi template issue markdown berdasarkan rencana 7 issue berurutan untuk menaikkan `packages/plugin-registry` dari **Buildable** ke **Production-ready**.

---

## Issue 1 — Integration tests for search, list, and install commands

```md
## [Track B] Add integration tests for plugin registry commands

### Summary
Tambahkan integration test untuk command utama Plugin Registry agar perilaku CLI stabil dan punya regression safety net.

### Acceptance Criteria
- [ ] Buat folder `__tests__` di `packages/plugin-registry/` dan setup runner (`node:test` atau `vitest`).
- [ ] Test `tw-plugin search <keyword>`: output mengandung hasil dari `registry.json`.
- [ ] Test `tw-plugin list`: output daftar plugin dari registry.
- [ ] Test `tw-plugin install <plugin> --dry-run` (tanpa install nyata).
- [ ] Test failure path:
  - [ ] command tanpa argumen wajib,
  - [ ] plugin tidak dikenal,
  - [ ] simulasi install failure.
- [ ] Verifikasi exit code: `0` sukses, non-zero untuk error.
- [ ] Tambahkan workflow `.github/workflows/plugin-registry-test.yml` (Linux/macOS/Windows + Node 18/20/22).
- [ ] Tambahkan cara menjalankan test di `CONTRIBUTING.md`.

### Target Files
- `packages/plugin-registry/__tests__/...`
- `packages/plugin-registry/package.json`
- `.github/workflows/plugin-registry-test.yml`
- `CONTRIBUTING.md`
```

---

## Issue 2 — Improve error handling with validation and actionable messages

```md
## [Track B] Enhance error handling for plugin registry

### Summary
Standarisasi error handling sebelum install plugin serta pesan error yang actionable untuk developer.

### Acceptance Criteria
- [ ] Validasi plugin ada di `registry.json` sebelum `npm install`.
- [ ] Jika tidak ditemukan, tampilkan pesan:
      `Plugin '<name>' tidak ditemukan di registry. Coba: tw-plugin search <keyword>`.
- [ ] Standarisasi error object: `code`, `message`, `context`.
- [ ] Error CLI tampil dengan format konsisten (warna merah jika output TTY).
- [ ] Tambahkan opsi `--allow-external` untuk plugin di luar registry.
- [ ] Untuk external plugin, tampilkan peringatan eksplisit sebelum install.
- [ ] Perbarui help text + contoh command.

### Target Files
- `packages/plugin-registry/src/index.ts`
- `packages/plugin-registry/src/cli.ts`
- `docs/plugin-registry.md` (jika sudah ada)
```

---

## Issue 3 — Add basic observability (`--debug` flag)

```md
## [Track B] Add --debug flag for timing and command tracing

### Summary
Tambah observability dasar untuk troubleshooting command Plugin Registry.

### Acceptance Criteria
- [ ] Tambahkan opsi `--debug` pada semua subcommand.
- [ ] Cetak timing tiap langkah utama (load registry, resolve command, exec install).
- [ ] Cetak command path yang dieksekusi (contoh `/usr/bin/npm install ...`).
- [ ] Jika env `TWS_LOG_FILE` ada, append log ke file tersebut.
- [ ] Semua debug output ke `stderr` agar `stdout` tetap bersih.

### Target Files
- `packages/plugin-registry/src/cli.ts`
- `packages/plugin-registry/src/index.ts`
- `packages/plugin-registry/__tests__/...`
```

---

## Issue 4 — Define and enforce SLO (performance & reliability)

```md
## [Track B] Implement SLO checks for plugin registry commands

### Summary
Tetapkan baseline performa/reliability dan jalankan secara rutin pada CI.

### Acceptance Criteria
- [ ] Definisikan benchmark p95 `< 500ms` untuk `search` dan `list` (lokal, tanpa network).
- [ ] Definisikan error rate `< 1%` untuk 100 eksekusi batch test.
- [ ] Tambahkan folder `benchmark/` + script pengukuran.
- [ ] Tambahkan workflow `.github/workflows/plugin-registry-benchmark.yml`.
- [ ] Jika threshold terlampaui, CI beri warning + artifact laporan (tidak hard-fail).

### Target Files
- `packages/plugin-registry/benchmark/...`
- `.github/workflows/plugin-registry-benchmark.yml`
- `docs/ops/status-upgrade-playbook.md` (opsional status update)
```

---

## Issue 5 — Security hardening for plugin installation

```md
## [Track B] Add security checks for plugin installation

### Summary
Harden jalur install agar default aman untuk penggunaan luas.

### Acceptance Criteria
- [ ] Default install dibatasi ke plugin yang ada di `registry.json`.
- [ ] Install eksternal wajib `--allow-external`.
- [ ] Validasi nama plugin regex:
      `^(@[a-z0-9-]+/)?[a-z0-9-]+$`.
- [ ] Tambahkan opsi `--allowlist` untuk daftar plugin eksternal yang diizinkan.
- [ ] Update dokumen kebijakan keamanan plugin install.

### Target Files
- `packages/plugin-registry/src/index.ts`
- `packages/plugin-registry/src/cli.ts`
- `docs/plugin-registry.md`
```

---

## Issue 6 — Structured output (`--json`) and `info` subcommand

```md
## [Track B] Add JSON output and info command for better DX

### Summary
Tingkatkan DX agar command mudah diintegrasikan ke script/tooling lain.

### Acceptance Criteria
- [ ] Tambahkan opsi `--json` untuk `search`, `list`, `info`.
- [ ] Tambahkan subcommand `info <plugin>`.
- [ ] Detail `info`: versi, deskripsi, tags, official/community.
- [ ] Output default tetap human-readable.
- [ ] Output `--json` valid JSON dan stabil skemanya.
- [ ] Help text diperbarui dengan contoh `--json` + `info`.

### Target Files
- `packages/plugin-registry/src/cli.ts`
- `packages/plugin-registry/src/index.ts`
- `packages/plugin-registry/__tests__/...`
```

---

## Issue 7 — Operational docs and status updates

```md
## [Track B] Finalize documentation and update project status

### Summary
Finalisasi dokumentasi operasional dan sinkronkan status roadmap setelah seluruh gate terpenuhi.

### Acceptance Criteria
- [ ] Buat `docs/plugin-registry.md` (usage, examples, options).
- [ ] Tambahkan known limitations + troubleshooting.
- [ ] Update `docs/roadmap/v4.2-backlog.md` status Plugin Registry jadi production-ready.
- [ ] Update `docs/status-dashboard.md` dengan status gate terbaru.
- [ ] Update `CHANGELOG.md`.

### Target Files
- `docs/plugin-registry.md`
- `docs/roadmap/v4.2-backlog.md`
- `docs/status-dashboard.md`
- `CHANGELOG.md`
```

---

## Urutan PR yang direkomendasikan

1. PR #1 — Issue 1 (integration tests)
2. PR #2 — Issue 2 (error handling)
3. PR #3 — Issue 3 (debug observability)
4. PR #4 — Issue 5 (security hardening)
5. PR #5 — Issue 6 (JSON + info)
6. PR #6 — Issue 4 (SLO benchmark gate)
7. PR #7 — Issue 7 (documentation & status)

Catatan: smoke test dan lint tetap wajib di setiap PR.
