# Scale Testing Playbook

Dokumen ini menjelaskan workflow pengujian skala besar untuk iterasi berikutnya (v4.1.0+).

## 1) Generate massive fixture

```bash
npm run fixture:massive -- --files=100000 --out=test/fixtures/massive
```

Argumen penting:
- `--files`: jumlah file fixture (default `100000`)
- `--out`: output folder fixture (default `test/fixtures/massive`)
- `--chunk`: jumlah file per sub-folder (default `1000`)

## 2) Massive benchmark (scanner + analyzer + engine no-css)

```bash
npm run bench:massive -- --root=test/fixtures/massive --top=20 --out=artifacts/scale/massive-local.json
```

Output berupa JSON:
- jumlah file yang terbaca,
- class unik,
- waktu scan/analyze/build (ms),
- memory RSS/heap (MB).

Catatan v5:
- `--top` adalah argumen utama untuk top classes.
- `--topN` masih didukung sebagai alias legacy (untuk kompatibilitas script lama).
- `timingsMs.analyze` sekarang mengukur durasi end-to-end `analyzeWorkspace()` API publik v5, jadi tidak 1:1 comparable dengan baseline lama yang memakai jalur `analyzeScan`.

## 3) Memory profile

```bash
npm run bench:memory -- --root=test/fixtures/massive --out=artifacts/scale/memory-local.json
```

Perintah ini menjalankan Node dengan `--expose-gc` lalu menampilkan snapshot:
- sebelum scan,
- setelah scan,
- setelah GC.

## 4) Long-running watch stability

```bash
npm run bench:watch:stability -- --root=test/fixtures/massive --minutes=1440 --touchEvery=60 --reportEvery=300 --out=artifacts/scale/watch-local.json
```

Output report periodik mencakup:
- total event,
- error count,
- full-rescan count,
- memory usage,
- detail report periodik.

## 5) Cross-platform CI

Workflow `.github/workflows/scale-benchmark.yml` menjalankan benchmark berkala di Linux/macOS/Windows (Node 18, 20, 22) dengan dataset 1.000 file, lalu mengunggah artifact JSON hasil benchmark per kombinasi matrix.

## 6) Interpretasi hasil

Panduan cepat membaca hasil:
- `timingsMs.scan` naik tajam antar commit biasanya indikasi regresi scanner/path-walk.
- `timingsMs.engineBuildNoCss` naik saat `scan` stabil biasanya indikasi overhead transform/merge.
- `memoryMb.rss` dan snapshot `after-gc` yang terus naik antar run mengindikasikan potensi leak.
- `watch` report dengan `errors > 0` atau `rescans` tinggi menandakan optimasi watch/invalidation perlu ditinjau.

## 7) Lanjutan langkah 1–4 (operasional)

### 7.1 Trigger CI manual

```bash
npm run ci:scale:trigger
```

### 7.2 Download artifacts dari GitHub Actions

```bash
npm run ci:scale:download -- --runId=<RUN_ID> --out=artifacts/scale-download
```

Opsional otomatis ambil run sukses terbaru untuk workflow default:

```bash
npm run ci:scale:download -- --out=artifacts/scale-download
```

Opsional override repo (cross-repo):

```bash
npm run ci:scale:download -- --repo=owner/repo --runId=<RUN_ID> --out=artifacts/scale-download
```

### 7.3 Analisis hasil antar-OS/Node

```bash
node scripts/benchmark/compare-scale-results.mjs --input=artifacts/scale-download --out=artifacts/scale-summary.json
```

Atau gunakan shortcut:

```bash
npm run ci:scale:compare
```

### 7.4 Update baseline

```bash
npm run ci:scale:baseline
```

Perintah ini menulis baseline ke `artifacts/scale-baseline.json` dari hasil summary terbaru.
