# Large Project Fixture

Folder ini dipakai untuk pengujian performa scanner pada skala besar.

## Isi fixture
- `generated/` berisi sampel fixture yang sudah di-commit (200 file).
- Generator default bisa membuat 10.000 file untuk stress test lokal.

## Cara generate ulang

```bash
node test/fixtures/large-project/generate.js --files=10000
```
