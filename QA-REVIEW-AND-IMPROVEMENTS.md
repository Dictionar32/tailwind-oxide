# QA Review & Improvements — tailwind-styled-v4 v5.0.4

> **Generated:** 2026-04-02
> **Scope:** Full codebase review as QA/Code Reviewer
> **Philosophy:** Rust-only, zero-compromise performance, add features not remove them
> **Last session fixes:** See [Session Fixes](#session-fixes-2026-04-02) below

---

## Session Fixes (2026-04-02)

### TypeScript
- ✅ `as any`: 33+ → 0 (eliminated all unsafe type assertions)
- ✅ `window as any`: 10+ → 0 (centralized Window declarations in `shared/src/global.d.ts`)
- ✅ `as unknown as`: 17 → 2 (only genuinely necessary ones)
- ✅ Type duplication: 5 types consolidated to `shared/src/index.ts` (VariantValue, VariantProps, HtmlTagName, CompoundCondition, VariantMatrix)
- ✅ `reverseLookup.ts`: O(n²) `results.find()` → O(n) Map lookup in `findByProperty`
- ✅ `reverseLookup.ts`: Fixed `findClosingBrace` returning wrong fallback position
- ✅ `ir.ts`: `PropertyId`/`ValueId` made immutable — `name` via constructor instead of post-construction mutation
- ✅ `cssToIr.ts`: Updated to use new `PropertyId`/`ValueId` constructors
- ✅ `cv.ts`: Added dev-mode variant validation (warns on invalid values, validates defaultVariants)
- ✅ `logger.ts`: Fixed `debug()` using `console.error` → `console.debug`
- ✅ `boundary.ts`: Created `tw boundary` CLI command for RSC boundary analysis
- ✅ `telemetry.ts`: Created `TelemetryCollector` for build performance tracking
- ✅ `error-codes.ts`: Created error code registry with suggestions
- ✅ `turbopackLoader.ts`: Router-aware (App Router auto-enables client boundary)
- ✅ `withTailwindStyled.ts`: Added Next.js version check
- ✅ `SETUP.md`: Fixed copy-paste errors in command descriptions

### Rust
- ✅ Phase 3 AST optimizer integrated into `transform_source()` — hybrid AST/regex pipeline
- ✅ `oxc_parser.rs`: Fixed unsound `std::mem::transmute` → raw pointer dereference
- ✅ `oxc_parser.rs`: Removed redundant regex alternatives (covered by `\w+`)
- ✅ `oxc_parser.rs`: Simplified deduplication (removed redundant BTreeSet)
- ✅ `Cargo.toml`: Added `codegen-units = 1` and `panic = "abort"` for smaller binary
- ✅ 67/67 tests passing, 0 warnings

---

## Table of Contents

| # | Area | Status | Priority |
|---|------|--------|----------|
| 1 | [Rust Native Bridge](#1-rust-native-bridge) | Perkuat | P0 |
| 2 | [Tailwind Compatibility](#2-tailwind-compatibility) | Perkuat | P2 |
| 3 | [RSC Boundary Detection](#3-rsc-boundary-detection) | ✅ CLI done | P1 |
| 4 | [Testing Infrastructure](#4-testing-infrastructure) | ✅ Snapshots added | P1 |
| 5 | [Scanner Cache](#5-scanner-cache) | Perkuat | P3 |
| 6 | [Variant Validation](#6-variant-validation) | ✅ Done | P2 |
| 7 | [Turbopack / Next.js](#7-turbopack--nextjs) | ✅ Done | P2 |
| 8 | [Error System](#8-error-system) | ✅ Registry done | P1 |
| 9 | [Supply Chain](#9-supply-chain) | Perkuat | P0 |
| 10 | [CI Pipeline](#10-ci-pipeline) | Perkuat | P1 |
| 11 | [Bug Fixes](#11-bug-fixes) | ✅ Partially fixed | P3 |
| 12 | [Incremental Watch](#12-incremental-watch) | Baru | P1 |
| 13 | [Parallel Scanner](#13-parallel-scanner) | Baru | P2 |
| 14 | [Performance Telemetry](#14-performance-telemetry) | ✅ Done | P1 |
| 15 | [HMR Integration](#15-hmr-integration) | Baru | P3 |
| 16 | [Binary Size](#16-binary-size) | ✅ Done | P2 |
| 17 | [any Type Elimination](#17-any-type-elimination) | Baru | P1 |
| 18 | [Silent Error Handling](#18-silent-error-handling-catch-) | Baru | P1 |
| 19 | [Zod Boundary Validation](#19-zod-boundary-validation-gap) | Baru | P2 |
| 20 | [Rust TS Type Drift Prevention](#20-rust--typescript-type-drift-prevention) | Baru | P2 |
| 21 | [Rust Cargo.toml Inconsistencies](#21-rust-cargotoml-inconsistencies) | Perbaiki | P2 |
| 22 | [Thread Pool Adaptive Threshold](#22-thread-pool-adaptive-threshold) | Perkuat | P2 |
| 23 | [OXC Parser Version Gap](#23-oxc-parser-version-gap) | Perbaiki | P2 |
| 24 | [tsconfig Path Alias Conflict](#24-tsconfig-path-alias-vs-workspace-build-conflict) | Perbaiki | P1 |
| 25 | [Example App RSC Detection](#25-example-app-missing-use-client-detection) | Perbaiki | P3 |
| 26 | [Documentation Gaps](#26-documentation-gaps) | Perbaiki | P3 |
| 27 | [Script Env Var Mismatch](#27-script-environment-variable-mismatch) | Perbaiki | P2 |
| 28 | [Schema Pipeline Blocked](#28-generate-json-schemasmjs-blocked-oleh-missing-binary) | Perbaiki | P2 |
| 29 | [native-tools.mjs Missing Check](#29-native-toolsmjs-missing-linuxmacos-auto-bootstrap) | Perkuat | P3 |
| 30 | [generate.js CJS vs ESM](#30-testfixtureslarge-projectgeneratejs-uses-cjs) | Perbaiki | P3 |
| 31 | [reverseLookup lastIndex](#31-reverselookupts-manual-lastindex-manipulation) | Perbaiki | P3 |
| 32 | [ID Generator Race Condition](#32-id-generator-module-level-state-race-condition) | Perkuat | P3 |
| 33 | [ParsedCache Never Cleared](#33-reverselookupts-parsedcache-never-cleared) | Perkuat | P3 |
| 34 | [package.json Scripts](#34-packagejson-scripts-inconsistency) | Perbaiki | P3 |

---

## 1. Rust Native Bridge

### Current State

Native binding **wajib** — no JS fallback. By design untuk performa maksimal.

**Key locations:**
- `packages/compiler/src/nativeBridge.ts:69-76` — `NATIVE_UNAVAILABLE_MESSAGE`: *"There is no JavaScript fallback."*
- `packages/scanner/src/native-bridge.ts:96-119` — throw `TwError` `SCANNER_NATIVE_BINDING_NOT_FOUND`
- `packages/compiler/src/coreCompiler.ts:153-159` — throw `TwError` `NATIVE_TRANSFORM_UNAVAILABLE`

### Rekomendasi

#### 1a. Prebuilt Binary Resolution

```typescript
// packages/shared/src/native-resolution.ts

const PLATFORM_MAP: Record<string, string[]> = {
  "linux-x64":    ["@tailwind-styled/native-linux-x64"],
  "linux-arm64":  ["@tailwind-styled/native-linux-arm64"],
  "darwin-x64":   ["@tailwind-styled/native-darwin-x64"],
  "darwin-arm64": ["@tailwind-styled/native-darwin-arm64"],
  "win32-x64":    ["@tailwind-styled/native-win32-x64"],
}

export function resolveNativeBinary(): string {
  const key = `${process.platform}-${process.arch}`

  // 1. Prebuilt binary dari npm (auto-installed via optionalDependencies)
  for (const pkg of PLATFORM_MAP[key] ?? []) {
    try {
      return require.resolve(`${pkg}/index.node`)
    } catch {}
  }

  // 2. Local build (developer mode)
  const localCandidates = [
    path.resolve(process.cwd(), "native/tailwind_styled_parser.node"),
    path.resolve(process.cwd(), "native/build/Release/tailwind_styled_parser.node"),
    path.resolve(process.cwd(), "native/target/release/tailwind_styled_parser.node"),
  ]
  for (const p of localCandidates) {
    if (fs.existsSync(p)) return p
  }

  // 3. Tidak ada — throw dengan instruksi lengkap
  throw new TwError("rust", "NATIVE_NOT_FOUND", [
    "Native Rust binary not found.",
    "",
    "This package REQUIRES native Rust bindings for maximum performance.",
    "",
    "Quick fix:",
    `  npm install ${PLATFORM_MAP[key]?.[0] ?? "@tailwind-styled/native-*"}`,
    "",
    "pnpm/yarn (strict node_modules):",
    "  pnpm approve-builds tailwind-styled-v4",
    "",
    "Build from source (requires Rust toolchain):",
    "  npm run build:rust",
    "",
    `Detected: ${key}`,
    `Node: ${process.version}`,
  ].join("\n"))
}
```

#### 1b. Binary Health Check

```typescript
// packages/shared/src/native-health.ts

export interface BinaryHealthReport {
  found: boolean
  path: string | null
  loadable: boolean
  version: string | null
  platform: string
  arch: string
  sizeBytes: number
  sizeHuman: string
  loadTimeMs: number
  checksumValid: boolean
  exports: string[]
}

export async function checkBinaryHealth(): Promise<BinaryHealthReport> {
  const start = performance.now()
  const platform = `${process.platform}-${process.arch}`

  const report: BinaryHealthReport = {
    found: false, path: null, loadable: false, version: null,
    platform, arch: process.arch, sizeBytes: 0, sizeHuman: "0 B",
    loadTimeMs: 0, checksumValid: false, exports: [],
  }

  try {
    const binaryPath = resolveNativeBinary()
    report.found = true
    report.path = binaryPath

    const stat = fs.statSync(binaryPath)
    report.sizeBytes = stat.size
    report.sizeHuman = formatBytes(stat.size)

    const binding = require(binaryPath)
    report.loadable = true
    report.exports = Object.keys(binding).filter(k => typeof binding[k] === "function")
    report.version = binding.version ?? null
    report.checksumValid = verifyBinaryChecksum(binaryPath, process.platform, process.arch)
  } catch {}

  report.loadTimeMs = performance.now() - start
  return report
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
```

#### 1c. Postinstall Auto-Resolve

```javascript
// scripts/resolve-native.mjs

import { createRequire } from "node:module"

const platform = process.platform
const arch = process.arch
const key = `${platform}-${arch}`
const pkg = `@tailwind-styled/native-${key}`

try {
  const resolved = createRequire(import.meta.url).resolve(pkg)
  console.log(`[tailwind-styled] Native binary ready (${key})`)
} catch {
  console.warn(
    `[tailwind-styled] Prebuilt binary for ${key} not available.\n` +
    `Install: npm install ${pkg}\n` +
    `Or build: npm run build:rust`
  )
}
```

```json
// package.json
{
  "scripts": {
    "postinstall": "node scripts/resolve-native.mjs"
  },
  "optionalDependencies": {
    "@tailwind-styled/native-linux-x64": "^5.0.4",
    "@tailwind-styled/native-linux-arm64": "^5.0.4",
    "@tailwind-styled/native-darwin-arm64": "^5.0.4",
    "@tailwind-styled/native-darwin-x64": "^5.0.4",
    "@tailwind-styled/native-win32-x64": "^5.0.4"
  }
}
```

---

## 2. Tailwind Compatibility

### Current State

- `package.json:210-220` — peerDependencies: `tailwindcss ^4`
- `packages/core/src/index.ts:39-40` — Parser: *"Tailwind v4 class parser"*
- `cssToIr.ts` — Layer order: `{ base: 0, components: 1, utilities: 2, tailwind: 3 }`

### Rekomendasi

#### 2a. Version Detection

```typescript
// packages/core/src/compatibility.ts

interface TailwindInfo {
  version: string
  major: number
  supported: boolean
  path: string | null
}

export function detectTailwind(): TailwindInfo {
  try {
    const pkgPath = require.resolve("tailwindcss/package.json")
    const { version } = require(pkgPath)
    const major = parseInt(version.split(".")[0], 10)
    return { version, major, supported: major >= 4, path: pkgPath }
  } catch {
    return { version: "not-installed", major: 0, supported: false, path: null }
  }
}

export function assertTailwindV4(): void {
  const info = detectTailwind()
  if (!info.supported) {
    throw new TwError(
      "compatibility",
      "TAILWIND_VERSION_UNSUPPORTED",
      [
        `tailwind-styled-v4 requires Tailwind CSS v4.x`,
        `Found: v${info.version}`,
        "",
        "Upgrade:",
        "  npm install tailwindcss@^4 @tailwindcss/postcss@^4",
        "",
        "Migration guide: https://tailwindcss.com/docs/upgrade-guide",
      ].join("\n")
    )
  }
}
```

#### 2b. Feature Detection

```typescript
// packages/core/src/feature-detect.ts

export interface V4Features {
  cssVariables: boolean       // @theme inline
  containerQueries: boolean   // @container
  cascadeLayers: boolean      // @layer
  logicalProperties: boolean  // ms-*, me-*, ps-*, pe-*
  ariaVariants: boolean       // aria-[selected=true]:*
  dataVariants: boolean       // data-[size=lg]:*
}

export function detectFeatures(): V4Features {
  return {
    cssVariables: true,
    containerQueries: true,
    cascadeLayers: true,
    logicalProperties: true,
    ariaVariants: true,
    dataVariants: true,
  }
}
```

---

## 3. RSC Boundary Detection

### Current State

- `packages/compiler/src/astTransform.ts:316` — `analyzeFile(source, filename)`
- `astTransform.ts:343-349` — Result: `isServer`, `needsClientDirective`, `clientReasons`
- `astTransform.ts:593-594` — Auto-inject `'use client'`
- `astTransform.ts:301-303` — Fast exit jika `!hasTwUsage(source)`

### Rekomendasi

#### 3a. Enhanced Detection

```typescript
// packages/compiler/src/rscAnalyzer.ts

export interface RscAnalysis {
  isServer: boolean
  needsClientDirective: boolean
  clientReasons: string[]
  detectedPatterns: string[]  // Pattern yang memicu client boundary
  confidence: number          // 0-1 score
}

export function analyzeFile(source: string, filename: string): RscAnalysis {
  const reasons: string[] = []
  const patterns: string[] = []

  // Existing checks...

  // Deteksi React hooks
  const hookRe = /\buse(State|Effect|Context|Ref|Memo|Callback|Reducer|LayoutEffect|ImperativeHandle|Transition|Id|SyncExternalStore|InsertionEffect)\b/
  if (hookRe.test(source)) {
    reasons.push("uses React hooks")
    patterns.push("hooks")
  }

  // Deteksi event handlers
  const eventRe = /\bon(Click|Change|Submit|Key|Mouse|Focus|Blur|Input|Scroll|Touch|Drag|Transition|Pointer)\s*=/
  if (eventRe.test(source)) {
    reasons.push("has event handlers")
    patterns.push("event-handlers")
  }

  // Deteksi browser APIs
  const browserRe = /\b(window|document|navigator|localStorage|sessionStorage|setTimeout|setInterval|fetch|requestAnimationFrame)\b/
  if (browserRe.test(source)) {
    reasons.push("uses browser APIs")
    patterns.push("browser-apis")
  }

  return {
    isServer: reasons.length === 0 && !hasExplicitUseClient,
    needsClientDirective: reasons.length > 0 && !hasExplicitUseClient,
    clientReasons: reasons,
    detectedPatterns: patterns,
    confidence: reasons.length > 0 ? Math.min(reasons.length * 0.3, 1) : 0.95,
  }
}
```

#### 3b. Boundary CLI Command

```typescript
// packages/cli/src/commands/boundary.ts

export async function runBoundaryCli(args: string[], context: CommandContext): Promise<void> {
  const root = resolveCwd(args)
  const { scanWorkspaceAsync } = await import("@tailwind-styled/scanner")
  const result = await scanWorkspaceAsync(root)

  const report: Array<{ file: string; type: "server" | "client"; reasons: string[] }> = []

  for (const file of result.files) {
    const source = readFileSync(file.file, "utf8")
    const analysis = analyzeFile(source, file.file)
    report.push({
      file: file.file,
      type: analysis.isServer ? "server" : "client",
      reasons: analysis.clientReasons,
    })
  }

  const servers = report.filter(r => r.type === "server")
  const clients = report.filter(r => r.type === "client")

  context.output.writeText("")
  context.output.writeText("RSC Boundary Report")
  context.output.writeText(`  Server Components: ${servers.length}`)
  context.output.writeText(`  Client Components: ${clients.length}`)
  context.output.writeText(`  Server ratio: ${((servers.length / report.length) * 100).toFixed(1)}%`)

  if (clients.length > 0) {
    context.output.writeText("")
    context.output.subHeader("Client Components")
    for (const c of clients) {
      context.output.listItem(`${c.file}`)
      for (const r of c.reasons) {
        context.output.listItem(`  ${r}`)
      }
    }
  }
}
```

**Usage:** `tw boundary [target]`

---

## 4. Testing Infrastructure

### Current State

- `turbo.json:25-28` — Test task: `dependsOn: ["build"]`, `outputs: []`
- `package.json:195` — `"test": "turbo run test --continue"`
- Test runner: `node --test` (Node.js built-in)
- 47 test files across packages
- No code coverage. No E2E browser tests.

### Rekomendasi

#### 4a. Code Coverage

```json
// package.json
{
  "scripts": {
    "test:coverage": "c8 --reporter=text --reporter=html --reporter=lcov turbo run test --continue",
    "test:coverage:check": "c8 --check-coverage --lines 80 --branches 75 --functions 80 turbo run test --continue"
  },
  "devDependencies": {
    "c8": "^10.0.0"
  }
}
```

#### 4b. E2E Browser Tests (Playwright)

```typescript
// e2e/next-app.test.ts

import { test, expect } from "@playwright/test"

test.describe("tailwind-styled-v4 E2E", () => {
  test("template literal renders correct classes", async ({ page }) => {
    await page.goto("http://localhost:3000")
    const el = page.locator("[data-testid='hero-title']")
    await expect(el).toHaveClass(/text-4xl/)
    await expect(el).toHaveClass(/font-bold/)
  })

  test("variant props apply correct classes", async ({ page }) => {
    await page.goto("http://localhost:3000/components")
    const sm = page.locator("[data-size='sm']")
    const lg = page.locator("[data-size='lg']")
    await expect(sm).toHaveClass(/text-sm/)
    await expect(lg).toHaveClass(/text-lg/)
  })

  test("dynamic class merging via tailwind-merge", async ({ page }) => {
    await page.goto("http://localhost:3000/merge-test")
    const el = page.locator("[data-testid='merged']")
    await expect(el).toHaveClass(/bg-red-500/)
    await expect(el).not.toHaveClass(/bg-blue-500/)
  })

  test("RSC boundary auto-injects 'use client'", async ({ page }) => {
    await page.goto("http://localhost:3000")
    const js = await page.evaluate(async () => {
      const res = await fetch("/_next/static/chunks/app/page.js")
      return res.text()
    })
    expect(js).toContain('"use client"')
  })

  test("dark mode toggle works", async ({ page }) => {
    await page.goto("http://localhost:3000")
    await page.locator("[data-testid='dark-mode-toggle']").click()
    await expect(page.locator("html")).toHaveClass(/dark/)
  })
})
```

#### 4c. Snapshot Testing

```typescript
// packages/compiler/test/snapshot.test.mjs

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"

const SNAP_DIR = resolve(import.meta.dirname, "__snapshots__")
mkdirSync(SNAP_DIR, { recursive: true })

function snap(name: string, actual: string) {
  const p = resolve(SNAP_DIR, `${name}.snap`)
  if (!existsSync(p) || process.env.UPDATE_SNAPSHOTS) {
    writeFileSync(p, actual, "utf8")
    return
  }
  assert.equal(actual, readFileSync(p, "utf8"), `Snapshot mismatch: ${name}`)
}

describe("transform snapshots", () => {
  it("static template literal", () => {
    const src = `const Box = tw.div\`flex items-center p-4\``
    snap("static-template", transformSource(src).code)
  })

  it("variant object config", () => {
    const src = `const Btn = tw.button({ base: "px-4 py-2", variants: { size: { sm: "text-sm", lg: "text-lg" } } })`
    snap("variant-object", transformSource(src).code)
  })

  it("compound component with sub-blocks", () => {
    const src = `const Card = tw.div\`rounded-lg\` Card.Header { text-xl } Card.Body { p-4 }`
    snap("compound-component", transformSource(src).code)
  })

  it("extend pattern", () => {
    const src = `const Base = tw.div\`flex\`; const Extended = Base.extend\`bg-blue-500\``
    snap("extend-pattern", transformSource(src).code)
  })

  it("wrap pattern", () => {
    const src = `const Wrapped = tw(SomeComponent)\`mt-4\``
    snap("wrap-pattern", transformSource(src).code)
  })

  it("server-only component", () => {
    const src = `const ServerBox = tw.server.div\`flex p-4\``
    snap("server-only", transformSource(src).code)
  })
})
```

---

## 5. Scanner Cache

### Current State

- `packages/scanner/src/cache-native.ts` — `NativeCacheEntry`: `file`, `classes`, `hash`, `mtimeMs`, `size`, `hitCount`
- `packages/scanner/src/index.ts:394-435` — Invalidation: triple check (hash, mtimeMs, size)
- `filePriority()` — Rust SmartCache algorithm

### Rekomendasi

#### 5a. Stale Entry Cleanup

```typescript
// packages/scanner/src/cache-native.ts

export interface NativeCacheEntry {
  file: string
  classes: string[]
  hash: string
  mtimeMs: number
  size: number
  hitCount: number
  lastSeenMs: number   // Terakhir file ditemukan di filesystem
}

export function cleanStaleEntries(
  entries: NativeCacheEntry[],
  candidates: Set<string>,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000  // 7 hari
): { cleaned: NativeCacheEntry[]; removedCount: number } {
  const nowMs = Date.now()
  const cleaned: NativeCacheEntry[] = []
  let removed = 0

  for (const entry of entries) {
    if (candidates.has(entry.file)) {
      cleaned.push(entry)
    } else if (nowMs - entry.lastSeenMs < maxAgeMs) {
      cleaned.push(entry)  // Baru dihapus, mungkin temp rename
    } else {
      removed++
    }
  }

  return { cleaned, removedCount: removed }
}
```

#### 5b. Cache Statistics

```typescript
// packages/scanner/src/cache-stats.ts

export interface CacheStats {
  totalEntries: number
  hitRate: number
  avgEntrySize: number
  oldestEntryMs: number
  newestEntryMs: number
  staleEntries: number
  totalSizeBytes: number
  totalSizeHuman: string
}

export function computeCacheStats(entries: NativeCacheEntry[]): CacheStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0, hitRate: 0, avgEntrySize: 0,
      oldestEntryMs: 0, newestEntryMs: 0, staleEntries: 0,
      totalSizeBytes: 0, totalSizeHuman: "0 B",
    }
  }

  const totalHits = entries.reduce((s, e) => s + (e.hitCount ?? 0), 0)
  const totalSize = entries.reduce((s, e) => s + (e.size ?? 0), 0)
  const nowMs = Date.now()

  return {
    totalEntries: entries.length,
    hitRate: totalHits / entries.length,
    avgEntrySize: totalSize / entries.length,
    oldestEntryMs: Math.min(...entries.map(e => e.mtimeMs)),
    newestEntryMs: Math.max(...entries.map(e => e.mtimeMs)),
    staleEntries: entries.filter(e => nowMs - e.lastSeenMs > 7 * 24 * 60 * 60 * 1000).length,
    totalSizeBytes: totalSize,
    totalSizeHuman: formatBytes(totalSize),
  }
}
```

#### 5c. Cache Warmup

```typescript
// packages/scanner/src/cache-warmup.ts

export function warmupCache(rootDir: string, options: ScanWorkspaceOptions): void {
  const entryPoints = [
    "src/app/layout.tsx", "src/pages/_app.tsx",
    "src/index.tsx", "src/main.tsx", "src/App.tsx",
  ]
    .map(f => path.join(rootDir, f))
    .filter(fs.existsSync)

  for (const entry of entryPoints) {
    try { scanFile(entry) } catch {}
  }
}
```

---

## 6. Variant Validation

### Current State

- `packages/core/src/cv.ts:36-43` — Silent fail untuk undefined variant values
- TypeScript inference mencegah invalid variants di compile time

### Rekomendasi

#### 6a. Dev-Mode Validation

```typescript
// packages/core/src/cv.ts

export function cv<C extends ComponentConfig>(config: C): CvFn<C> {
  const { base = "", variants = {}, compoundVariants = [], defaultVariants = {} } = config

  const validValues = process.env.NODE_ENV !== "production"
    ? Object.fromEntries(
        Object.entries(variants).map(([k, v]) => [k, new Set(Object.keys(v))])
      )
    : null

  // Dev-mode: validate defaultVariants keys exist in variants
  if (process.env.NODE_ENV !== "production") {
    for (const dk of Object.keys(defaultVariants)) {
      if (!(dk in variants)) {
        console.warn(`[tailwind-styled] defaultVariants["${dk}"] not defined in variants`)
      }
    }
  }

  return (props = {} as never): string => {
    const classes = [base]

    for (const key in variants) {
      const val = props[key] ?? defaultVariants[key]

      if (process.env.NODE_ENV !== "production" && validValues && val !== undefined) {
        const strVal = String(val)
        if (!validValues[key]!.has(strVal)) {
          console.warn(
            `[tailwind-styled] Invalid variant: ${key}="${strVal}". ` +
            `Valid: ${Array.from(validValues[key]!).join(", ")}`
          )
        }
      }

      if (val !== undefined && variants[key]?.[String(val)]) {
        classes.push(variants[key]![String(val)])
      }
    }

    for (const compound of compoundVariants) {
      const { class: cls, ...conditions } = compound
      if (Object.entries(conditions).every(([k, v]) => props[k] === v)) {
        classes.push(cls)
      }
    }

    if (props.className) classes.push(props.className)
    return twMerge(...classes)
  }
}
```

#### 6b. Variant Coverage Report

```typescript
// packages/analyzer/src/variant-coverage.ts

export interface VariantCoverageReport {
  component: string
  file: string
  variants: Array<{
    name: string
    definedValues: string[]
    usedValues: string[]
    unusedValues: string[]
    coverage: number  // 0-1
  }>
}

export function analyzeVariantCoverage(
  sourceFiles: string[],
  configs: Map<string, ComponentConfig>
): VariantCoverageReport[] {
  // Parse source files, extract variant usage, compare with definitions
  // Return coverage report
}
```

---

## 7. Turbopack / Next.js

### Current State

- `packages/next/src/turbopackLoader.ts` — Generic transform loader
- `package.json:228` — devDependencies: `next: "^16.2.1"`
- No version-specific logic. No App Router vs Pages Router differentiation.

### Rekomendasi

#### 7a. Smart Loader

```typescript
// packages/next/src/turbopackLoader.ts

export default function turbopackLoader(
  this: TurbopackContext,
  source: string,
  options: TurbopackLoaderOptions = {}
): string {
  const isAppRouter = /[/\\]app[/\\]/.test(this.resourcePath)
  const isPagesRouter = /[/\\]pages[/\\]/.test(this.resourcePath)

  const effective = {
    addDataAttr: parseBool(options.addDataAttr),
    autoClientBoundary: isAppRouter ? true : parseBool(options.autoClientBoundary),
    hoist: parseBool(options.hoist),
    preserveImports: isPagesRouter ? true : true,
  }

  const directiveMatch = source.match(/^\s*"use (client|server)"\s*;?\s*\n/)
  const directive = directiveMatch ? `"use ${directiveMatch[1]}";\n` : ""

  const output = runLoaderTransform({
    filepath: this.resourcePath, source, options: effective,
  })

  if (!directive) return output.code

  const stripped = output.code.replace(/"use (client|server)"\s*;?\s*\n?/g, "")
  return directive + stripped
}
```

#### 7b. Version Check

```typescript
// packages/next/src/withTailwindStyled.ts

export function withTailwindStyled(config: NextConfig = {}): NextConfig {
  try {
    const { version } = require("next/package.json")
    const major = parseInt(version.split(".")[0], 10)
    if (major < 15) {
      console.warn(
        `[tailwind-styled] Next.js ${version} detected. Recommended: 15+.`
      )
    }
  } catch {}

  return { ...config }
}
```

#### 7c. Server Actions Detection

```typescript
// packages/compiler/src/rscAnalyzer.ts

export function detectServerActions(source: string): string[] {
  const actions: string[] = []
  const re = /(?:async\s+function\s+(\w+)|const\s+(\w+)\s*=\s*async)\s*\([^)]*\)\s*\{[^}]*"use server"/g
  for (const m of source.matchAll(re)) {
    actions.push(m[1] || m[2])
  }
  return actions
}
```

---

## 8. Error System

### Current State

- `packages/shared/src/index.ts:65-91` — `TwError` class dengan `domain` + `code`
- Good for native binding errors. No source location for compiler errors.

### Rekomendasi

#### 8a. Source Location in Errors

```typescript
// packages/compiler/src/astTransform.ts

export interface TransformError {
  message: string
  file: string
  line: number
  column: number
  code: string
  suggestion?: string
}

export interface TransformResult {
  code: string
  classes: string[]
  changed: boolean
  rsc?: RscResult
  errors: TransformError[]
  warnings: TransformError[]
}

function getLineColumn(source: string, index: number): { line: number; column: number } {
  const before = source.substring(0, index)
  const lines = before.split("\n")
  return { line: lines.length, column: lines[lines.length - 1].length + 1 }
}
```

#### 8b. Error Code Registry

```typescript
// packages/shared/src/error-codes.ts

export const ERROR_CODES = {
  // E0xx — Native binding
  NATIVE_NOT_FOUND:          "E001",
  NATIVE_LOAD_FAILED:        "E002",
  NATIVE_VERSION_MISMATCH:   "E003",
  SCANNER_NATIVE_NOT_FOUND:  "E004",
  SCANNER_HASH_FAILED:       "E005",

  // E2xx — Compilation
  MISSING_REACT_IMPORT:      "E201",
  UNSUPPORTED_PATTERN:       "E202",

  // W1xx — Warnings
  DYNAMIC_CONTENT:           "W101",
  INVALID_VARIANT_VALUE:     "W201",

  // E3xx — Compatibility
  TAILWIND_VERSION_UNSUPPORTED: "E301",

  // E4xx — Cache
  CACHE_READ_FAILED:         "E401",
  CACHE_WRITE_FAILED:        "E402",
  CACHE_CORRUPTED:           "E403",

  // E5xx — RSC
  RSC_BOUNDARY_CONFLICT:     "E501",
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
```

#### 8c. Format Helpers

```typescript
// packages/shared/src/errors.ts

export function formatForIDE(error: TransformError): string {
  return `${error.file}:${error.line}:${error.column} — ${error.message} (${error.code})`
}

export function formatForTerminal(error: TransformError): string {
  const loc = `${error.file}:${error.line}:${error.column}`
  const msg = `${error.code}: ${error.message}`
  const hint = error.suggestion ? `\n  suggestion: ${error.suggestion}` : ""
  return `  ${loc}\n  ${msg}${hint}`
}
```

---

## 9. Supply Chain

### Current State

- `package.json:189` — `"build:rust": "cd native && cargo build --release"`
- User HARUS punya Rust toolchain. No prebuilt binaries. No integrity check.

### Rekomendasi

#### 9a. CI for Prebuilt Binaries

```yaml
# .github/workflows/native-build.yml

name: Build Native Binaries
on:
  release:
    types: [published]

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            arch: linux-x64
          - os: ubuntu-latest
            target: aarch64-unknown-linux-gnu
            arch: linux-arm64
          - os: macos-latest
            target: aarch64-apple-darwin
            arch: darwin-arm64
          - os: macos-latest
            target: x86_64-apple-darwin
            arch: darwin-x64
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            arch: win32-x64

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - run: cargo build --release --target ${{ matrix.target }}
        working-directory: native

      - run: |
          mkdir -p npm/@tailwind-styled/native-${{ matrix.arch }}
          cp native/target/release/*.node npm/@tailwind-styled/native-${{ matrix.arch }}/

      - run: npm publish --access public
        working-directory: npm/@tailwind-styled/native-${{ matrix.arch }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### 9b. Binary Integrity

```typescript
// packages/shared/src/binary-integrity.ts

import { createHash } from "node:crypto"

const CHECKSUMS: Record<string, string> = {
  "linux-x64":    "sha256:PLACEHOLDER",
  "linux-arm64":  "sha256:PLACEHOLDER",
  "darwin-arm64": "sha256:PLACEHOLDER",
  "darwin-x64":   "sha256:PLACEHOLDER",
  "win32-x64":    "sha256:PLACEHOLDER",
}

export function verifyBinaryChecksum(binaryPath: string): boolean {
  const key = `${process.platform}-${process.arch}`
  const expected = CHECKSUMS[key]
  if (!expected) return true

  const content = fs.readFileSync(binaryPath)
  const actual = "sha256:" + createHash("sha256").update(content).digest("hex")

  if (actual !== expected) {
    throw new TwError("security", "BINARY_CHECKSUM_MISMATCH",
      `Binary checksum mismatch for ${key}.\nExpected: ${expected}\nActual: ${actual}\nReinstall: npm install tailwind-styled-v4`
    )
  }
  return true
}
```

---

## 10. CI Pipeline

### Current State

- `turbo.json:25-28` — Test: `dependsOn: ["build"]`, `outputs: []`
- `package.json:195` — `"test": "turbo run test --continue"`
- No CI config. No coverage gate.

### Rekomendasi

#### 10a. GitHub Actions

```yaml
# .github/workflows/ci.yml

name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - run: npm ci
      - run: npm run build:rust
      - run: npm run build:packages
      - run: npm test -- -- --reporter=junit --output-file=junit.xml

      - name: Test results
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: Test Results
          path: "**/junit.xml"
          reporter: jest-junit

      - name: Coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

      - name: Coverage gate
        if: always()
        run: node scripts/check-coverage-threshold.mjs
```

#### 10b. turbo.json Update

```json
{
  "tasks": {
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "env": ["CI", "NODE_ENV"]
    }
  }
}
```

---

## 11. Bug Fixes

### 11a. ID Generator Race Condition — ⚠️ PARTIALLY FIXED

**Lokasi:** `packages/engine/src/cssToIr.ts:40-74`

Module-level state di-reset via `resetIdGenerator()` — race condition jika concurrent calls.

**Fixed:** `PropertyId`/`ValueId` now immutable — `name` passed via constructor instead of post-construction mutation. The global module state issue remains (factory pattern below still recommended for full fix).

**Lokasi:** `packages/engine/src/cssToIr.ts:40-74`

Module-level state di-reset via `resetIdGenerator()` — race condition jika concurrent calls.

```typescript
// Fix: Factory pattern untuk isolasi
export function createCssParser() {
  const state = {
    ruleIdCounter: 0, selectorIdCounter: 0,
    propertyIdCounter: 0, valueIdCounter: 0,
    layerIdCounter: 0, conditionIdCounter: 0,
    insertionOrderCounter: 0,
  }
  return {
    parseCssToIr(css: string) { /* use local state */ }
  }
}
```

### 11b. Regex manual lastIndex — ✅ FIXED

**Lokasi:** `packages/engine/src/reverseLookup.ts:118-131`

`findClosingBrace` returned `start` (opening brace) when no closing brace found → empty substring.
Replaced with clean for-loop using index, returns `css.length` on failure.

```typescript
// Fixed
private findClosingBrace(css: string, start: number): number {
  let depth = 1
  for (let pos = start + 1; pos < css.length; pos++) {
    const char = css[pos]
    if (char === "{") depth++
    else if (char === "}") {
      depth--
      if (depth === 0) return pos
    }
  }
  return css.length
}
```

### 11c. Dead Style Elimination

**Lokasi:** `packages/compiler/src/coreCompiler.ts:120-148`

`runDeadStyleElimination()` selalu return `""` — result tidak digunakan.

```typescript
private runDeadStyleElimination(classes: string[]): string {
  const native = getNativeBridge()
  if (native?.analyzeClassesNative) {
    try {
      const filesJson = JSON.stringify([{ file: "compiled", classes }])
      const analysis = native.analyzeClassesNative(filesJson, process.cwd(), 0)
      if (analysis?.safelist) {
        const deadClasses = classes.filter(c => !analysis.safelist!.includes(c))
        if (deadClasses.length > 0) {
          // Return dead classes untuk reporting, bukan empty string
          return JSON.stringify(deadClasses)
        }
      }
    } catch {}
  }
  return ""
}
```

### 11d. Logger debug() Menggunakan console.error

**Lokasi:** `packages/shared/src/index.ts:40-48`

```typescript
// Fix
export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`
  return {
    warn(...args)  { console.warn(prefix, ...args) },
    debug(...args) { console.debug(prefix, ...args) },  // Bukan console.error
    error(...args) { console.error(prefix, ...args) },
    log(...args)   { console.log(prefix, ...args) },
  }
}
```

---

## 12. Incremental Watch

### Motivasi

Scan ulang HANYA file yang berubah, bukan seluruh workspace.

### Rekomendasi

```typescript
// packages/scanner/src/watcher.ts

import { watch } from "node:fs"

export interface WatchOptions {
  rootDir: string
  extensions?: string[]
  ignoreDirs?: string[]
  debounceMs?: number
  onChange?: (changedFiles: string[], result: ScanWorkspaceResult) => void
}

export function watchWorkspace(options: WatchOptions): () => void {
  const {
    rootDir,
    extensions = DEFAULT_EXTENSIONS,
    ignoreDirs = DEFAULT_IGNORES,
    debounceMs = 300,
    onChange,
  } = options

  const pending = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    const files = Array.from(pending)
    pending.clear()
    const result = incrementalScan(rootDir, files, { includeExtensions: extensions })
    onChange?.(files, result)
  }

  const watcher = watch(rootDir, { recursive: true }, (_event, filename) => {
    if (!filename) return
    if (!extensions.includes(path.extname(filename))) return
    if (ignoreDirs.some(d => filename.startsWith(d))) return

    pending.add(path.join(rootDir, filename))
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, debounceMs)
  })

  return () => { watcher.close(); if (timer) clearTimeout(timer) }
}
```

```typescript
// packages/engine/src/incremental-engine.ts

export class IncrementalEngine {
  private cache = new Map<string, { hash: string; classes: string[] }>()

  async buildIncremental(changedFiles: string[]): Promise<BuildResult> {
    const affected = new Set<string>()

    for (const file of changedFiles) {
      const content = fs.readFileSync(file, "utf8")
      const hash = hashContent(content)
      if (this.cache.get(file)?.hash === hash) continue

      const classes = scanSource(content)
      this.cache.set(file, { hash, classes })
      for (const cls of classes) affected.add(cls)
    }

    const css = compileClasses(Array.from(affected))
    return { changedClasses: Array.from(affected), css, filesScanned: changedFiles.length }
  }
}
```

**Usage:**
```bash
tw watch [target]                        # Watch mode
tw watch --debounce 500                  # Custom debounce
tw watch --on-change "npm run build"     # Run command on change
```

---

## 13. Parallel Scanner

### Motivasi

Scanner sequential. Parallelize dengan worker threads.

### Rekomendasi

```typescript
// packages/scanner/src/parallel-scanner.ts

import { availableParallelism } from "node:os"
import { Worker } from "node:worker_threads"

export async function scanWorkspaceParallel(
  rootDir: string,
  options: ScanWorkspaceOptions = {}
): Promise<ScanWorkspaceResult> {
  const maxWorkers = Math.max(1, availableParallelism() - 1)
  const chunkSize = 100

  const allFiles = collectCandidates(rootDir, new Set(options.ignoreDirectories ?? DEFAULT_IGNORES), new Set(options.includeExtensions ?? DEFAULT_EXTENSIONS))

  const chunks: string[][] = []
  for (let i = 0; i < allFiles.length; i += chunkSize) {
    chunks.push(allFiles.slice(i, i + chunkSize))
  }

  const workerCount = Math.min(maxWorkers, chunks.length)
  const results = await Promise.all(
    chunks.slice(0, workerCount).map((chunk, i) => runScanWorker(chunk, i))
  )

  return mergeResults(results)
}

function runScanWorker(files: string[], id: number): Promise<ScanFileResult[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH, { workerData: { files, id } })
    worker.on("message", resolve)
    worker.on("error", reject)
  })
}
```

**Target:** 10K files: ~2s sequential → ~0.3s parallel (8 workers)

---

## 14. Performance Telemetry

### Motivasi

Visibility ke performa build — mana yang lambat, cache hit rate, trend.

### Rekomendasi

```typescript
// packages/shared/src/telemetry.ts

export interface BuildTelemetry {
  timestamp: number
  durationMs: number
  filesScanned: number
  filesCached: number
  classesExtracted: number
  nativeVersion: string
  phases: { scan: number; compile: number; engine: number; output: number }
}

export class TelemetryCollector {
  private data: BuildTelemetry[] = []

  record(build: BuildTelemetry): void {
    this.data.push(build)
    this.persist()
  }

  getStats() {
    if (this.data.length === 0) {
      return { avgDuration: 0, p95Duration: 0, cacheHitRate: 0, trend: "stable" as const }
    }

    const durations = this.data.map(d => d.durationMs).sort((a, b) => a - b)
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? durations.at(-1)!

    return {
      avgDuration: avg,
      p95Duration: p95,
      cacheHitRate: this.data.reduce((s, d) => s + d.filesCached, 0) /
                     this.data.reduce((s, d) => s + d.filesScanned, 1),
      trend: this.computeTrend(),
    }
  }

  private computeTrend(): "improving" | "stable" | "degrading" {
    if (this.data.length < 5) return "stable"
    const recent = this.data.slice(-5).map(d => d.durationMs)
    const older = this.data.slice(-10, -5).map(d => d.durationMs)
    if (older.length === 0) return "stable"
    const change = (avg(recent) - avg(older)) / avg(older)
    return change < -0.1 ? "improving" : change > 0.1 ? "degrading" : "stable"
  }
}

function avg(nums: number[]): number { return nums.reduce((a, b) => a + b, 0) / nums.length }
```

**`tw stats` output:**
```
Build Performance:
  Avg duration: 245ms
  P95 duration: 412ms
  Cache hit rate: 89.3%
  Trend: improving (-12% vs last 10 builds)

  Phase breakdown:
    Scan:    120ms (49%)
    Compile:  85ms (35%)
    Engine:   25ms (10%)
    Output:   15ms (6%)
```

---

## 15. HMR Integration

### Motivasi

Hot reload — ubah class langsung ter-reflek tanpa full page reload.

### Rekomendasi

```typescript
// packages/vite/src/hmr-plugin.ts

export function tailwindStyledHmrPlugin(): Plugin {
  return {
    name: "tailwind-styled-hmr",
    handleHotUpdate({ file, server }) {
      if (!/\.(tsx|jsx)$/.test(file)) return

      const content = readFileSync(file, "utf8")
      if (!hasTwUsage(content)) return

      const mod = server.moduleGraph.getModuleById(file)
      if (mod) {
        server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: "custom", event: "tw:update", data: { file } })
      }

      return [mod]
    },
  }
}
```

```typescript
// packages/runtime/src/hmr-client.ts

export function setupHMR() {
  if (typeof module === "undefined" || !module.hot) return
  module.hot.accept("@tailwind-styled/runtime", () => {
    const elements = document.querySelectorAll("[data-tw]")
    for (const el of elements) {
      el.className = el.className  // Trigger re-evaluation
    }
  })
}
```

---

## 16. Binary Size

### Motivasi

Binary size → `npm install` time + disk usage.

### Rekomendasi

```toml
# native/Cargo.toml

[profile.release]
opt-level = "z"       # Optimize for size
lto = true            # Link-time optimization
codegen-units = 1     # Single codegen unit
strip = true          # Strip debug symbols
panic = "abort"       # Smaller panic handler

[profile.release.build-override]
opt-level = 2         # Faster build for dependencies
```

```bash
# native/build.sh

BINARY="target/release/tailwind_styled_parser.node"
SIZE=$(stat -c%s "$BINARY" 2>/dev/null || stat -f%z "$BINARY")
SIZE_MB=$(echo "scale=1; $SIZE / 1048576" | bc)
echo "Binary: ${SIZE_MB} MB"

MAX_MB=5
if (( $(echo "$SIZE_MB > $MAX_MB" | bc -l) )); then
  echo "FAIL: ${SIZE_MB} MB exceeds budget ${MAX_MB} MB"
  exit 1
fi
```

**Target:** < 3MB per platform. CI gate at 5MB.

---

## 17. `any` Type Elimination

### Current State

**145 occurrences** `any` tersebar di 30+ files. Hotspot:

| Package | Files | `any` Count | Severity |
|---------|-------|-------------|----------|
| `cli/src/utils/traceService.ts` | 1 | 30+ | High — internal types bocor |
| `compiler/src/astParser.ts` | 1 | 15+ | High — OXC node types tidak typed |
| `core/src/createComponent.ts` | 1 | 12+ | High — public API surface |
| `core/src/twProxy.ts` | 1 | 8+ | High — public API surface |
| `next/src/withTailwindStyled.ts` | 1 | 10+ | Medium — Next.js config tidak typed |
| `vite/src/plugin.ts` | 1 | 5+ | Medium — Vite hook types |
| `devtools/src/index.tsx` | 1 | 15+ | Low — window globals |
| `engine/src/cssToIr.ts` | 1 | 2+ | Low — single edge case |

### Rekomendasi

#### 17a. OXC Node Types

```typescript
// packages/compiler/src/oxc-types.ts — Type definitions untuk OXC AST nodes

export interface OxcNode {
  type: string
  start: number
  end: number
}

export interface OxcObjectExpression extends OxcNode {
  type: "ObjectExpression"
  properties: OxcProperty[]
}

export interface OxcProperty extends OxcNode {
  type: "Property"
  key: OxcIdentifier | OxcLiteral
  value: OxcNode
  kind: "init" | "get" | "set"
}

export interface OxcIdentifier extends OxcNode {
  type: "Identifier"
  name: string
}

export interface OxcLiteral extends OxcNode {
  type: "Literal"
  value: string | number | boolean | null
  raw: string
}

export interface OxcTemplateLiteral extends OxcNode {
  type: "TemplateLiteral"
  quasis: Array<{ value: { cooked: string; raw: string } }>
  expressions: OxcNode[]
}

export interface OxcArrayExpression extends OxcNode {
  type: "ArrayExpression"
  elements: OxcNode[]
}
```

#### 17b. traceService Type Safety

```typescript
// packages/cli/src/utils/traceService.ts — Replace `any` dengan typed interfaces

interface RuleId { value: number; name?: string }
interface PropertyId { value: number; name?: string }
interface ValueId { value: number; name?: string }

interface EngineTraceVariant {
  name: string
  values: string[]
}

interface EngineTraceRule {
  selector: string
  properties: string[]
  specificity: string
}

interface EngineTraceConflict {
  property: string
  winner: string
  loser: string
  reason: string
}

interface EngineTraceFinalStyle {
  property: string
  value: string
  source: string
}
```

#### 17c. Window Global Types

```typescript
// packages/shared/src/global-types.ts — Typed window globals

declare global {
  interface Window {
    __TW_REGISTRY__?: Record<string, string>
    __TW_STATE_REGISTRY__?: Map<string, { states: string[]; cssInjected: boolean }>
    __TW_CONTAINER_REGISTRY__?: Map<string, {
      tag: string
      containerName?: string
      breakpoints: Array<{ minWidth: string; classes: string }>
    }>
    __TW_TOKEN_ENGINE__?: {
      getTokens(): Record<string, string>
      setToken(name: string, value: string): void
      subscribe(callback: (tokens: Record<string, string>) => void): () => void
    }
  }
}
```

---

## 18. Silent Error Handling (`catch {}`)

### Current State

**174 try-catch blocks** tersebar di codebase. Banyak `catch {}` kosong yang swallow error tanpa logging.

**Hotspot (empty catch):**

| File | Empty `catch {}` | Risk |
|------|-----------------|------|
| `compiler/src/nativeBridge.ts:125` | 1 | Binary load gagal tanpa notice |
| `compiler/src/coreCompiler.ts:150` | 1 | Native step gagal tanpa notice |
| `compiler/src/incrementalEngine.ts` | 6+ | Cache operations silent fail |
| `scanner/src/index.ts` | 4+ | Scan operations silent fail |
| `engine/src/index.ts` | 5+ | Engine operations silent fail |
| `core/src/parser.ts` | 5+ | Parse operations silent fail |
| `cli/src/utils/traceService.ts` | 3+ | Conversion failures swallowed |

### Rekomendasi

#### 18a. Error Logging Policy

```typescript
// packages/shared/src/error-policy.ts

export type ErrorAction = "log-warn" | "log-debug" | "log-error" | "rethrow" | "ignore"

export interface ErrorPolicy {
  nativeBinding: ErrorAction       // "log-error" — critical path
  cacheOperation: ErrorAction      // "log-debug" — degrade gracefully
  parseOperation: ErrorAction      // "log-warn" — best-effort
  optionalFeature: ErrorAction     // "log-debug" — nice-to-have
}

export const DEFAULT_ERROR_POLICY: ErrorPolicy = {
  nativeBinding: "log-error",
  cacheOperation: "log-debug",
  parseOperation: "log-warn",
  optionalFeature: "log-debug",
}
```

#### 18b. Replace Empty Catch Blocks

```typescript
// BEFORE (dangerous — swallows error silently)
try {
  return native.analyzeClassesNative(filesJson, root, severityLevel)
} catch {}

// AFTER (logged degradation)
try {
  return native.analyzeClassesNative(filesJson, root, severityLevel)
} catch (err) {
  logger.debug("native analyze failed, skipping", err)
  return undefined
}
```

```typescript
// BEFORE (silent cache failure)
try { fs.unlinkSync(entryPath) } catch {}

// AFTER (debug-logged cache cleanup)
try { fs.unlinkSync(entryPath) } catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
    logger.debug("cache cleanup failed", entryPath, err)
  }
}
```

---

## 19. Zod Boundary Validation Gap

### Current State

**77 Zod schemas** tersebar di 15+ packages. Tapi `plans/PLAN.md` menunjukkan banyak boundary rules belum di-enforce:

- [ ] Native binding responses belum divalidasi sebelum masuk domain logic
- [ ] JSON/cache/config reads belum pakai schema-backed values
- [ ] CLI/adapter/plugin options belum divalidasi di entry points

### Rekomendasi

#### 19a. Native Binding Boundary

```typescript
// packages/shared/src/native-schemas.ts

import { z } from "zod"

export const NativeScanResultSchema = z.object({
  files: z.array(z.object({
    file: z.string().min(1),
    classes: z.array(z.string()),
    lineNumbers: z.array(z.number().int().nonnegative()),
  })),
  totalFiles: z.number().int().nonnegative(),
  uniqueClasses: z.array(z.string()),
  durationMs: z.number().nonnegative(),
})

export const NativeAnalyzeResultSchema = z.object({
  safelist: z.array(z.string()),
  safelistByReason: z.record(z.array(z.string())).optional(),
  dynamicUsage: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
})

export type NativeScanResult = z.infer<typeof NativeScanResultSchema>
export type NativeAnalyzeResult = z.infer<typeof NativeAnalyzeResultSchema>
```

```typescript
// packages/scanner/src/native-bridge.ts — Validate native output

export function scanSourceWithValidation(source: string): NativeScanResult {
  const binding = scannerGetBinding()
  const raw = binding.scanSourceClassesNative(source)

  // Validate output dari Rust sebelum masuk domain logic
  const result = NativeScanResultSchema.safeParse(raw)
  if (!result.success) {
    throw TwError.fromZod(result.error)
  }

  return result.data
}
```

#### 19b. Config Boundary

```typescript
// packages/compiler/src/config-schema.ts

import { z } from "zod"

export const CompilerConfigSchema = z.object({
  mode: z.enum(["zero-runtime"]).default("zero-runtime"),
  autoClientBoundary: z.boolean().default(true),
  addDataAttr: z.boolean().default(false),
  hoist: z.boolean().default(true),
  deadStyleElimination: z.boolean().default(false),
  preserveImports: z.boolean().default(false),
  minifyOutput: z.boolean().default(false),
})

export type CompilerConfig = z.infer<typeof CompilerConfigSchema>

// Validate at entry point, bukan di dalam execution flow
export function loadCompilerConfig(raw: unknown): CompilerConfig {
  return CompilerConfigSchema.parse(raw)
}
```

---

## 20. Rust ↔ TypeScript Type Drift Prevention

### Current State

- `native/src/` punya Rust structs tapi **tidak ada auto-generated TypeScript types**
- 4/6 consumer packages punya **candidate list sendiri** untuk native binding resolution, bukan pakai `shared/src/nativeBinding.ts`
- `napi-rs` belum di-upgrade ke 3.x dengan `#[napi]` macro

### Rekomendasi

#### 20a. Auto-Generate .d.ts dari Rust

```rust
// native/src/lib.rs — Add napi-rs 3.x macros

use napi_derive::napi;
use serde::{Deserialize, Serialize};

#[napi(object)]
#[derive(Serialize, Deserialize)]
pub struct ScanFileResult {
    pub file: String,
    pub classes: Vec<String>,
    pub line_numbers: Vec<u32>,
}

#[napi(object)]
#[derive(Serialize, Deserialize)]
pub struct ScanResult {
    pub files: Vec<ScanFileResult>,
    pub total_files: u32,
    pub unique_classes: Vec<String>,
    pub duration_ms: f64,
}

#[napi]
pub fn scan_workspace(root: String) -> napi::Result<ScanResult> {
    // Rust implementation
}
```

```json
// native/napi.config.json
{
  "binaryName": "tailwind_styled_parser",
  "packageName": "@tailwind-styled/native",
  "typedefHeader": true,
  "dtsHeader": "/* Auto-generated from Rust — do not edit manually */"
}
```

Output auto-generated `.d.ts`:
```typescript
/* Auto-generated from Rust — do not edit manually */
export interface ScanFileResult {
  file: string
  classes: string[]
  lineNumbers: number[]
}
export interface ScanResult {
  files: ScanFileResult[]
  totalFiles: number
  uniqueClasses: string[]
  durationMs: number
}
export declare function scanWorkspace(root: string): Promise<ScanResult>
```

#### 20b. Unified Native Binding Resolution

```typescript
// packages/shared/src/nativeBinding.ts — Single source of truth

// Consolidate dari 4 consumer packages ke satu resolution path
export function resolveNativeBinding(): NativeBridge {
  // 1. Prebuilt binary (npm optionalDependencies)
  // 2. Local build (developer mode)
  // 3. Error with clear instructions
}

// Consumer packages HANYA import dari shared, tidak punya candidate list sendiri
// compiler/nativeBridge.ts → import { resolveNativeBinding } from "@tailwind-styled/shared"
// scanner/native-bridge.ts → import { resolveNativeBinding } from "@tailwind-styled/shared"
// engine/native-bridge.ts → import { resolveNativeBinding } from "@tailwind-styled/shared"
// theme/native-bridge.ts → import { resolveNativeBinding } from "@tailwind-styled/shared"
```

#### 20c. CI Drift Detection

```yaml
# .github/workflows/type-sync.yml

name: Type Sync Check
on: [push, pull_request]

jobs:
  type-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable

      - name: Generate types from Rust
        run: npx @napi-rs/cli build --platform --dts
        working-directory: native

      - name: Check drift
        run: |
          git diff --exit-code packages/shared/src/generated/ || {
            echo "FAIL: Rust ↔ TypeScript type drift detected"
            echo "Run: npx @napi-rs/cli build --platform --dts"
            exit 1
          }
```

---

## 21. Rust Cargo.toml Inconsistencies

### Current State

`native/Cargo.toml` punya beberapa ketidaksesuaian dengan rekomendasi di dokumen QA:

| Item | Current | Recommended | Impact |
|------|---------|-------------|--------|
| `opt-level` | `3` (speed) | `"z"` (size) | Binary 2-5MB vs potential <2MB |
| `napi` version | `2` with `napi4` | `3` with auto `.d.ts` | Manual type maintenance |
| `oxc_parser` version | `0.1` | Latest | Missing AST optimizations |
| `schemars` | `0.8` (in deps) | Not used anywhere | Dead dependency |

### Rekomendasi

#### 21a. Align opt-level with QA doc

```toml
# native/Cargo.toml — Replace current profile

[profile.release]
opt-level = "z"       # Size-optimized (QA doc recommendation)
lto = true            # Already set
strip = true          # Already set
codegen-units = 1     # Add — better optimization
panic = "abort"       # Add — smaller binary
```

**Trade-off:** `opt-level = "z"` sedikit lebih lambat dari `3` (~5-10%), tapi binary lebih kecil. Karena ini library yang di-distribute via npm, size lebih penting daripada speed micro-optimization.

#### 21b. Use schemars yang sudah di-declare

`schemars` sudah di `Cargo.toml` tapi tidak dipakai. Gunakan untuk auto-generate JSON Schema:

```rust
// native/src/lib.rs

use schemars::JsonSchema;

#[derive(serde::Serialize, serde::Deserialize, JsonSchema)]
pub struct ScanFileResult {
    pub file: String,
    pub classes: Vec<String>,
    pub line_numbers: Vec<u32>,
}

// Export JSON Schema untuk TypeScript bridge
#[napi]
pub fn get_scan_result_schema() -> String {
    let schema = schemars::schema_for!(ScanFileResult);
    serde_json::to_string_pretty(&schema).unwrap_or_default()
}
```

---

## 22. Thread Pool Adaptive Threshold

### Current State

`RUST_OPTIMIZATION_PHASE_2.md` mencatat:
- Phase 2 parallelization: 6-8x faster untuk 100+ files
- Issue tercatat: *"Thread overhead > I/O gain (small workloads)"* — mitigation: *"Threshold check (if <5 files, run sequential)"* — status: **"Not needed yet"**

### Rekomendasi

Implementasi adaptive threshold yang sudah di-dokumentasikan tapi belum di-implement:

```rust
// native/src/thread_pool.rs

use rayon::prelude::*;

const PARALLEL_THRESHOLD: usize = 10;  // Below this, sequential is faster

pub fn scan_files_adaptive(
    file_paths: Vec<(String, String)>,
) -> Vec<ScannedFile> {
    if file_paths.len() < PARALLEL_THRESHOLD {
        // Small workload — sequential lebih cepat (no thread overhead)
        file_paths
            .into_iter()
            .map(|(path, content)| {
                let classes = extract_classes_from_source(&content);
                let hash = short_hash(&content);
                ScannedFile { file: path, classes, hash }
            })
            .collect()
    } else {
        // Large workload — parallel dengan thread pool
        SCAN_THREAD_POOL.install(|| {
            file_paths
                .par_iter()
                .map(|(path, content)| {
                    let classes = extract_classes_from_source(content);
                    let hash = short_hash(content);
                    ScannedFile { file: path.clone(), classes, hash }
                })
                .collect()
        })
    }
}
```

**Impact:**
- 1-9 files: avoid ~5ms thread pool overhead
- 10+ files: parallel benefit kicks in
- Zero cost untuk large workloads

---

## 23. OXC Parser Version Gap

### Current State

`Cargo.toml` menggunakan `oxc_parser = "0.1"` — ini versi sangat lama. `RUST_OPTIMIZATION_PHASE_2.md` mencatat Phase 3 rencana: *"Upgrade Oxc parser to latest version with optimized visitor API"*

### Rekomendasi

```toml
# native/Cargo.toml — Upgrade OXC

[dependencies]
oxc_parser = "0.49"    # Latest stable
oxc_allocator = "0.49"
oxc_ast = "0.49"
oxc_span = "0.49"
oxc_semantic = "0.49"  # New — untuk type-aware analysis
```

**Benefits dari upgrade:**
- Visitor API lebih cepat (Phase 3 optimization target)
- Better error recovery (fewer fallback-to-regex cases)
- Semantic analysis untuk smarter dead code elimination
- Better TypeScript/JSX parsing

---

## 24. tsconfig Path Alias vs Workspace Build Conflict

### Current State

Root `tsconfig.json` menggunakan path aliases ke source files:

```json
{
  "paths": {
    "@tailwind-styled/shared": ["packages/shared/src/index.ts"],
    "@tailwind-styled/compiler": ["packages/compiler/src/index.ts"],
    "@tailwind-styled/scanner": ["packages/scanner/src/index.ts"],
    // ... 20+ aliases
  }
}
```

Ini masalah karena `plans/PLAN.md` mencatat:
> *"Split dev path aliases from package build resolution. Move the current `@tailwind-styled/* -> packages/*/src` behavior out of package build/DTS flows so workspace declaration builds resolve built packages, not sibling source files."*

**Impact:** Package DTS builds bisa pull source files dari package lain, bukan dari built artifacts.

### Rekomendasi

```json
// tsconfig.dev.json — Untuk development (source-level aliases)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@tailwind-styled/shared": ["packages/shared/src/index.ts"],
      "@tailwind-styled/compiler": ["packages/compiler/src/index.ts"],
      // ... all source aliases
    }
  },
  "include": ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"]
}
```

```json
// tsconfig.build.json — Untuk per-package DTS builds (workspace resolution)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    // No paths — use workspace package resolution
    // Each package resolves @tailwind-styled/* from node_modules (built dist)
  }
}
```

**Implementasi:**
1. Split `tsconfig.json` → `tsconfig.dev.json` (aliases) + `tsconfig.build.json` (no aliases)
2. Dev mode pakai `tsconfig.dev.json`
3. Package builds pakai `tsconfig.build.json` (resolves from dist)
4. `tsc -p tsconfig.build.json` untuk verification

---

## 25. Example App Missing `'use client'` Detection

### Current State

`examples/demo-subcomponents/src/components/Card.tsx` menggunakan sub-component pattern:

```typescript
export const Card = tw.div`
  ...
  header { px-6 py-4 border-b }
  body { flex-1 px-6 py-4 }
  footer { px-6 py-4 border-t }
  image { w-full aspect-video }
`
```

File ini **tidak punya `'use client'` directive**. Tapi di `page.tsx` ada `'use client'`. Jika `Card.tsx` di-import langsung dari server component, RSC boundary detection harus handle ini.

### Verifikasi

RSC analyzer di `packages/compiler/src/rscAnalyzer.ts` harus deteksi bahwa `Card.tsx` menggunakan `tw.div` (client-side rendering) dan auto-inject `'use client'` jika diperlukan. Ini sudah di-handle oleh existing code (`autoClientBoundary: true` default).

**Tapi:** Example `next.config.ts` set `autoClientBoundary: false` — artinya user HARUS manual add `'use client'` di setiap component. Ini bisa confuse new users.

### Rekomendasi

```typescript
// examples/demo-subcomponents/next.config.ts — Enable auto client boundary

export default withTailwindStyled({
  autoClientBoundary: true,  // Auto-detect dan inject 'use client'
})(nextConfig)
```

Atau tambahkan `'use client'` di `Card.tsx`:

```typescript
'use client'

export const Card = tw.div`
  ...
`
```

---

## 26. Documentation Gaps

### Current State

`SETUP.md` ada tapi beberapa area kurang:

| Area | Issue |
|------|-------|
| `SETUP.md:10` | `npm run dev` comment salah: *"verifikasi lint utama"* (seharusnya dev mode) |
| `SETUP.md` | Tidak ada section untuk contributor workflow (fork, PR, testing) |
| `SETUP.md` | Tidak ada troubleshooting untuk common errors |
| No `CONTRIBUTING.md` | Contributor guide tidak ada |

### Rekomendasi

```markdown
# SETUP.md — Fix

```bash
npm run dev         # development mode (watch + rebuild)
```
```

Tambahkan `CONTRIBUTING.md`:

```markdown
# Contributing to tailwind-styled-v4

## Quick Start

1. Fork & clone
2. `npm install`
3. `npm run build:rust` (requires Rust)
4. `npm run build`
5. `npm test`

## PR Checklist

- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] No new `any` types (use typed interfaces)
- [ ] No empty `catch {}` blocks (use logger.debug)
- [ ] Zod validation for new boundary data
- [ ] Updated tests for changed functionality
```

---

## 27. Script Environment Variable Mismatch

### Current State

`scripts/test-fallback.mjs` menggunakan:
```javascript
process.env.TWS_DISABLE_NATIVE = "1"
```

Tapi `packages/scanner/src/native-bridge.ts` dan `packages/compiler/src/nativeBridge.ts` menggunakan:
```typescript
process.env.TWS_NO_NATIVE === "1"
process.env.TWS_NO_RUST === "1"
```

**`TWS_DISABLE_NATIVE` tidak dikenali oleh kode.** Test fallback akan tetap memuat native binary.

### Rekomendasi

```javascript
// scripts/test-fallback.mjs — Fix env var name

process.env.TWS_NO_NATIVE = "1"  // Bukan TWS_DISABLE_NATIVE
execSync("node scripts/smoke/index.mjs", {
  stdio: "inherit",
  env: process.env,
})
```

---

## 28. generate-json-schemas.mjs Blocked oleh Missing Binary

### Current State

`scripts/generate-json-schemas.mjs` sudah ada dan lengkap (187 lines), tapi:

```
const SCHEMA_INPUT_DIR = path.resolve(ROOT, "native", "json-schemas")
```

Direktori `native/json-schemas/` **tidak ada**. Script akan exit dengan:
```
No JSON Schema input directory found at .../native/json-schemas
To generate JSON Schemas from Rust, run:
  cargo run --bin export-schemas
```

Tapi `cargo run --bin export-schemas` belum di-implement di Rust side. `Cargo.toml` tidak punya `[[bin]]` section untuk `export-schemas`.

### Rekomendasi

```rust
// native/src/bin/export-schemas.rs — New binary

use schemars::schema_for;
use std::fs;
use std::path::Path;

// Import structs dari lib.rs
use tailwind_styled_parser::*;

fn main() {
    let out_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("json-schemas");
    fs::create_dir_all(&out_dir).expect("Failed to create json-schemas dir");

    // Export each struct as JSON Schema
    let schemas: Vec<(&str, String)> = vec![
        ("ScanFileResult", serde_json::to_string_pretty(&schema_for!(ScanFileResult)).unwrap()),
        ("ScanResult", serde_json::to_string_pretty(&schema_for!(ScanResult)).unwrap()),
        // Add more structs as needed
    ];

    for (name, schema) in &schemas {
        let path = out_dir.join(format!("{}.json", name));
        fs::write(&path, schema).expect("Failed to write schema");
        println!("Exported: {}", path.display());
    }

    println!("All schemas exported to {}", out_dir.display());
}
```

```toml
# native/Cargo.toml — Add binary target

[[bin]]
name = "export-schemas"
path = "src/bin/export-schemas.rs"
```

---

## 29. native-tools.mjs Missing Linux/macOS Auto-Bootstrap

### Current State

`scripts/native-tools.mjs` punya Windows MSVC auto-bootstrap logic (`findVsDevCmd`, `isMsvcToolchainActive`), tapi tidak ada equivalent untuk Linux/macOS.

Jika user Linux/macOS tidak punya `cargo` di PATH, script akan fail tanpa helpful error.

### Rekomendasi

```javascript
// scripts/native-tools.mjs — Add Linux/macOS check

function checkCargoAvailable() {
  const result = runCapture("cargo", ["--version"], { stdio: "pipe" })
  if (result.status !== 0) {
    const installCmd = isWindows
      ? "Install Visual Studio C++ Build Tools + Rust"
      : "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"

    console.error("Rust toolchain not found.")
    console.error(`Install: ${installCmd}`)
    process.exit(1)
  }
}
```

---

## 30. test/fixtures/large-project/generate.js Uses CJS

### Current State

`test/fixtures/large-project/generate.js` menggunakan CommonJS:
```javascript
const fs = require("node:fs")
const path = require("node:path")
const __dirname = ...
```

Tapi project sudah ESM-first (`"type": "module"` di package.json root). File `.js` dengan `require()` akan fail di ESM mode.

### Rekomendasi

```javascript
// test/fixtures/large-project/generate.js — Convert to ESM

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "generated")
const argCount = process.argv.find((arg) => arg.startsWith("--files="))
const total = Number(argCount ? argCount.split("=")[1] : process.env.FIXTURE_FILE_COUNT ?? 10000)

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

for (let i = 0; i < total; i += 1) {
  const group = path.join(outDir, `chunk-${Math.floor(i / 250)}`)
  fs.mkdirSync(group, { recursive: true })
  fs.writeFileSync(
    path.join(group, `Comp${i}.tsx`),
    `export const Comp${i}=({active,color})=> <div className={active ? "bg-blue-500 text-white" : \`bg-\${color}-500 text-black\`}>${i}</div>;`,
    "utf8",
  )
}

console.log(`Generated ${total} files at ${outDir}`)
```

---

## 31. reverseLookup.ts Manual lastIndex Manipulation

### Current State

`packages/engine/src/reverseLookup.ts:108`:

```typescript
selectorRegex.lastIndex = lineEnd - 1
```

Manual regex state manipulation. `matchAll` sudah di line 52, tapi external `lastIndex` set bisa cause skip/re-match issues.

### Rekomendasi

Hapus line 108 — biarkan `matchAll` handle state internally.

---

## 32. ID Generator Module-Level State Race Condition

### Current State

`packages/engine/src/cssToIr.ts:40-74` — module-level mutable `idState` object dengan `resetIdGenerator()`. Jika concurrent calls, race condition.

### Rekomendasi

Factory pattern untuk isolasi:

```typescript
function createIdGenerator() {
  const state = { ruleIdCounter: 0, selectorIdCounter: 0 /* ... */ }
  return {
    generateRuleId: () => new RuleId(state.ruleIdCounter++),
    reset: () => { state.ruleIdCounter = 0 /* ... */ },
  }
}

export function parseCssToIr(css: string): RuleIR[] {
  const gen = createIdGenerator()  // Isolated per call
  // ...
}
```

---

## 33. reverseLookup.ts ParsedCache Never Cleared

### Current State

`packages/engine/src/reverseLookup.ts:29` — cache grow indefinitely dalam long-running process.

### Rekomendasi

Tambahkan max size + clear method:

```typescript
private maxCacheSize = 1000

private parseCSS(css: string): ParsedRule[] {
  const cached = this.parsedCache.get(css)
  if (cached) return cached
  // ...
  if (this.parsedCache.size >= this.maxCacheSize) {
    const firstKey = this.parsedCache.keys().next().value
    if (firstKey) this.parsedCache.delete(firstKey)
  }
  this.parsedCache.set(css, rules)
  return rules
}

clearCache(): void { this.parsedCache.clear() }
```

---

## 34. package.json Scripts Inconsistency

### Current State

- `build` runs `build:rust` then `build:packages` — turbo task tidak depend on native
- No `clean` script
- `test:smoke` dan `test:examples` tidak di turbo tasks

### Rekomendasi

```json
{
  "scripts": {
    "clean": "turbo run clean --continue && rm -rf node_modules/.cache"
  }
}
```

```json
// turbo.json — add missing tasks
{
  "tasks": {
    "clean": { "cache": false }
  }
}
```

---

## Final Priority Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Prebuilt binaries per platform | High | Critical — `npm install` langsung jalan |
| **P0** | Postinstall auto-resolve | Low | Critical — zero-config |
| **P0** | Binary integrity (SHA256) | Low | Critical — security |
| **P0** | Error message saat binary hilang | Low | Critical — user tahu cara fix |
| **P1** | Code coverage + CI pipeline | Medium | High — quality gate |
| **P1** | Error source locations | Medium | High — DX |
| **P1** | Incremental watch mode | Medium | High — DX |
| **P1** | Performance telemetry | Medium | High — observability |
| **P1** | RSC boundary CLI | Low | High — visibility |
| **P1** | Eliminate `any` types (145 total) | Medium | High — type safety |
| **P1** | Replace empty `catch {}` blocks | Medium | High — observability |
| **P2** | Variant validation (dev-mode) | Low | Medium — DX |
| **P2** | Tailwind v3 detection | Low | Medium — prevent errors |
| **P2** | E2E tests (Playwright) | Medium | Medium — regression |
| **P2** | `tw doctor` auto-detect | Low | Medium — self-healing |
| **P2** | Parallel scanner | Medium | Medium — 4-8x speedup |
| **P2** | Binary size optimization | Low | Medium — install time |
| **P2** | Error code registry | Low | Medium — debugging |
| **P2** | Variant coverage report | Low | Medium — code quality |
| **P2** | Snapshot testing | Low | Medium — regression |
| **P2** | Zod boundary validation (native) | Medium | Medium — reliability |
| **P2** | Rust TS type auto-generation | Medium | Medium — prevent drift |
| **P2** | Unified native binding resolution | Low | Medium — consistency |
| **P2** | napi-rs 2→3 upgrade | Medium | Medium — auto .d.ts |
| **P2** | Cargo.toml opt-level alignment | Trivial | Medium — size vs speed |
| **P2** | OXC parser 0.1→latest | Medium | Medium — AST optimizations |
| **P2** | Thread pool adaptive threshold | Low | Medium — small workload perf |
| **P1** | tsconfig path alias split | Medium | High — DTS build correctness |
| **P3** | Example app autoClientBoundary | Trivial | Low — DX |
| **P3** | Documentation fixes | Low | Low — onboarding |
| **P3** | Cache cleanup + stats | Low | Low — performance |
| **P2** | test-fallback.mjs env var fix | Trivial | Medium — test correctness |
| **P2** | export-schemas binary | Medium | Medium — unblock schema pipeline |
| **P3** | native-tools.mjs Linux/macOS check | Low | Low — DX |
| **P3** | generate.js CJS→ESM | Trivial | Low — ESM consistency |
| **P3** | HMR integration | High | Low — nice-to-have |
| **P3** | Logger fix | Trivial | Low — correctness |
| **P3** | ID generator isolation | Medium | Low — edge case |
| **P3** | Server Actions detection | Low | Low — future-proofing |
| **P3** | Window global types | Trivial | Low — DX |
| **P3** | reverseLookup lastIndex fix | Trivial | Low — correctness |
| **P3** | reverseLookup cache size limit | Low | Low — memory |
| **P3** | package.json clean script | Trivial | Low — DX |
