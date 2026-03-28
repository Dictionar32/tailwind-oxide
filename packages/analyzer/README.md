# @tailwind-styled/analyzer

Project-wide Tailwind class analysis for `tailwind-styled-v4`.

## v5 Highlights

- Async API (`Promise`-based)
- Native-only analyzer backend (no JS fallback)
- New `classStats` report shape (`all`, `top`, `frequent`, `unique`, `distribution`)
- Public `classToCss()` API for Tailwind class -> CSS resolution
- Optional semantic report (`unusedClasses`, `unknownClasses`, `conflicts`)
- Node.js `>=20`

## Internal Architecture

- `src/binding.ts`: native binding resolution, cache, and binding error messages
- `src/classToCss.ts`: `classToCss` pipeline and input/options validation
- `src/analyzeWorkspace.ts`: scan + native analyze orchestration and report shaping
- `src/semantic.ts`: semantic report logic, conflict detection, and Tailwind config cache/load
- `src/utils.ts`: shared helpers (debug, sanitizer, error formatter, path helpers)
- `src/index.ts`: public API surface and `__internal` export bridge

## Install

```bash
npm install @tailwind-styled/analyzer
```

## Usage

```ts
import { analyzeWorkspace, classToCss } from "@tailwind-styled/analyzer"

const report = await analyzeWorkspace("./src", {
  classStats: { top: 20, frequentThreshold: 2 },
  semantic: { tailwindConfigPath: "tailwind.config.js" },
})

console.log(report.totalFiles)
console.log(report.classStats.top[0])
console.log(report.classStats.frequent[0])
console.log(report.classStats.distribution)
console.log(report.semantic?.conflicts[0])

const css = await classToCss("opacity-0 translate-y-2", { strict: true })
console.log(css.declarations)
```

## API

```ts
analyzeWorkspace(
  root: string,
  options?: {
    scanner?: ScanWorkspaceOptions
    classStats?: {
      top?: number
      frequentThreshold?: number
    }
    semantic?: boolean | {
      // Relative to `root` unless absolute
      tailwindConfigPath?: string
    }
    includeClass?: (className: string) => boolean
  }
): Promise<AnalyzerReport>
```

```ts
classToCss(
  input: string | string[],
  options?: {
    prefix?: string | null
    strict?: boolean
  }
): Promise<{
  inputClasses: string[]
  css: string
  declarations: string
  resolvedClasses: string[]
  unknownClasses: string[]
  sizeBytes: number
}>
```

## Report Shape

```ts
interface ClassUsage {
  name: string
  count: number
  isUnused?: boolean
  isConflict?: boolean
}

interface AnalyzerReport {
  root: string
  totalFiles: number
  uniqueClassCount: number
  totalClassOccurrences: number
  classStats: {
    all: ClassUsage[]
    top: ClassUsage[]
    frequent: ClassUsage[]
    unique: ClassUsage[]
    distribution: Record<string, number>
  }
  safelist: string[]
  semantic?: {
    unusedClasses: ClassUsage[]
    unknownClasses: ClassUsage[]
    conflicts: Array<{
      className: string
      variants: string[]
      classes: string[]
      message: string
    }>
    tailwindConfig?: {
      path: string
      loaded: boolean
      safelistCount: number
      customUtilityCount: number
      warning?: string
    }
  }
}
```

## Breaking Changes from v4

1. `analyzeWorkspace` is now async.
2. `topClasses` and `duplicateClassCandidates` moved to `classStats.top` and `classStats.frequent`.
3. `analyzeScan` export was removed.
4. Native analyzer binding is required.

## Environment Variables

| Variable | Description |
| --- | --- |
| `TWS_NO_NATIVE` | Disable native loading. In v5 this causes analyzer to throw. |
| `TWS_NO_RUST` | Alias of `TWS_NO_NATIVE`. |
| `TWS_NATIVE_PATH` | Absolute/relative override path to `tailwind_styled_parser.node`. |
| `TWS_DEBUG` / `TAILWIND_STYLED_DEBUG` | Set to `1` to enable analyzer debug logs. |
| `DEBUG` | Supports `tailwind-styled:analyzer` or `tailwind-styled:*`. |

## License

MIT
