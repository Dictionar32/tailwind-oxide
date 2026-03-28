# @tailwind-styled/compiler v5

A zero-runtime CSS-in-JS compiler for Tailwind CSS v4 that transforms styled component templates into optimized, atomic CSS.

## Installation

```bash
npm install @tailwind-styled/compiler
```

**Native Binding Required**

Starting from v5, the compiler requires a native binding (`tailwind_styled_parser.node`). The package will throw an error if the native module is not available.

```bash
# Build the native module
npm run build:native
```

If you're using this in a project that bundles the native module, ensure it's properly configured in your build pipeline.

## Quick Start

```typescript
import { transformSource, compileCssFromClasses } from "@tailwind-styled/compiler"

const source = `
import { tw } from "tailwind-styled-v4"

const Button = tw.button\`
  bg-blue-500 hover:bg-blue-600
  px-4 py-2 rounded-md
\`
`

// Transform source code
const result = transformSource(source, {
  autoClientBoundary: true,
  addDataAttr: false,
})

console.log(result.code)
// → React.forwardRef function _Tw_Button(props, ref) { ... }
console.log(result.classes)
// → ["bg-blue-500", "hover:bg-blue-600", "px-4", "py-2", "rounded-md"]

// Compile classes to CSS
const { css, resolvedClasses } = compileCssFromClasses(result.classes)
console.log(css)
// → ".bg-blue-500 { background-color: #3b82f6; } ..."
```

## API Reference

### transformSource

Transforms source code by converting `tw.*` template literals into React components.

```typescript
import { transformSource, type TransformOptions, type TransformResult } from "@tailwind-styled/compiler"

const result = transformSource(source: string, options?: TransformOptions): TransformResult
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| source | `string` | Source code to transform |
| options | `TransformOptions` | Transform configuration (optional) |

**TransformOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoClientBoundary` | `boolean` | `true` | Automatically inject "use client" for interactive components |
| `addDataAttr` | `boolean` | `false` | Add `data-tw` attribute for debugging |
| `hoist` | `boolean` | `true` | Enable component hoisting |
| `filename` | `string` | `""` | Current file name for RSC analysis |
| `preserveImports` | `boolean` | `false` | Keep `tw` imports intact |
| `deadStyleElimination` | `boolean` | `false` | Enable DSE after transformation |

**Returns:**

```typescript
interface TransformResult {
  code: string              // Transformed source code
  classes: string[]         // Extracted classes
  rsc?: {
    isServer: boolean
    needsClientDirective: boolean
    clientReasons: string[]
  }
  changed: boolean         // Whether transformation occurred
}
```

---

### compileCssFromClasses

Compiles a list of Tailwind classes into atomic CSS using the native Rust engine.

```typescript
import { compileCssFromClasses, type CssCompileResult } from "@tailwind-styled/compiler"

const result = compileCssFromClasses(classes: string[], options?: { prefix?: string }): CssCompileResult
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| classes | `string[]` | Array of Tailwind class names |
| options | `{ prefix?: string }` | Optional CSS class prefix |

**Returns:**

```typescript
interface CssCompileResult {
  css: string              // Generated atomic CSS
  resolvedClasses: string[] // Successfully resolved classes
  unknownClasses: string[]  // Classes with no mapping
  sizeBytes: number         // Byte size of CSS
  engine: "rust"            // Engine used
}
```

---

### extractAllClasses

Extracts all Tailwind classes from source code.

```typescript
import { extractAllClasses } from "@tailwind-styled/compiler"

const classes = extractAllClasses(source: string): string[]
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| source | `string` | Source code to scan |

**Returns:** `string[]` - Sorted array of unique class names

---

### Dead Style Eliminator (DSE)

The compiler includes a built-in Dead Style Eliminator to remove unused CSS at build time.

```typescript
import {
  runElimination,
  eliminateDeadCss,
  optimizeCss,
  scanProjectUsage,
  extractComponentUsage,
  findDeadVariants,
  type EliminationReport,
  type RegisteredComponent,
} from "@tailwind-styled/compiler"
```

#### runElimination

Run the full DSE pipeline:

```typescript
const result = runElimination({
  dirs: ["src"],           // Directories to scan
  cwd: process.cwd(),      // Project root
  registered: [           // Registered component configs
    {
      name: "Button",
      variants: {
        size: { sm: "text-sm", lg: "text-lg", xl: "text-xl" }
      }
    }
  ],
  inputCss: cssString,    // Compiled CSS
  verbose: true           // Log results
})

console.log(result.css)      // Optimized CSS
console.log(result.report)   // Elimination report
```

#### scanProjectUsage

Scan project files for component usage:

```typescript
const usage = scanProjectUsage(["src"], process.cwd())
// → { Button: { size: Set(["sm", "lg"]) } }
```

#### findDeadVariants

Find unused variants by comparing registered components with actual usage:

```typescript
const report = findDeadVariants(registered, usage)
// → { unusedCount: 1, bytesSaved: 60, components: {...} }
```

#### eliminateDeadCss

Remove dead CSS rules from compiled output:

```typescript
const cleaned = eliminateDeadCss(css, deadClasses)
```

#### optimizeCss

Merge duplicate CSS rules:

```typescript
const optimized = optimizeCss(css)
// ".tw-a1,.tw-b1 { padding: 16px }"
```

---

### Incremental Engine

```typescript
import {
  getIncrementalEngine,
  IncrementalEngine,
  resetIncrementalEngine,
  type IncrementalEngineOptions,
  type IncrementalStats,
} from "@tailwind-styled/compiler"
```

---

### RSC Analyzer

```typescript
import {
  analyzeFile,
  type RscAnalysis,
} from "@tailwind-styled/compiler"

const analysis = analyzeFile(source, filename)
// → { isServer: false, needsClientDirective: true, clientReasons: [...] }
```

---

### Style Bucket System

```typescript
import {
  BucketEngine,
  getBucketEngine,
  resetBucketEngine,
  type BucketStats,
  type StyleBucket,
} from "@tailwind-styled/compiler"
```

---

## Breaking Changes from v4.5

### 1. Native Binding is REQUIRED

v5 **requires** the native binding to be available. The JS fallback has been removed.

```typescript
// v4.5 - Would return fallback if native unavailable
const result = compileCssFromClasses(classes)

// v5 - THROWS if native binding not found
const result = compileCssFromClasses(classes)
// Error: Native CSS binding is required but not available.
```

If you need to disable native binding (not recommended), set `TWS_NO_NATIVE=1` but note this will throw an error in v5.

### 2. Mode Option Removed

The `mode` option has been removed. v5 only supports zero-runtime mode.

```typescript
// v4.5
transformSource(source, { mode: "zero-runtime" })

// v5 - mode parameter is deprecated, only zero-runtime is supported
transformSource(source, {})
// Warning: mode option is deprecated in v5. Only zero-runtime is supported.
```

### 3. API Streamlined

v5 reorganizes exports:

| v4.5 (deprecated) | v5 (recommended) |
|-------------------|------------------|
| `@tailwind-styled/compiler` | `@tailwind-styled/compiler` (core functions only) |
| Functions exported inline | Use `@tailwind-styled/compiler/internal` for advanced features |

**Core public API (v5):**
- `transformSource`
- `compileCssFromClasses`
- `buildStyleTag`
- `extractAllClasses`
- `runElimination`, `eliminateDeadCss`, `optimizeCss`, `scanProjectUsage`, `extractComponentUsage`, `findDeadVariants`
- `getIncrementalEngine`, `IncrementalEngine`, `resetIncrementalEngine`
- `analyzeFile`
- `BucketEngine`, `getBucketEngine`, `resetBucketEngine`

**Deprecated exports** (still available but will be removed in v6):
- Most internal functions are now deprecated from the main export. Use `@tailwind-styled/compiler/internal` instead.

### 4. Exports Changes

The following exports have been moved:

| v4.5 | v5 |
|------|-----|
| `compileWithCore` | `@tailwind-styled/compiler/internal` |
| `loadTailwindConfig` | `@tailwind-styled/compiler/internal` |
| `generateAtomicCss` | `@tailwind-styled/compiler/internal` |
| `Pipeline` | `@tailwind-styled/compiler/internal` |
| `NativeBridge` types | `@tailwind-styled/compiler/internal` |

---

## Dead Style Elimination (DSE)

DSE removes unused variant styles from your CSS output, significantly reducing bundle size.

### Basic Usage

```typescript
import { runElimination } from "@tailwind-styled/compiler"
import fs from "node:fs"

const css = fs.readFileSync("dist/styles.css", "utf-8")

const result = runElimination({
  dirs: ["src"],
  registered: [
    { name: "Button", variants: { size: { sm: "text-sm", lg: "text-lg", xl: "text-xl" } } }
  ],
  inputCss: css,
  verbose: true
})

fs.writeFileSync("dist/styles.min.css", result.css)
```

### How It Works

1. **Scan** - Scans all `.ts`/`.tsx` files for component usage
2. **Analyze** - Extracts which variant props/values are used
3. **Compare** - Matches against registered component configs
4. **Eliminate** - Removes CSS for unused variants
5. **Optimize** - Merges duplicate rules

### Registration

Components must be registered for DSE to work:

```typescript
const registered = [
  {
    name: "Button",
    variants: {
      size: { sm: "text-sm", lg: "text-lg", xl: "text-xl" },
      intent: { primary: "bg-blue-500", danger: "bg-red-500" }
    }
  }
]
```

---

## Internal API

For advanced usage, import from `@tailwind-styled/compiler/internal`:

```typescript
import {
  // Atomic CSS
  generateAtomicCss,
  getAtomicRegistry,
  parseAtomicClass,
  toAtomicClasses,
  
  // Config
  loadTailwindConfig,
  isZeroConfig,
  
  // Tailwind Engine
  generateCssForClasses,
  generateAllRouteCss,
  
  // Route CSS
  registerFileClasses,
  getAllRoutes,
  
  // Variant Compiler
  compileVariants,
  generateVariantCode,
  
  // Native Bridge
  getNativeBridge,
  adaptNativeResult,
  
  // Core
  compileWithCore,
  Pipeline,
  
  // And many more...
} from "@tailwind-styled/compiler/internal"
```

**Note:** Internal APIs may change at any time without notice. Use only when necessary.

---

## Error Handling

v5 throws errors when native binding is unavailable:

```typescript
try {
  const result = compileCssFromClasses(classes)
} catch (error) {
  if (error.message.includes("Native CSS binding")) {
    // Build the native module or check installation
  }
}
```
