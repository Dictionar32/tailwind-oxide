# tw parse - Known Limitations

## Overview
`tw parse <file>` uses an Oxc-first parser strategy, then falls back when Oxc is unavailable.

## Current Behavior
- `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`, `.svelte`, and `.mdx` are parsed in Oxc mode when available.
- Output includes classes, parse mode, and timing information.

## Limitations

### 1. Oxc parser is optional
- **Status**: Optional dependency (`oxc-parser`)
- **Impact**: Without Oxc, parser quality drops in complex expressions.
- **Workaround**: `npm install oxc-parser`

### 2. Fallback mode has lower accuracy
- **Status**: Known limitation
- **Impact**: Nested expressions in template literals and helper calls can be partially missed in fallback mode.
- **Workaround**: Use Oxc mode (`oxc-parser` installed).

### 3. Dynamic class names are not fully resolvable
- **Status**: By design (static analysis)
- **Impact**: Computed values such as ``bg-${color}-500`` cannot always be resolved safely.
- **Workaround**: Add safelist entries in Tailwind config.

### 4. Very large files are skipped
- **Status**: By design
- **Impact**: Files above parser size guardrails (for performance safety) may be ignored.
- **Workaround**: Exclude generated artifacts from scan targets.

## Parse Modes

| Mode | Condition | Parse Quality |
|------|-----------|---------------|
| `oxc-parser` | `oxc-parser` installed | Full AST-oriented parsing (recommended) |
| `fallback-regex` | Default without Oxc | Limited extraction for simpler patterns |

## Example Output

```json
{
  "file": "src/App.tsx",
  "mode": "oxc-parser",
  "classCount": 12
}
```

## Notes
- CLI behavior is intentionally static-analysis-only.
- For best parse quality in CI, install optional Oxc dependencies.
