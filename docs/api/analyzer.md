# Analyzer API (v5)

## `analyzeWorkspace(root, options?)`
Menganalisis workspace secara async dengan scanner + analyzer native dan mengembalikan ringkasan class usage.

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

## Tipe output
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

## Breaking changes v4 -> v5
- `analyzeWorkspace` sekarang async (`Promise<AnalyzerReport>`).
- `topClasses` diganti ke `classStats.top`.
- `duplicateClassCandidates` diganti ke `classStats.frequent`.
- `analyzeScan` tidak lagi diexport sebagai API publik.
- Analyzer v5 membutuhkan native binding (tidak ada JS fallback di analyzer).
