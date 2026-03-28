# Engine Benchmark (Sprint 3.5) - 2026-03-21

Command:

```bash
npm run bench:engine -- --iterations=7 --watch-ms=15000
```

Environment:

- Root: `examples/standar-config-next-js-app`
- Iterations: `7`
- Watch window: `15000ms`
- Native watch engine: `rust-notify`

## Results (3 runs)

| Run | Cold | Warm | Scan Improvement | Inc Improvement | Idle CPU 300ms | Idle CPU 500ms | Idle Reduction | Active CPU 300ms | Active CPU 500ms | Active Reduction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Run A | 7 ms | 4 ms | 38% | 32% | 16 ms | 0 ms | 100% | 31 ms | 46 ms | -48% |
| Run B | 7 ms | 4 ms | 34% | 48% | 15 ms | 0 ms | 100% | 125 ms | 62 ms | 50% |
| Run C | 8 ms | 6 ms | 16% | 26% | 16 ms | 16 ms | 0% | 110 ms | 32 ms | 71% |

### Aggregated (mean)

| Metric | Mean |
| --- | --- |
| Cold start | 7.33 ms |
| Warm start | 4.67 ms |
| Scan improvement | 36% |
| Incremental improvement | 35% |
| Idle CPU @300ms | 15.67 ms |
| Idle CPU @500ms | 5.33 ms |
| Idle CPU reduction | 66% |
| Active CPU @300ms | 88.67 ms |
| Active CPU @500ms | 46.67 ms |
| Active CPU reduction | 47% |
| Events captured (500ms active) | 29 per run |

## Notes

- Scan and incremental paths are consistently faster in warm/native modes.
- Watch CPU values are noisy per single run; averaged data shows lower CPU with 500ms polling in both idle and active scenarios.
