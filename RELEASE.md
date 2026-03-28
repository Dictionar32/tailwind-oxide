# Release Plan — v4.2.0

## Pre-release checklist

### 1. Build verification
```bash
npm run build                # Build workspace (Rust + packages)
npm run test                 # Jalankan semua tests (Rust + JS)
npm run lint                 # Lint source files
```

### 2. Sprint 1+2 specific checks
```bash
# Unit tests
node --test packages/scanner/test/parse-v46.test.mjs
node --test packages/compiler/test/shake-v47.test.mjs
node --test packages/vue/test/vue-adapter.test.mjs
node --test packages/svelte/test/svelte-adapter.test.mjs
node --test packages/testing/test/testing-utils.test.mjs

# Integration tests
node --test examples/integration-test/sprint2.integration.test.mjs

# Smoke tests (all features)
node scripts/smoke/index.mjs
```

### 3. Benchmark
```bash
node scripts/benchmark/sprint2-bench.mjs --files=500
# Verifikasi: parse >50 files/sec, shake <200ms untuk 150 rules
```

### 4. Validation report
```bash
node scripts/validate/final-report.mjs    # Generates artifacts/validation-report.json
node scripts/validate/health-summary.mjs  # Generates artifacts/health-summary.json
# Pastikan: "status": "PASS"
```

### 5. New features manual smoke
```bash
# Vue adapter
node -e "const {cv}=require('./packages/vue/dist/index.js');const b=cv({base:'px-4',variants:{size:{sm:'h-8',lg:'h-12'}}});console.log(b({size:'lg'}))"

# Svelte adapter  
node -e "const {cv}=require('./packages/svelte/dist/index.js');const b=cv({base:'px-4',variants:{size:{sm:'h-8',lg:'h-12'}}});console.log(b({size:'lg'}))"

# AI generator (tanpa API key → static fallback)
node scripts/v45/ai.mjs "danger button with sizes"

# Token sync
node scripts/v45/sync.mjs init && node scripts/v45/sync.mjs push --to=tailwind

# Dashboard (buka di browser)
PORT=3099 node packages/dashboard/src/server.mjs &
curl http://localhost:3099/health
curl http://localhost:3099/metrics
kill %1
```

## Packages released in v4.2.0

| Package | New in v4.2 |
|---------|------------|
| `@tailwind-styled/vue` | ✅ NEW |
| `@tailwind-styled/svelte` | ✅ NEW |
| `@tailwind-styled/testing` | ✅ Major update |
| `@tailwind-styled/storybook-addon` | ✅ Major update |
| `@tailwind-styled/dashboard` | ✅ Major update (live metrics) |
| `@tailwind-styled/plugin-registry` | ✅ Major update |
| `@tailwind-styled/engine` | ✅ + metricsWriter |
| `tailwind-styled-v4` (core) | ✅ v4.2.0 |
| All others | 🔄 Version bump to 4.2.0 |

## Post-release

1. Publish ke npm: `npm publish --workspaces --access public`
2. Tag git: `git tag v4.2.0 && git push origin v4.2.0`
3. Update README dengan Vue/Svelte adapter examples
4. Announce di blog: `docs/blog/introducing-tailwind-styled-v4.2.md`

## Known issues at release

See `docs/known-limitations/` for complete list. Key ones:
- Oxc parser optional (fallback to babel/regex — fully functional but slower)
- LSP server requires `vscode-languageserver` peer dependency
- Distributed cluster (v5.0) supports local workers only — remote build server in Sprint 4

---

## v4.3–v4.5 Pre-release addendum

### Additional checks sebelum publish

```bash
# v4.3 command check
node packages/cli/dist/index.js studio --help
node packages/cli/dist/index.js dashboard --help
node packages/cli/dist/index.js storybook --help

# v4.4 DX check
node packages/cli/dist/index.js preflight --json
node scripts/v45/audit.mjs --scope=deprecated --json

# v4.5 platform check
node scripts/v45/ai.mjs "test button"
node scripts/v45/sync.mjs init && node scripts/v45/sync.mjs push --to=css
node scripts/v45/figma-sync.mjs help

# shared package
node -e "const {LRUCache,hashContent,debounce}=require('./packages/shared/dist/index.cjs');console.log('shared ok')"

# Full v4.3-v4.5 tests
node --test packages/testing/test/v43-v45.test.mjs
```

### Packages tambahan di v4.3–v4.5

| Package | Type | Status |
|---------|------|--------|
| `@tailwind-styled/shared` | Utilities | ✅ New |
| `packages/cli/src/preflight.ts` | CLI command | ✅ New |

---

## Sprint 6 Pre-release addendum

### New commands to verify

```bash
# Registry
node scripts/v45/registry.mjs serve --port=4041 &
curl http://localhost:4041/health
curl http://localhost:4041/packages
kill %1

# Deploy to registry
tw deploy --registry=http://localhost:4041 --dry-run

# Remote cluster
node scripts/v50/cluster-server.mjs --port=7071 &
curl http://localhost:7071/health
kill %1

# Sync remote
tw sync pull --from=https://example.com/tokens.json  # requires URL

# Route CSS middleware
node -e "const {loadRouteCssManifest}=require('./packages/next/src/routeCssMiddleware'); console.log(typeof loadRouteCssManifest)"
```

### Sprint 6 test suite

```bash
node --test packages/testing/test/sprint6.test.mjs
# Expected: 24/24 pass
```

### New packages/files in Sprint 6

| File | Description |
|------|-------------|
| `scripts/v45/registry.mjs` | HTTP registry server |
| `scripts/v50/cluster-server.mjs` | Remote build worker |
| `packages/next/src/routeCssMiddleware.ts` | Route CSS injection helpers |
| `packages/studio-desktop/src/loading-error.html` | Loading fallback |
| `packages/studio-desktop/src/updater.js` | Auto-updater |
| `docs/api/shared.md` | @tailwind-styled/shared API docs |
| `docs/api/next-route-css.md` | Route CSS middleware docs |
