# Engine API

## `createEngine(config)`
Inisialisasi engine untuk orkestrasi scanner + compiler.

### `config` penting
- `root` — root workspace.
- `scanner` — opsi scanner.
- `compileCss` — aktif/nonaktif generate CSS.
- `plugins` — daftar plugin engine (opsional).

## `engine.scan()`
Menjalankan scan workspace dan mengembalikan `Promise<ScanWorkspaceResult>`.

## `engine.build()`
Menjalankan build sekali dan mengembalikan hasil kompilasi.

## `engine.watch(onEvent, options?)`
Menjalankan watch mode berbasis `fs.watch` dengan hardening.

### Options
- `debounceMs` (default: `100`) — debounce interval untuk flush event.
- `maxEventsPerFlush` (default: `100`) — batas maksimal event yang diproses per batch.
- `largeFileThreshold` (default: `10485760`) — threshold file besar (10MB) untuk memaksa `full-rescan`.

### Events
- `initial` — event awal saat watch dimulai.
- `change` — perubahan file yang diproses incremental.
- `unlink` — file dihapus dan diproses incremental.
- `full-rescan` — fallback saat incremental gagal atau terdeteksi file besar.
- `error` — error watcher; engine akan mencoba recover otomatis.

### Metrics snapshot
Event build (`initial/change/unlink/full-rescan`) dapat memuat `metrics` untuk observability dasar, misalnya:
- jumlah event diterima/diproses,
- jumlah batch,
- jumlah incremental update,
- jumlah full-rescan,
- file besar yang di-skip incremental,
- queue max size,
- durasi build terakhir & rata-rata.

## Plugin API (engine)
Plugin engine dapat diisi lewat `createEngine({ plugins: [...] })`.

Hook yang tersedia:
- `beforeScan(context)`
- `afterScan(scan, context)`
- `transformClasses(classes, context)`
- `beforeBuild(scan, context)`
- `afterBuild(result, context)`
- `onError(error, context)`

Method `engine.watch(...)` mengembalikan handler dengan `close()` untuk cleanup watcher.
