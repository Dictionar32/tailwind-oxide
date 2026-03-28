# Zero Let — Scanner Package (22 declarations)

## Goal
Eliminate all 22 `let` declarations in `packages/scanner/src/*.ts`, replacing with `const` patterns.

## Files Affected (6 files)

### 1. `native-bridge.ts` — 3 let (lines 74-76)
**Pattern:** Lazy singleton binding — wrap in state object

```ts
// BEFORE
let _binding: NativeScannerBinding | null | undefined = undefined
let _loadError: string | null = null
let _candidatePaths: string[] = []

// AFTER
const _state = {
  binding: undefined as NativeScannerBinding | null | undefined,
  loadError: null as string | null,
  candidatePaths: [] as string[],
}
```

All references to `_binding`, `_loadError`, `_candidatePaths` become `_state.binding`, `_state.loadError`, `_state.candidatePaths`.

Also update the `reset()` closure to reset via `_state`.

---

### 2. `in-memory-cache.ts` — 1 let (line 43)
**Pattern:** Lazy singleton binding — wrap in state object

```ts
// BEFORE
let _binding: NativeCacheBinding | null | undefined

// AFTER
const _state = { binding: undefined as NativeCacheBinding | null | undefined }
```

---

### 3. `oxc-bridge.ts` — 1 let (line 45)
**Pattern:** Lazy singleton binding — wrap in state object

```ts
// BEFORE
let _binding: NativeOxcBinding | null | undefined

// AFTER
const _state = { binding: undefined as NativeOxcBinding | null | undefined }
```

---

### 4. `ast-native.ts` — 2 let (lines 45, 116)
**Line 45:** Lazy singleton binding — wrap in state object (same as above)

**Line 116:** Regex while-loop → `matchAll` + `for...of`

```ts
// BEFORE
let m: RegExpExecArray | null
while ((m = twTpl.exec(source)) !== null) {
  if (!m[2].includes("${")) { ... }
}

// AFTER
for (const [, , classes] of source.matchAll(/\btw(?:\.server)?\.(\w+)`([^`]*)`/g)) {
  if (!classes.includes("${")) { ... }
}
```

Same pattern for `baseRe`, `classRe`, `compRe`, `importRe` while loops.

---

### 5. `index.ts` — 7 let (lines 36, 37, 155, 232, 318, 341, 372)
**Lines 36-37:** Lazy singleton binding — wrap in state object
```ts
const _parserState = {
  binding: undefined as NativeParserBinding | null | undefined,
  initError: null as string | null,
}
```

**Line 155:** `let settled = false` — wrap in state object
```ts
const settleState = { settled: false }
```

**Line 232:** `let entries: fs.Dirent[] = []` — IIFE pattern
```ts
const entries = (() => {
  try { return fs.readdirSync(currentDir, { withFileTypes: true }) }
  catch { return [] as fs.Dirent[] }
})()
```

**Line 318:** `let cacheEntries: NativeCacheEntry[] = []` — IIFE pattern
```ts
const cacheEntries: NativeCacheEntry[] = (() => {
  try { return readCache(rootDir, options.cacheDir) }
  catch (error) {
    log.debug(`cache read failed...`)
    return []
  }
})()
```

**Line 341:** `let stat: fs.Stats` — IIFE + filter pattern
```ts
const ranked = candidates
  .map((filePath) => {
    try {
      const stat = fs.statSync(filePath)
      // ... compute priority ...
      return { filePath, stat, size: toCacheSize(stat.size), cached: cacheMap.get(filePath), priority }
    } catch { return null }
  })
  .filter((r): r is NonNullable<typeof r> => r !== null)
  .sort((a, b) => b.priority - a.priority)
```

**Line 372:** `let content: string` — IIFE + filter pattern
```ts
for (const { filePath, stat, size, cached } of ranked) {
  const content = (() => {
    try { return fs.readFileSync(filePath, "utf8") }
    catch { return null }
  })()
  if (!content) continue
  // ... rest of processing
}
```

---

### 6. `index.minified.ts` — 8 let (lines 14-16, 119, 150, 220, 244)
> Note: This file is NOT part of the build (not in package.json exports). It's likely dead code.
> Refactor anyway for zero-let compliance.

**Lines 14-16:** Module-level state — wrap in object
```ts
const _parserState = {
  binding: undefined as NativeParserBinding | null | undefined,
  initError: null as string | null,
  logged: false,
}
```

**Line 119:** `let entries` — IIFE (same as index.ts line 232)

**Line 150:** `let jsxClasses` — IIFE
```ts
const jsxClasses: string[] = (() => {
  try { return parseJsxLikeClasses(source) }
  catch { return [] }
})()
```

**Lines 220, 244:** `let result` — IIFE + ternary
```ts
const result: ScanFileResult | null = (() => {
  if (cacheEntry && cacheEntry.mtimeMs === stat.mtimeMs && cacheEntry.size === stat.size) {
    cache.touch(filePath)
    return { file: filePath, classes: cacheEntry.classes }
  }
  const scanned = scanFile(filePath)
  cache.set(filePath, { ... })
  return scanned
})()
processResult(result)
```

---

## Execution Order
1. native-bridge.ts (3 let)
2. in-memory-cache.ts (1 let)
3. oxc-bridge.ts (1 let)
4. ast-native.ts (2 let) — includes matchAll refactor
5. index.ts (7 let) — most complex, includes readdirSync/loop refactors
6. index.minified.ts (8 let) — dead code, same patterns

## Verification
```bash
# After all edits, verify zero let remains:
grep -rn "let " packages/scanner/src/ --include="*.ts"
# Expected: no matches

# Build check:
cd packages/scanner && npm run build
```

## Total: 22 let → 0 const patterns
- 8 state object wraps
- 5 IIFE patterns
- 5 matchAll conversions
- 4 IIFE + filter for loop refactors
