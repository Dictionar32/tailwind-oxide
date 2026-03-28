# VALIDASI FINAL

Jalankan checklist berikut sebelum release:

1. Test:
   - unit
   - integration
   - e2e (jika ada)
2. Type check
3. Build seluruh workspace
4. Benchmark (parser/merge/scanner)
5. Uji sample projects
6. Uji CLI (`init`, `scan`, `migrate --dry-run`)

## Format laporan JSON
Gunakan format ringkas:

```json
{
  "tests": { "passed": 0, "failed": 0 },
  "typecheck": "pass|fail",
  "build": "pass|fail",
  "benchmarks": {
    "parser_js_ms": 0,
    "parser_native_ms": 0,
    "speedup": 0
  },
  "examples": {
    "next": "pass|fail",
    "vite": "pass|fail"
  }
}
```
