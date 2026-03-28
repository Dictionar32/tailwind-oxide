# Release Candidate Gate

## Purpose
Menjalankan gate akhir sebelum RC release agar keputusan rilis berbasis data.

## Local commands

```bash
npm run validate:final
npm run health:summary
```

Output artifacts:
- `artifacts/validation-report.json`
- `artifacts/health-summary.json`

## GitHub Actions

Gunakan workflow **Release Candidate Gate** (`workflow_dispatch`) untuk menjalankan gate di CI.
