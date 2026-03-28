---
title: "Introducing tailwind-styled v4.1"
date: "2026-03-15"
author: "Tailwind Styled Team"
status: "ready-to-publish"
---

# Introducing tailwind-styled v4.1

v4.1 fokus pada stabilitas parser native, benchmark lintas OS/Node, dan kesiapan rilis dokumentasi.

## Highlights

1. **Rust parser as default path with safe JS fallback**
   - Scanner mencoba native binding lebih dulu.
   - Fallback JS tetap aman jika binding tidak tersedia.
   - Debug mode tersedia via `TWS_DEBUG_SCANNER=1`.

2. **Cross-platform benchmark publication from CI**
   - Benchmark dijalankan terjadwal untuk Linux/macOS/Windows.
   - Output benchmark dikumpulkan jadi satu snapshot (`cross-platform.json`).

3. **Operational readiness for release**
   - Regression test rust parser lintas OS/Node.
   - Contributing guide diperbarui dengan release process.

## Benchmark artifacts

- Public local snapshot: `docs/benchmark/public-benchmark-snapshot.json`
- Cross-platform CI aggregate: `docs/benchmark/cross-platform.json`

## Try it

```bash
npm install tailwind-styled-v4@latest
npm run health:summary
npm run validate:pr5:gaps
```

Terima kasih untuk seluruh kontributor yang membantu mendorong stabilitas rilis v4.1.
