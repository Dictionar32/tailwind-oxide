# Setup Guide — tailwind-styled-v4

## Quick start

```bash
npm install          # install semua core dependencies
npm run build        # build workspace (rust + packages)
npm run test         # verifikasi tests utama
npm run lint         # verifikasi lint
npm run dev          # start development mode
```

## Setup otomatis (direkomendasikan)

```bash
node scripts/setup.mjs           # check + install core
node scripts/setup.mjs --all     # install SEMUA termasuk optional
node scripts/setup.mjs --check   # cek saja tanpa install
node scripts/setup.mjs --minimal # hanya core, skip optional
```

## Dependencies per fitur

### ✅ Core — tidak perlu install tambahan
Semua fitur inti sudah tersedia setelah `npm install`:
- `tw parse`, `tw shake`, `tw lint`, `tw format`, `tw optimize`, `tw split`
- Vue/Svelte adapter, Plugin Registry, Dashboard, Testing, Storybook
- Token sync, AI generator (static fallback), Web Studio
- `tw cluster` (local), `tw metrics`, `tw adopt`

### ⚡ Oxc tools — opsional, improves performance
```bash
npm install --save-optional oxc-parser oxc-transform oxc-minify
```
| Package | Aktifkan fitur |
|---------|---------------|
| `oxc-parser` | `tw parse` — 10x lebih cepat dari babel fallback |
| `oxc-transform` | `tw transform` — TypeScript lowering + source maps |
| `oxc-minify` | `tw minify` — dead code elimination |

### 🔍 LSP Server — opsional
```bash
npm install --save-optional vscode-languageserver vscode-languageserver-textdocument
```
Aktifkan: `tw lsp` — hover, autocomplete, diagnostics di editor

### 🎨 Full CSS generation — opsional
```bash
npm install --save-dev @tailwindcss/postcss
```
Aktifkan: `tw split --full` — generate full Tailwind CSS per route (bukan atomic subset)

### 🖥️ Studio Desktop — opsional
```bash
cd packages/studio-desktop
npm install
npm run dev        # jalankan development
npm run package:mac   # build .dmg macOS
npm run package:win   # build .exe Windows
npm run package:linux # build .AppImage Linux
```

### 🗄️ Remote cache — opsional infra
```bash
# Redis (local dev)
docker run -d --name redis-tw -p 6379:6379 redis

# Aktifkan
tw cache enable redis://localhost:6379
tw cache push build-v1 artifacts/output.css
tw cache pull build-v1 /tmp/restored.css
```

```bash
# S3
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1
export S3_BUCKET=my-tw-cache

tw cache enable s3://my-tw-cache
```

### 🌐 Remote cluster — opsional infra
```bash
# Jalankan di mesin remote
tw metrics 8080   # atau buat worker HTTP server sendiri

# Gunakan dari local
tw cluster build . --remote=http://remote-server:8080
# Atau via env:
TW_CLUSTER_REMOTE=http://remote-server:8080 tw cluster build .
```

## Environment variables

| Variable | Fungsi |
|----------|--------|
| `ANTHROPIC_API_KEY` | AI component generation (`tw ai`) |
| `FIGMA_TOKEN` | Figma sync (`tw sync figma pull/push/diff`) |
| `FIGMA_FILE_KEY` | File key dari URL figma.com/file/**KEY**/... |
| `TW_CLUSTER_REMOTE` | URL remote worker untuk `tw cluster` |
| `TW_SPLIT_FULL` | `1` = aktifkan @tailwindcss/postcss di `tw split` |
| `S3_BUCKET` | Bucket untuk `tw cache enable s3://...` |
| `REDIS_URL` | URL Redis untuk `tw cache enable redis://...` |
| `TWS_DEBUG_SCANNER` | `1` = debug native parser fallback |
| `PORT` | Port untuk `tw studio`, `tw metrics`, `tw dashboard` |
| `SMOKE_VERBOSE` | `1` = verbose output di `node scripts/smoke/index.mjs` |

## Verifikasi instalasi

```bash
node scripts/setup.mjs --check              # cek dependency readiness
npm run build                               # build workspace
npm run test                                # test utama
node scripts/smoke/index.mjs                # smoke suite
node scripts/benchmark/sprint2-bench.mjs    # benchmark parse/shake/cluster
npm run bench                               # native benchmark ringkas
```

## Masalah umum

### `tw parse` mode regex-fallback (bukan oxc-parser)
```bash
npm install --save-optional oxc-parser
```

### `tw lsp` berjalan di stub mode
```bash
npm install --save-optional vscode-languageserver vscode-languageserver-textdocument
```

### `tw split` hanya generate atomic CSS subset
```bash
npm install --save-dev @tailwindcss/postcss
tw split . artifacts/route-css --full
```

### Studio Desktop tidak bisa di-build
```bash
cd packages/studio-desktop
npm install
# Pastikan ada assets/icon.icns (mac), assets/icon.ico (win), assets/icon.png (linux)
npm run package:mac
```
