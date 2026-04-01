# Plan: Remove All JS Fallbacks — Native-Only Mode

## Goal
Remove all JavaScript fallback code that exists as alternatives to native (Rust) bindings. Enforce native-only mode: if the Rust binding is not available, hard fail immediately.

## Scope: 11 Files, ~700+ Lines of Fallback Code

### Category 1: Compiler Package (4 files)

#### 1.1 `packages/compiler/src/twDetector.ts`
**Lines to remove:** 31-40, 44-50, 56-62

| Function | Current Behavior | After Change |
|----------|-----------------|--------------|
| `tryGetNativeBridge()` | Returns `null` on `NATIVE_BINDING_*` errors | Remove function entirely |
| `hasTwUsage(source)` | Tries native, falls back to regex | Native only, throw if unavailable |
| `isAlreadyTransformed(source)` | Tries native, falls back to string.includes | Native only, throw if unavailable |

**Implementation:**
- Remove `tryGetNativeBridge()` function
- Change `hasTwUsage` to call `getNativeBridge()` directly, throw if `hasTwUsageNative` missing
- Change `isAlreadyTransformed` to call `getNativeBridge()` directly, throw if `isAlreadyTransformedNative` missing
- Remove `isTwError` import (no longer needed)
- Remove `IMPORT_RE` and `TRANSFORM_MARKER` exports (only used by fallback)

#### 1.2 `packages/compiler/src/astParser.ts`
**Lines to remove:** 153-388 (tokenizer fallback ~235 lines)

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `parseWithOxc(objectStr)` | Returns `null` if oxc unavailable | Throw if oxc-parser unavailable |
| `parseComponentConfigFallback(objectStr)` | Full tokenizer + parser | Remove entirely |
| `parseComponentConfig(objectStr)` | Tries oxc, falls back to tokenizer | oxc only, throw if fails |

**Implementation:**
- Remove `parseComponentConfigFallback` function (lines 341-378)
- Remove `tokenize`, `parseObject`, `parseArray` helper functions (lines 174-339)
- Remove `Token`, `TokenType`, `ParsedObject` types (lines 157-261)
- Change `parseWithOxc` to throw instead of returning null
- Simplify `parseComponentConfig` to just call `parseWithOxc`

#### 1.3 `packages/compiler/src/tailwindEngine.ts`
**Lines to remove:** 42-50, 53-87 (Tiers 2 and 3)

| Tier | Current Behavior | After Change |
|------|-----------------|--------------|
| Tier 1 (Native) | `compileCssFromClasses` via Rust | Keep, throw if fails |
| Tier 2 (JS) | `generateViaTailwindV4` via postcss | Remove |
| Tier 3 (JS) | `generateManualCss` atomic CSS | Remove |

**Implementation:**
- Remove `generateViaTailwindV4` function (lines 53-77)
- Remove `generateManualCss` function (lines 79-87)
- Remove `filterCssForClasses` function (lines 89-154) — only used by Tier 2
- Remove `loadTailwindConfig` import (only used by Tier 2)
- Change `generateCssForClasses` to just call native and throw if it fails
- Remove the 50% resolve rate check — native must resolve all classes

#### 1.4 `packages/compiler/src/coreCompiler.ts`
**Lines to remove:** 88, 176-195

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `jsStep(ctx)` | JS transform pipeline | Remove |
| `shouldFallbackToJs(error)` | Checks for NATIVE_BINDING_* errors | Remove |
| Pipeline | `nativeStep` → `jsStep` | `nativeStep` only, throw if fails |

**Implementation:**
- Remove `jsStep` method (lines 176-183)
- Remove `shouldFallbackToJs` function (lines 186-195)
- Change `nativeStep` to throw instead of returning (no fallback)
- Remove `transformSource` import (only used by jsStep)
- Remove `isTwError` import (only used by shouldFallbackToJs)
- Change pipeline to only use `nativeStep`
- Update `nativeStep`: if `native?.transformSourceNative` is missing, throw immediately

---

### Category 2: Scanner Package (4 files)

#### 2.1 `packages/scanner/src/index.ts`
**Lines to remove:** 269-294

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `extractClassesJs(source)` | JS class extraction via `extractAllClasses` | Remove |
| `scanSource` Tier 2 | `extractClassesJs` + `normalizeWithNativeParser` | Remove |
| `scanSource` error | Throws "Native parser binding is required" | Keep |

**Implementation:**
- Remove `extractClassesJs` function (lines 269-271)
- Remove the Tier 2 block in `scanSource` (lines 282-290)
- Remove `extractAllClasses` import from `@tailwind-styled/syntax` (line 7)
- Keep the error throw at line 292-294 (already correct)

#### 2.2 `packages/scanner/src/ast-native.ts`
**Lines to remove:** 110-160

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `astExtractClasses` native path | Uses `binding.astExtractClasses` | Keep |
| `astExtractClasses` fallback | Regex-based extraction (50 lines) | Remove |

**Implementation:**
- Remove the entire JS fallback block (lines 110-160)
- Change the function to throw if `binding?.astExtractClasses` is missing
- Update `AstExtractResult.engine` type to only `"rust"` (remove `"fallback"`)

#### 2.3 `packages/scanner/src/in-memory-cache.ts`
**Lines to remove:** 76-78, 91-94, 112, 120, 127

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `jsCache` | Map-based fallback cache | Remove |
| `cacheGet` | Tries native, falls back to Map | Native only |
| `cachePut` | Tries native, falls back to Map | Native only |
| `cacheInvalidate` | Calls both native and Map | Native only |
| `cacheSize` | Returns native or Map size | Native only |

**Implementation:**
- Remove `jsCache` declaration (line 78)
- Change `cacheGet` to throw if native binding missing
- Change `cachePut` to throw if native binding missing
- Change `cacheInvalidate` to throw if native binding missing
- Change `cacheSize` to throw if native binding missing
- Keep `isNative()` — always returns `true` now

#### 2.4 `packages/scanner/src/oxc-bridge.ts`
**Lines to remove:** 99-101

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `oxcExtractClasses` native path | Uses `binding.oxcExtractClasses` | Keep |
| `oxcExtractClasses` fallback | Chains to `astExtractClasses` | Remove |

**Implementation:**
- Remove the fallback block (lines 99-101)
- Change to throw if `binding?.oxcExtractClasses` is missing
- Remove `astExtractClasses` import (line 11)

---

### Category 3: Engine Package (2 files)

#### 3.1 `packages/engine/src/incremental.ts`
**Lines to remove:** 106-114

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `applyIncrementalChange` native | Uses `native.processFileChange` | Keep, throw if fails |
| `applyIncrementalChange` fallback | Simple `scanFile` + manual diff | Remove |

**Implementation:**
- Remove the JS fallback block (lines 106-114)
- Change the catch block (lines 98-103) to throw instead of logging warning
- Remove the `log.debug` call for fallback path (line 107)

#### 3.2 `packages/engine/src/watch-native.ts`
**Lines to remove:** 158, 161-195

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `watchWorkspace` native | Uses Rust notify | Keep, throw if fails |
| `watchWorkspace` fallback | Calls `nodeWatch` | Remove |
| `nodeWatch` function | Node.js `fs.watch` | Remove entirely |

**Implementation:**
- Remove `nodeWatch` function (lines 161-195)
- Remove the fallback call (line 158)
- Change the catch block (lines 98-106) to throw instead of returning fallback
- Change the `if (!result || result.status !== "ok")` block (lines 108-115) to throw

---

### Category 4: Shared Package (1 file — infrastructure)

#### 4.1 `packages/shared/src/nativeBinding.ts`
**Changes:** Remove env var checks, update error messages

| Component | Current Behavior | After Change |
|-----------|-----------------|--------------|
| `checkNativeDisabled()` | Checks `TWS_NO_NATIVE` and `TWS_NO_RUST` | Remove (always false) |
| `loadNativeBindingOrThrow` error message | Mentions "Disable native bindings (use JS fallback)" | Remove that option |

**Implementation:**
- Remove `checkNativeDisabled()` function (lines 23-37)
- Remove the `disabledCheck` block in `loadNativeBindingOrThrow` (lines 173-178)
- Update error message (lines 204-221) to remove "Disable native bindings" option
- Add note: "This package requires native Rust bindings. There is no JavaScript fallback."

---

## Implementation Order

### Phase 1: Infrastructure (1 file)
1. `packages/shared/src/nativeBinding.ts` — Remove env var checks, update messages

### Phase 2: Compiler Package (4 files)
2. `packages/compiler/src/twDetector.ts` — Remove JS regex fallbacks
3. `packages/compiler/src/astParser.ts` — Remove tokenizer fallback (~235 lines)
4. `packages/compiler/src/tailwindEngine.ts` — Remove Tiers 2 and 3 (~100 lines)
5. `packages/compiler/src/coreCompiler.ts` — Remove JS step (~30 lines)

### Phase 3: Scanner Package (4 files)
6. `packages/scanner/src/index.ts` — Remove JS extraction fallback
7. `packages/scanner/src/ast-native.ts` — Remove regex fallback (~50 lines)
8. `packages/scanner/src/in-memory-cache.ts` — Remove JS Map cache (~20 lines)
9. `packages/scanner/src/oxc-bridge.ts` — Remove fallback chain (~3 lines)

### Phase 4: Engine Package (2 files)
10. `packages/engine/src/incremental.ts` — Remove JS fallback (~10 lines)
11. `packages/engine/src/watch-native.ts` — Remove `nodeWatch` fallback (~40 lines)

### Phase 5: Build & Verify
12. Run `npm run build` — root must pass
13. Run `npm run test:examples` — all examples must pass
14. Verify no `NATIVE_BINDING_*` fallback patterns remain in codebase

---

## Code Removal Summary

| File | Lines Removed | Pattern Removed |
|------|--------------|-----------------|
| `shared/nativeBinding.ts` | ~20 | Env var checks |
| `compiler/twDetector.ts` | ~20 | Regex fallback |
| `compiler/astParser.ts` | ~235 | Tokenizer + parser |
| `compiler/tailwindEngine.ts` | ~110 | postcss + manual CSS |
| `compiler/coreCompiler.ts` | ~30 | JS transform step |
| `scanner/index.ts` | ~25 | JS class extraction |
| `scanner/ast-native.ts` | ~50 | Regex extraction |
| `scanner/in-memory-cache.ts` | ~20 | JS Map cache |
| `scanner/oxc-bridge.ts` | ~3 | Fallback chain |
| `engine/incremental.ts` | ~10 | JS re-scan |
| `engine/watch-native.ts` | ~40 | Node fs.watch |
| **Total** | **~563 lines** | |

---

## Testing Strategy

### Build Verification
```bash
# Step 1: Build native Rust module
npm run build:rust

# Step 2: Build root
npm run build

# Step 3: Build all examples
npm run test:examples
```

### Smoke Tests
After changes, verify:
1. `npm run build` passes (root build)
2. `npm run test:examples` passes (13/13 examples)
3. No `NATIVE_BINDING_*` fallback patterns remain
4. Error messages are clear when native binding is missing

### Failure Mode
If native binding is not available:
- Clear error message: "FATAL: Native binding 'X' not found. This package requires native Rust bindings."
- No silent fallback to slower JS implementation
- User must run `npm run build:rust` to proceed

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| oxc-parser not always available | Verify oxc-parser is in optionalDependencies, build:rust handles it |
| Breaking existing users who use TWS_NO_NATIVE | This is intentional — native-only is the new requirement |
| CI environments without Rust | Ensure `npm run build:rust` runs before `npm run build` in CI |
| Edge cases native doesn't handle | Remove the 50% resolve rate check — native must handle all cases |

---

## Success Criteria

1. All 11 files modified with fallback code removed
2. `npm run build` passes at root
3. `npm run test:examples` passes (13/13)
4. No `fallback`, `TWS_NO_NATIVE`, `TWS_NO_RUST`, `jsCache`, `nodeWatch` patterns remain in modified files
5. Error messages clearly indicate native-only mode
6. Total ~563 lines of fallback code removed
