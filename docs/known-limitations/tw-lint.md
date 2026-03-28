# tw lint - Known Limitations

## Overview
`tw lint [dir] [workers]` runs static Tailwind class checks with worker threads.

## Limitations

### 1. Worker threads require modern Node
- **Status**: Requirement
- **Impact**: Older Node versions can fail or run in degraded mode.
- **Workaround**: Use Node.js 18+.

### 2. Dynamic classes can produce false positives
- **Status**: Known limitation of static analysis
- **Impact**: Patterns like ``bg-${color}-500`` may be flagged as unknown.
- **Workaround**: Add safelist entries or suppress specific lines where needed.

### 3. Workload distribution is not always optimal on very large repos
- **Status**: Known issue
- **Impact**: Some workers can finish early while others remain busy.
- **Workaround**: Lint smaller scopes (for example `packages/core/src`).

### 4. No full auto-fix mode in `tw lint`
- **Status**: Not implemented in lint command
- **Impact**: Fixes must be handled manually or via formatter flows.
- **Workaround**: Use `tw format --write` where applicable.

### 5. Advanced custom-rule pipeline is limited
- **Status**: Partial
- **Impact**: Rule extensibility is not equivalent to full ESLint-style plugin ecosystems.
- **Workaround**: Combine `tw lint` with project linting rules in CI.

## Worker Configuration

| `workers` value | Behavior |
|----------------|----------|
| `1` | Single thread (debug friendly) |
| `auto` | CPU-based workers |
| `N` | Exactly N workers |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | No lint errors |
| `1` | Lint errors found |
| `2` | Parse/config/runtime error |

## Notes
- `npm run lint` in this repo uses batched file arguments for Windows compatibility.
- Keep `tw lint` focused on static class quality checks; pair with test/build gates for release confidence.
