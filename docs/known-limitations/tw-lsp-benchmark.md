# tw lsp & tw benchmark — Known Limitations (v4.8)

## tw lsp

### Setup yang diperlukan

```bash
# Install peer dependencies
npm install vscode-languageserver vscode-languageserver-textdocument

# Lalu jalankan
tw lsp
```

### Tanpa dependencies
Server berjalan di "stub mode" — tetap hidup untuk tidak crash VS Code extension, tapi tidak memberikan fitur LSP.

### Fitur yang sudah berjalan (dengan dependencies)
- **Completion** — autocomplete Tailwind class di `className="..."` dan `class="..."`
- **Hover** — info class saat cursor di atas Tailwind class
- **Diagnostics** — warning untuk class yang tidak dikenal

### Fitur Sprint 10+ (belum)
- Go to definition untuk `tw()` component
- Rename symbol (refactor class names)
- Code actions (extract to component)
- ✅ Sprint 10 done: `tailwindStyled.lsp.enable` setting di-wire ke `startLspServer()`

### Integrasi VS Code
Gunakan command `tailwindStyled.splitRoutesCss` atau konfigurasikan `tw lsp` sebagai task:
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [{
    "label": "tw lsp",
    "type": "shell",
    "command": "tw lsp",
    "isBackground": true,
    "problemMatcher": []
  }]
}
```

---

## tw benchmark

### Prasyarat
```bash
# Build semua packages dulu
npm run build:packages

# Baru jalankan benchmark
tw benchmark
```

### Output
`docs/benchmark/toolchain-comparison.json` — berisi avg/p50/p95 per command.

### Limitations
- Benchmark menggunakan file sample dari `packages/*/src/` — butuh build selesai
- Hasil benchmark bervariasi tergantung hardware dan beban sistem
- Tidak ada baseline comparison otomatis (manual review JSON)

## Changelog
- v4.8: Real multi-command benchmark dengan 20 runs per command
- ✅ Sprint 6 done: CI benchmark di `.github/workflows/benchmark.yml` (incremental + sprint2 + plugin SLO + toolchain + CLI SLO)
