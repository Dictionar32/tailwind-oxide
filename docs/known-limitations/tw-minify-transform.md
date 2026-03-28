# tw minify & tw transform — Known Limitations (v4.7/v4.6)

## tw minify <file>

### Mode operasi

| Mode | Kondisi | Hasil |
|------|---------|-------|
| `oxc-minify` | `npm install oxc-minify` | Full AST minification — dead code, mangle, compress |
| `fallback-whitespace` | Default tanpa oxc | Hanya collapse whitespace — output lebih besar |

### Cara aktifkan mode optimal
```bash
npm install oxc-minify   # sekali
tw minify src/Button.tsx # otomatis pakai oxc
```

### Limitations
- Mode fallback tidak menghapus dead code atau rename variabel
- Source maps hanya tersedia di mode oxc
- File > 5MB mungkin lambat di mode oxc (by design)

---

## tw transform <file> [out]

### Mode operasi

| Mode | Kondisi | Hasil |
|------|---------|-------|
| `oxc-transform` | `npm install oxc-transform` | TypeScript lowering, JSX transform, source maps |
| `identity` | Default tanpa oxc | Output = input, tidak ada transform |

### Cara aktifkan mode optimal
```bash
npm install oxc-transform
tw transform src/Button.tsx dist/Button.js
```

### Limitations
- Mode identity berguna hanya untuk pipeline testing — tidak menghasilkan JS dari TS
- Untuk production transform, gunakan `tsc`, `tsup`, atau `esbuild` langsung
- `tw transform` lebih cocok sebagai langkah pre-processing sebelum bundler

## Changelog
- v4.6: Identity fallback + oxc optional
- v4.7: Whitespace minification sebagai fallback minify
- Sprint 7 done: 3-tier pipeline (oxc-minify → esbuild → regex), `--mangle`, `--dead-code` flags (saat ini: opsional)
