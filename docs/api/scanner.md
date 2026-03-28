# Scanner API

Dokumen ini menjelaskan API publik dari paket `@tailwind-styled/scanner`.

## `scanSource(source: string): string[]`
Mengekstrak class Tailwind dari source code string menggunakan kombinasi:
- extractor dari compiler, dan
- parser AST JSX/TSX.

Cocok untuk skenario analisis per file atau integrasi tool custom.

## `scanFile(filePath: string): ScanFileResult`
Membaca 1 file dari disk, lalu mengembalikan hasil scan class.

```ts
interface ScanFileResult {
  file: string
  classes: string[]
}
```

## `scanWorkspace(rootDir: string, options?: ScanWorkspaceOptions): ScanWorkspaceResult`
Melakukan scan direktori secara rekursif.

### Opsi
```ts
interface ScanWorkspaceOptions {
  includeExtensions?: string[]
  ignoreDirectories?: string[]
  useCache?: boolean
  cacheDir?: string
  smartInvalidation?: boolean
}
```

Keterangan singkat:
- `includeExtensions`: ekstensi file yang discan (default: `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`).
- `ignoreDirectories`: folder yang diabaikan (mis. `node_modules`, `.git`, `dist`).
- `useCache`: aktif/nonaktif cache hasil scan (default `true`).
- `cacheDir`: lokasi direktori cache kustom.
- `smartInvalidation`: aktifkan strategi invalidasi cache cerdas (default `true`).

### Output
```ts
interface ScanWorkspaceResult {
  files: ScanFileResult[]
  totalFiles: number
  uniqueClasses: string[]
}
```

## Catatan build
Mulai versi saat ini, build scanner menandai `typescript` sebagai dependency eksternal pada bundling (`--external typescript`) agar bundle runtime tetap ringan dan kompatibel saat digunakan oleh CLI ESM.


## Smart invalidation
Saat `smartInvalidation` aktif, scanner akan:
- mengurutkan prioritas scan berdasarkan perubahan file + jejak akses cache,
- membersihkan entry cache untuk file yang sudah hilang,
- tetap fallback aman ke scan penuh bila data cache tidak valid.
