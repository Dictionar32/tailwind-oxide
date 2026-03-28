# tw cluster, tw metrics, tw sync figma — Known Limitations (v5.0)

## tw cluster

### 1. Remote build server ✅ Sprint 6 done
- `scripts/v50/cluster-server.mjs` — HTTP worker server
- `tw cluster build src/ --remote=http://host:7070 --token=secret`
- `tw cluster-server [--port=7070] [--workers=N] [--token=]`
- **Catatan**: gRPC protocol — Sprint 9+ planned

### 2. Work-stealing ✅ Sprint 7 done
- **Status**: Adaptive chunking via least-loaded-worker algorithm
- Files diurutkan berdasarkan ukuran, didistribusi ke worker dengan beban minimum
- `cluster.mjs` menggunakan `workerLoads` tracking

### 3. CSS Generation — cluster output Sprint 10+
- **Status**: Cluster scan melaporkan class count per file (tidak generate CSS langsung)
- **Impact**: `tw cluster build` perlu dilanjutkan dengan `tw split` untuk full CSS
- **Workaround**: `tw cluster build src/ && tw split src/ artifacts/route-css`
- **Sprint 10+**: Integrate CSS generation pipeline langsung ke cluster build

### 4. `cluster.mjs` require `--experimental-vm-modules` di Node < 22
- **Status**: Known
- **Workaround**: Gunakan Node.js 22+ atau tambahkan flag ke npm script

## tw metrics

### 1. Prometheus scraping memerlukan setup manual
- **Status**: Server berjalan tapi tidak ada Prometheus config template
- **Workaround**: Tambahkan ke `prometheus.yml`:
  ```yaml
  scrape_configs:
    - job_name: tailwind_styled
      static_configs:
        - targets: ['localhost:3030']
  ```

### 2. History tidak persisten — reset saat server restart
- **Status**: In-memory only
- **Impact**: History hilang bila metrics server restart
- **Fix done**: History sekarang ditulis ke `.tw-cache/metrics-history.jsonl` via `POST /metrics/push`

### 3. `/metrics/push` tidak ada autentikasi
- **Status**: By design untuk local dev
- **Impact**: Siapapun di jaringan lokal bisa push metrics palsu
- **Fix done**: Gunakan `--host=127.0.0.1` untuk bind lokal saja. `TW_METRICS_HOST` env var juga didukung.

## tw sync figma

### 1. Figma Variables API memerlukan Figma Enterprise plan
- **Status**: API requirement dari Figma
- **Impact**: Free/Pro Figma plan tidak bisa akses Variables API
- **Workaround**: Gunakan `tw sync pull --from=tokens.json` untuk import dari file manual

### 2. Push ke Figma (write operations) memerlukan edit permission
- **Status**: Requirement Figma
- **Impact**: Read-only tokens tidak bisa dipakai untuk `tw sync figma push`

### 3. Nested variable references ✅ Sprint 7 done
- `resolveTokenValue()` di `sync.mjs` — recursive resolve max depth 8
- Single-level dan multi-level (`{color.primary}` → `{palette.blue.500}` → `#3b82f6`) didukung

### 4. Figma modes (light/dark/etc) hanya mengambil mode pertama
- **Status**: Known limitation
- **Impact**: Multi-mode variables (light/dark themes) hanya import nilai dari mode pertama
- **Fix done Sprint 7**: `tw sync figma --mode=dark` via `figma-multi.mjs`

## tw adopt

### 1. Kompatibilitas score adalah estimasi — bukan hasil test nyata
- **Status**: By design
- **Impact**: Score 0.95 tidak berarti 0 breaking changes — selalu review manual steps
- **Workaround**: Jalankan `tw adopt <feature> --dry-run` dan review semua manualSteps sebelum adopsi

### 2. Framework detection tidak mendeteksi monorepo dengan benar
- **Status**: Known — deteksi dari root `package.json` saja
- **Impact**: Monorepo dengan mixed frameworks mungkin terdeteksi sebagai framework yang salah
- **Workaround**: Jalankan `tw adopt` dari subdirectory: `tw adopt vue-adapter --project=./apps/web`

## Changelog
- v5.0: `cluster.mjs` — real worker_threads pool, throughput reporting
- v5.0: `metrics.mjs` — Prometheus-compatible endpoint, JSON, history, push
- v5.0 preview: Figma sync (pull/push/diff) via Figma Variables API
- v5.0 preview: `adopt.mjs` — 8-feature adoption analyzer
- Sprint 9+ planned: Remote worker protocol (gRPC)
- ✅ Sprint 6 done: persistent metrics-history.jsonl via POST /metrics/push
- ✅ Sprint 7 done: Figma multi-mode — `figma-multi.mjs` (pull/diff/modes, --file=, --mode=)

## tw sync figma push — Figma Enterprise requirement

### Mengapa butuh Enterprise?
Figma Variables write API (`POST /v1/files/:key/variables`) hanya tersedia di plan **Organization** dan **Enterprise**. Free dan Professional plan hanya bisa read.

### Alternatif tanpa Enterprise
1. **Export manual** — Gunakan `tw sync push --to=css` untuk export ke CSS variables, lalu copy-paste ke Figma manual
2. **Pull only** — Gunakan `tw sync figma pull` (read) yang tersedia di semua plan
3. **Diff workflow** — Gunakan `tw sync figma diff` untuk lihat perbedaan, lalu update manual

### Cara setup jika punya Enterprise
```bash
export FIGMA_TOKEN=figd_your_personal_access_token
export FIGMA_FILE_KEY=abc123XYZ   # dari URL figma.com/file/<KEY>/

tw sync figma pull   # import dari Figma → tokens.sync.json
tw sync figma push   # export tokens.sync.json → Figma (Enterprise only)
tw sync figma diff   # lihat perbedaan
```

---

## Status aktual (v4.2.0 — 2026-03-16)

| Limitation | Status |
|-----------|--------|
| Cluster: remote server | ✅ Sprint 6 — `cluster-server.mjs` HTTP worker |
| Cluster: work-stealing | ✅ Sprint 7 — adaptive chunking implemented (least-loaded-worker) |
| Metrics: host flag | ✅ Sprint 6 — `--host=127.0.0.1` + `TW_METRICS_HOST` env |
| Metrics: history persistence | ✅ `.tw-cache/metrics-history.jsonl` via push |
| Figma: Enterprise only | ⚠️ Figma API requirement — fallback ke file manual tersedia |
| Figma: multi-mode | ✅ Sprint 7 — `figma-multi.mjs` pull/diff/modes |
| Figma: nested `$value` references | ✅ Sprint 7 — `resolveTokenValue()` recursive |
| adopt: estimasi score | ⚠️ By design — selalu review manualSteps |
| adopt: monorepo detection | ✅ Sprint 8 — auto-detect npm/pnpm/Nx/Turbo, `--all` flag |
