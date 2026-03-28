# @tailwind-styled/compiler v5 Upgrade Plan

## Ringkasan

Dokumen ini berisi rencana upgrade komprehensif untuk @tailwind-styled/compiler dari v4.5 ke v5. Semua 14 rekomendasi akan diimplementasi dalam 5 fase.

## Current State Analysis

### File Structure (packages/compiler/src/)
```
├── index.ts                    # Main export - 120+ exports
├── astParser.ts               # AST parsing for component configs
├── astTransform.ts            # Main transform pipeline
├── atomicCss.ts               # Atomic CSS generation
├── classExtractor.ts          # Class extraction with fallback
├── classMerger.ts            # Class merging utilities
├── componentGenerator.ts      # Component code generation
├── componentHoister.ts        # Component hoisting
├── context.ts                 # Compile context
├── coreCompiler.ts            # Core compiler with cache
├── cssCompiler.ts             # CSS compiler with fallback
├── deadStyleEliminator.ts    # DSE - already complete!
├── incrementalEngine.ts       # Incremental compilation
├── loaderCore.ts             # Loader utilities
├── loadTailwindConfig.ts     # Tailwind config loader (v3+v4)
├── nativeBridge.ts           # Native bridge with fallback
├── pipeline.ts               # Pipeline definition
├── routeCssCollector.ts      # Route CSS collection
├── rustCssCompiler.ts        # Rust CSS compiler with fallback
├── safelistGenerator.ts       # Safelist generation
├── staticVariantCompiler.ts  # Static variant compilation
├── styleBucketSystem.ts     # Style bucket management
├── styleRegistry.ts          # Style registry
├── tailwindEngine.ts        # Tailwind v3/v4 engine
├── twDetector.ts             # Tailwind usage detection
└── variantCompiler.ts        # Variant compilation
```

### Issues yang Teridentifikasi

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | JS Fallback exists | nativeBridge.ts, rustCssCompiler.ts, cssCompiler.ts, classExtractor.ts | HIGH |
| 2 | Too many exports (120+) | index.ts | MEDIUM |
| 3 | Mode option still exists | astTransform.ts | LOW |
| 4 | Atomic CSS in main package | atomicCss.ts | LOW |
| 5 | v3 support still exists | tailwindEngine.ts:81-86 | LOW |
| 6 | DSE not integrated | standalone, not in pipeline | HIGH |
| 7 | No tests | - | HIGH |

---

## Phase 1: Preparation (Refactor Internal)

### 1.1 Pisahkan Public/Internal API

**Objective:** Ringan dan jelas - hanya ekspor fungsi yang diperlukan pengguna.

**Changes:**

```typescript
// packages/compiler/src/index.ts - Sederhanakan exports

// PUBLIC API - for end users
export { transformSource } from "./astTransform"
export type { TransformOptions, TransformResult } from "./astTransform"

export { compileCssFromClasses, buildStyleTag } from "./cssCompiler"
export type { CssCompileResult } from "./cssCompiler"

export { extractAllClasses } from "./classExtractor"

export { IncrementalEngine, getIncrementalEngine, resetIncrementalEngine } from "./incrementalEngine"
export type { IncrementalEngineOptions, IncrementalStats } from "./incrementalEngine"

export { analyzeFile } from "./rscAnalyzer"
export type { RscAnalysis } from "./rscAnalyzer"

export { BucketEngine, getBucketEngine, resetBucketEngine } from "./styleBucketSystem"
export type { BucketStats, StyleBucket } from "./styleBucketSystem"

// INTERNAL API - use @tailwind-styled/compiler/internal
export { 
  parseComponentConfig, 
  parseObjectConfig,
  clearAtomicRegistry,
  generateAtomicCss,
  // ... other internal functions
} from "./internal"
```

**Files to create:**
- `packages/compiler/src/internal/index.ts` - re-exports internal functions
- Update `package.json` exports:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./internal": "./dist/internal.js"
  }
}
```

### 1.2 Hapus Mode Option

**Objective:** Hanya support zero-runtime.

**Changes:**
- Hapus `mode` option dari `TransformOptions`
- Update `astTransform.ts` untuk hanya support zero-runtime
- Update `coreCompiler.ts` untuk remove mode handling

### 1.3 Evaluasi Fitur yang Tidak Dipakai

**Audit dan remove:**
- `generateStaticVariantCode` - cek usage, mungkin hapus
- `generateVariantCode` dan `compileVariants` - mungkin digabung
- `generateAllRouteCss` - mungkin digantikan IncrementalEngine

---

## Phase 2: Native-First (Hapus Fallback JS)

### 2.1 Rubah nativeBridge.ts

**Current:**
```typescript
export function getNativeBridge(): NativeBridge | null {
  // returns null if not available → fallback takes over
}
```

**Target v5:**
```typescript
export function getNativeBridge(): NativeBridge {
  const bridge = tryLoadNative()
  if (!bridge) {
    throw new Error(
      `@tailwind-styled/compiler v5 requires native binding. ` +
      `Please build the native module or use prebuilt binary. ` +
      `See: https://tailwind-styled.dev/docs/install`
    )
  }
  return bridge
}
```

### 2.2 Rubah rustCssCompiler.ts

**Current:**
```typescript
export function compileCssNative(classes: string[]): CssCompileResult {
  const binding = getBinding()
  if (binding?.compileCss) {
    // use native
  }
  // JS fallback
  return { css: "...", engine: "fallback" }
}
```

**Target v5:**
```typescript
export function compileCssNative(classes: string[]): CssCompileResult {
  const binding = getBinding() // throws if unavailable
  const result = binding.compileCss(classes)
  return { ...result, engine: "rust" }
}
```

### 2.3 Rubah classExtractor.ts

**Current:**
```typescript
export function extractAllClasses(source: string): string[] {
  try {
    const native = getNativeBridge()
    if (native?.extractClassesFromSourceNative) {
      return native.extractClassesFromSourceNative(source)
    }
  } catch {
    // fallback
  }
  // JS fallback implementation
}
```

**Target v5:**
```typescript
export function extractAllClasses(source: string): string[] {
  const native = getNativeBridge() // throws if unavailable
  return native.extractClassesFromSourceNative(source)
}
```

### 2.4 Rubah cssCompiler.ts

**Target:** Same pattern - remove fallback, throw if native unavailable.

### 2.5 Rubah coreCompiler.ts

**Current:**
```typescript
private nativeStep(ctx) {
  const native = getNativeBridge()
  if (!native?.transformSourceNative) return // fallback to JS
  // ...
}

private jsStep(ctx) {
  // JS pipeline fallback
}
```

**Target v5:**
```typescript
private nativeStep(ctx) {
  const native = getNativeBridge() // throws if unavailable
  const raw = native.transformSourceNative(ctx.source, opts)
  // ...
}
```

---

## Phase 3: Integrasi DSE ke Pipeline

### 3.1 Integrasi deadStyleEliminator

**Objective:** DSE menjadi bagian dari compile pipeline.

**New API:**
```typescript
// packages/compiler/src/compileWithDse.ts

export interface CompileWithDseOptions extends TransformOptions {
  eliminateDeadStyles?: boolean
  dseConfig?: {
    dirs?: string[]
    registered?: RegisteredComponent[]
  }
}

export interface CompileWithDseResult {
  result: TransformResult
  engine: "native" | "js"
  cacheHit: boolean
  dseReport?: EliminationReport
  dseBytesSaved?: number
}
```

**Integration ke coreCompiler:**
```typescript
// Di coreCompiler.ts, tambahkan step DSE setelah transform:

if (options.eliminateDeadStyles && !cacheHit) {
  const dseResult = runElimination({
    dirs: options.dseConfig.dirs,
    inputCss: result.css,
    registered: options.dseConfig.registered,
  })
  result.dseReport = dseResult.report
  result.dseBytesSaved = dseResult.report.bytesSaved
}
```

### 3.2 Peningkatan DSE

**Enhancements:**
1. Static variant analysis - sudah ada di deadStyleEliminator
2. Variant usage tracking yang lebih baik
3. Build-time CSS optimization

---

## Phase 4: Testing

### 4.1 Unit Tests

**Target:** vitest/jest untuk fungsi inti.

**Test files to create:**
```
packages/compiler/tests/
├── astParser.test.ts
├── transformSource.test.ts
├── extractAllClasses.test.ts
├── compileCssFromClasses.test.ts
├── incrementalEngine.test.ts
└── variants.test.ts
```

**Example test:**
```typescript
// packages/compiler/tests/transformSource.test.ts
import { describe, it, expect } from "vitest"
import { transformSource } from "../src/astTransform"

describe("transformSource", () => {
  it("transforms basic component", () => {
    const result = transformSource(`
      import { tw } from "tailwind-styled"
      const Button = tw.button\`px-4 py-2\`
    `)
    
    expect(result.code).toContain("__tw")
    expect(result.classes).toContain("px-4")
    expect(result.classes).toContain("py-2")
  })
  
  it("handles variants", () => {
    const result = transformSource(`
      const Button = tw.button({
        base: "px-4",
        variants: { size: { sm: "text-sm", lg: "text-lg" } }
      })
    `)
    
    expect(result.code).toContain("__vt_")
  })
})
```

### 4.2 Integration Tests

**Test files:**
```
packages/compiler/tests/
├── integration/
│   ├── nextjs.test.ts
│   ├── vite.test.ts
│   └── nativeBinding.test.ts
└── fixtures/
    ├── basic
    ├── with-variants
    └── with-rsc
```

### 4.3 Native Binding Tests

**Mock approach:**
```typescript
// packages/compiler/tests/__mocks__/nativeBridge.ts
export const mockNativeBridge = {
  transformSourceNative: (source, opts) => ({
    code: source,
    classes: ["px-4"],
    changed: true,
  }),
  extractClassesFromSourceNative: (source) => ["px-4"],
  compileCssNative: (classes) => ({ css: ".px-4 { padding: 1rem }" }),
}
```

---

## Phase 5: Documentation

### 5.1 README.md Updates

**Content:**
1. Installation (including building native binding)
2. Basic usage examples
3. RSC and incremental compilation
4. API reference
5. Breaking changes from v4

### 5.2 Examples

**Create example projects:**
```
examples/
├── nextjs-v5/
│   ├── README.md
│   ├── package.json
│   └── src/
└── vite-v5/
    ├── README.md
    ├── package.json
    └── src/
```

### 5.3 API Reference

**Document all public APIs:**
```typescript
// For each export in index.ts:
/**
 * Transforms source code to add tailwind-styled component definitions.
 * 
 * @param source - TypeScript/TSX source code
 * @param options - Transform options
 * @returns Transform result with generated code and extracted classes
 * 
 * @example
 * const result = transformSource(code, { filename: "Button.tsx" })
 * console.log(result.code) // transformed code
 * console.log(result.classes) // ["px-4", "py-2"]
 */
```

---

## Breaking Changes Summary

| Area | v4 (Current) | v5 (Target) |
|------|---------------|--------------|
| Native binding | Optional (fallback JS) | **Required** |
| API exports | 120+ functions | ~20 (public) + internal |
| Mode option | "zero-runtime", "runtime", "extract-only" | **Removed (zero-runtime only)** |
| Atomic CSS | In main package | **Separate @tailwind-styled/atomic** |
| Tailwind v3 | Supported | **Removed (v4 only)** |
| DSE | Manual | **Integrated to pipeline** |
| extractAllClasses | JS fallback | **Rust native only** |
| compileCssFromClasses | JS fallback | **Rust native only** |
| transformSource | JS fallback | **Rust native only** |

---

## Roadmap Timeline

```
Phase 1: Preparation        [Week 1-2]
  ├─ 1.1 Separate API
  ├─ 1.2 Remove mode
  └─ 1.3 Audit features

Phase 2: Native-first       [Week 3-4]
  ├─ 2.1 nativeBridge
  ├─ 2.2 rustCssCompiler
  ├─ 2.3 classExtractor
  ├─ 2.4 cssCompiler
  └─ 2.5 coreCompiler

Phase 3: DSE Integration    [Week 5]
  ├─ 3.1 Integrate to pipeline
  └─ 3.2 Enhance DSE

Phase 4: Testing            [Week 6]
  ├─ 4.1 Unit tests
  ├─ 4.2 Integration tests
  └─ 4.3 CI setup

Phase 5: Documentation      [Week 7]
  ├─ 5.1 README
  ├─ 5.2 Examples
  └─ 5.3 API reference

Release v5                  [Week 8]
```

---

## Implementation Priority

1. **HIGH PRIORITY** - Native-first changes (Phase 2)
2. **HIGH PRIORITY** - Testing (Phase 4)
3. **MEDIUM PRIORITY** - API separation (Phase 1.1)
4. **MEDIUM PRIORITY** - DSE Integration (Phase 3)
5. **LOW PRIORITY** - Documentation (Phase 5)
6. **LOW PRIORITY** - Atomic CSS separation (Phase 1.4)

---

## Notes

- All existing features will be preserved or enhanced
- Breaking changes are documented for users
- Migration guide will be provided
- Backward compatibility NOT guaranteed for v4 → v5