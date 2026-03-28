# CLI Commands â€” tw (tailwind-styled-v4)

> Dokumen lengkap: [docs/api/cli.md](api/cli.md)

## Quick reference

### Setup
```bash
tw setup [--yes] [--next|--vite|--rspack|--react] [--dry-run] [--skip-install]
tw init             # Generate tailwind.css + config
tw scan [dir]       # Scan classes di workspace
tw migrate [dir]    # Migrasi v3 â†’ v4 (--dry-run, --wizard)
tw preflight        # Validasi environment (Node >=20)
```

### Analisis
```bash
tw analyze [dir]    # Class usage report
tw stats [dir]      # Statistik ringkas
tw audit            # Project health score
```

### Plugin
```bash
tw plugin search <q>        # Cari plugin
tw plugin install <pkg>     # Install plugin
tw plugin list              # Daftar plugin
```

### Studio & AI
```bash
tw studio                   # Web component studio
tw ai "description"         # Generate component dengan AI
tw sync init                # Inisialisasi token sync
tw sync push --to=tailwind  # Export ke @theme block
tw sync figma pull          # Pull dari Figma Variables
```

### Oxide pipeline (v4.6â€“v4.8)
```bash
tw parse <file>             # Extract classes (oxc/babel/regex)
tw shake <css>              # Tree shaking CSS
tw lint [dir] [workers]     # Parallel lint
tw format <file> [--write]  # Sort Tailwind classes
tw lsp                      # Start LSP server
tw benchmark                # Toolchain benchmark
```

### Compile-time (v4.9)
```bash
tw optimize <file>          # Constant folding + dedup
tw split [root] [outDir]    # CSS splitting per route
tw critical <html> <css>    # Critical CSS extraction
```

### Distributed (v5.0)
```bash
tw cache enable [remote]    # Enable build cache
tw cluster init [workers]   # Init worker pool
tw cluster build [dir]      # Build paralel
tw metrics [port]           # Metrics server (Prometheus)
tw adopt <feature>          # Feature adoption analyzer
```

## Lihat juga
- [docs/api/cli.md](api/cli.md) â€” dokumentasi penuh dengan semua options
- [docs/known-limitations/](known-limitations/) â€” limitations per command
