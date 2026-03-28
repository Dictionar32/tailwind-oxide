# CLI API Ã¢â‚¬â€ tw (tailwind-styled-v4)

## v5 Compatibility Notes

- create-tailwind-styled v5 membutuhkan Node.js >=20.
- Entry-point CLI menunggu (await) command async (setup, scan, migrate, analyze, stats, extract) sebelum exit.
- tw setup mendukung mode non-interaktif via --yes, flag eksplisit --next/--vite/--rspack/--react, dan --skip-install untuk skip instalasi dependency.
- Output analyzer v5 menggunakan struktur classStats (top, frequent, unique) dan tidak lagi 1:1 dengan shape lama.

## Commands lengkap (v4.2.0)

### Core (existing)
| Command | Deskripsi |
|---------|-----------|
| `tw init` | Generate setup awal project (tailwind.config, globals.css) |
| `tw scan [dir]` | Scan Tailwind classes di workspace, output JSON/table |
| `tw migrate [dir]` | Migrasi v3 Ã¢â€ â€™ v4, opsi `--dry-run` dan `--wizard` |
| `tw analyze [dir]` | Analisis class usage, top classes, file stats |
| `tw stats [dir]` | Ringkasan statistik class |
| `tw extract [dir]` | Extract semua class ke file |

### Plugin (v4.2)
| Command | Deskripsi |
|---------|-----------|
| `tw plugin search <query>` | Cari plugin di registry |
| `tw plugin list` | Daftar semua plugin |
| `tw plugin install <name>` | Install plugin (`--dry-run`, `--allow-external`, `--yes`) |

### Studio & AI (v4.5)
| Command | Deskripsi |
|---------|-----------|
| `tw studio [--project=.] [--port=3030]` | Web component studio |
| `tw ai "describe"` | Generate tw() component dari deskripsi (Anthropic API atau template) |
| `tw sync <init\|pull\|push\|diff>` | Token sync W3C DTCG format |
| `tw sync figma <pull\|push\|diff>` | Figma Variables API sync |
| `tw audit` | Project audit JSON summary |
| `tw deploy [name]` | Deploy/publish component metadata |
| `tw share <name>` | Print share payload template |

### Oxide pipeline (v4.6Ã¢â‚¬â€œv4.8)
| Command | Deskripsi |
|---------|-----------|
| `tw parse <file>` | Parse file: oxc Ã¢â€ â€™ babel Ã¢â€ â€™ regex, extract classes |
| `tw transform <file> [out]` | Transform file (Oxc-first) |
| `tw minify <file>` | Minify file (Oxc-first) |
| `tw shake <css>` | Real CSS tree shaking Ã¢â‚¬â€ hapus rule yang tidak dipakai |
| `tw lint [dir] [workers]` | Parallel lint via worker threads |
| `tw format <file> [--write]` | Format Tailwind classes |
| `tw lsp` | Start LSP server (hover, completion, diagnostics) |
| `tw benchmark` | Write toolchain benchmark snapshot |

### Compile-time (v4.9)
| Command | Deskripsi |
|---------|-----------|
| `tw optimize <file>` | Constant folding, dedup, partial eval twMerge |
| `tw split [root] [outDir] [--full]` | Route-based CSS code splitting (--full = @tailwindcss/postcss) |
| `tw critical <html> <css>` | Critical CSS extraction inline |

### Distributed (v5.0)
| Command | Deskripsi |
|---------|-----------|
| `tw cache <enable\|disable\|status\|push\|pull\|clear> [remote]` | Build cache: local, S3, Redis |
| `tw cluster <init\|build\|status> [workers] [--remote=url]` | Worker thread pool build (--remote = HTTP remote) |
| `tw adopt <feature> [--project=.]` | Feature adoption analyzer |
| `tw metrics [port]` | Prometheus-compatible metrics server |

## Global options
```
--help, -h     Tampilkan help
--version, -v  Tampilkan versi
```

## Exit codes
| Code | Arti |
|------|------|
| `0` | Sukses |
| `1` | Command error / validation failure |
| `2` | Parse/config error |

## Environment variables
| Variable | Deskripsi |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Untuk `tw ai` Ã¢â‚¬â€ Anthropic API |
| `FIGMA_TOKEN` | Untuk `tw sync figma` |
| `FIGMA_FILE_KEY` | File key Figma project |
| `TWS_DEBUG_SCANNER` | `1` untuk debug scanner native/fallback |
| `PORT` | Port untuk `tw studio` / `tw metrics` / `tw dashboard` |
| `SMOKE_VERBOSE` | `1` untuk verbose smoke test output |

### Sprint 6 Ã¢â‚¬â€ Registry, Remote Build, Remote Sync

| Command | Deskripsi |
|---------|-----------|
| `tw registry serve [--port=4040]` | Jalankan HTTP registry server lokal |
| `tw registry list` | List semua packages di registry |
| `tw registry info <n>` | Detail package dari registry |
| `tw deploy --registry=<url>` | Publish ke remote registry |
| `tw deploy --dry-run` | Preview manifest tanpa publish |
| `tw cluster-server [--port=7070]` | Start remote build worker server |
| `tw cluster build <dir> --remote=<url>` | Dispatch build ke remote worker |
| `tw sync pull --from=<url>` | Pull tokens dari HTTP/HTTPS URL |
| `tw sync push --to-url=<url>` | Push tokens ke remote endpoint |

### Environment variables (Sprint 6)

| Variable | Deskripsi |
|----------|-----------|
| `TW_REGISTRY_URL` | Default registry URL untuk `tw deploy` |
| `TW_REGISTRY_TOKEN` | Auth token untuk registry server |
| `TW_WORKER_PORT` | Port untuk cluster-server |
| `TW_WORKER_TOKEN` | Auth token untuk cluster-server |
| `TW_SYNC_TOKEN` | Auth token untuk `tw sync push --to-url` |
| `TW_CSS_MANIFEST` | Path ke css-manifest.json (untuk routeCssMiddleware) |

