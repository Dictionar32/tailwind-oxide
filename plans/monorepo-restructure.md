# Monorepo Restructuring Plan — tailwind-styled-v4

## Scope
Fix all structural issues: workspaces, build pipeline, quality/DX, dependency cleanup. Zero functionality loss, add improvements.

---

## Phase 1: Workspace Setup (Foundation)

### 1.1 Add `workspaces` to root `package.json`
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

### 1.2 Update all internal deps to `workspace:` protocol
Every `@tailwind-styled/*` dependency across 26 package.json files:
- `"@tailwind-styled/shared": "^5.0.2"` → `"@tailwind-styled/shared": "workspace:*"`
- Repeat for all 26 packages' internal cross-references

### 1.3 Fix `core` package naming conflict
- Current: `"name": "tailwind-styled-v4"` (same as root!)
- Fix: Rename to `"name": "@tailwind-styled/core"`
- Update root `package.json` to keep `"name": "tailwind-styled-v4"` as the public npm name

### 1.4 Fix circular dependency: `compiler` ↔ `plugin`
- `compiler/package.json` depends on `plugin` (`@tailwind-styled/plugin`)
- `plugin/package.json` depends on `compiler` (`@tailwind-styled/compiler`)
- Solution: Extract shared types/interfaces into `@tailwind-styled/shared` or a new `@tailwind-styled/types` package
- Both `compiler` and `plugin` import from the shared types instead of each other

---

## Phase 2: Build Pipeline Cleanup

### 2.1 Sync versions across all packages
- Root: `5.0.3` → all packages: `5.0.3`
- Update `tsup` banner strings to match
- Add `version-sync.mjs` script for future releases

### 2.2 Standardize build config
Option A (Recommended): One `tsup.config.ts` per package
- Convert 18 inline tsup args to dedicated `tsup.config.ts` files
- Each package's `build` script: `tsup`

Option B: Root-only build (simpler)
- Keep root `tsup.config.ts` as single source of truth
- Each package's `build` script: `tsup --config ../../tsup.config.ts`

### 2.3 Fix `cli/tsup.config.ts` alias resolution
- Current: aliases to root `dist/` folder (assumes root build ran first)
- Fix: alias to source `.ts` files or use `workspace:` resolution

### 2.4 Fix `engine/package.json` typo
- `tup.config.ts` → `tsup.config.ts`

### 2.5 Fix `core/package.json` non-standard field
- Remove `peerDependenciesOptional`
- Use standard `peerDependencies` + `peerDependenciesMeta`

---

## Phase 3: Quality & DX

### 3.1 Consolidate linters → Biome only
- Remove ESLint (currently only runs `prefer-const` — unnecessary after zero-let work)
- Remove OxLint (redundant with Biome)
- Remove `eslint.config.js`, `.oxlintrc.json`, `scripts/lint.mjs`
- Update `check` script: `biome check --write . && tsc --noEmit`

### 3.2 Unify test framework → node:test only
- Convert 4 vitest configs (shared, engine, vite, storybook-addon) to node:test
- Remove `vitest.config.ts` files
- Ensure all tests use `node:test` + `node:assert` pattern
- Root test command stays: `node --test 'packages/*/test/*.test.mjs'`

### 3.3 Add missing tests
- `atomic` — add basic test
- `dashboard` — add smoke test
- `devtools` — add unit test
- `studio-desktop` — skip (Electron, requires GUI)
- `vscode` — skip (extension, needs VS Code host)

### 3.4 Fix stale examples
- `simple-app-html/package.json`: `tailwind-styled@^1.0.1` → `tailwind-styled-v4@^5.0.0`
- `vite-react/` — add actual `tailwind-styled-v4` dependency

### 3.5 Add `engines` to all packages
- Ensure every `package.json` has `"engines": {"node": ">=20"}`

---

## Phase 4: Dependency Cleanup

### 4.1 Zod v3 → v4 migration
- `shared/package.json`: `zod@^3.25.76` → `zod@^4.3.6`
- Update any v3-specific API usage in `shared/src/`
- Run tests to verify compatibility

### 4.2 Fix circular dependency (from Phase 1.4)
- Extract shared types to `@tailwind-styled/shared` or `@tailwind-styled/types`
- Remove `compiler` → `plugin` dep
- Remove `plugin` → `compiler` dep (move to shared types)

### 4.3 Standardize `peerDependencies`
- Review all packages for unnecessary peer deps
- Use `peerDependenciesMeta` for optional peers
- Remove duplicate deps (already in `dependencies` AND `peerDependencies`)

---

## Execution Order
1. Phase 1.3 (fix core naming) — no breakage risk
2. Phase 2.1 (version sync) — straightforward
3. Phase 2.4 (typo fix) — trivial
4. Phase 2.5 (non-standard field) — trivial
5. Phase 3.1 (lint consolidation) — removes redundant tools
6. Phase 3.2 (test unification) — 4 vitest → node:test
7. Phase 3.4 (fix examples) — trivial
8. Phase 3.5 (engines field) — trivial
9. Phase 1.1 (add workspaces) — requires npm install
10. Phase 1.2 (workspace: protocol) — bulk change
11. Phase 2.2 (standardize build) — 18 config changes
12. Phase 2.3 (fix cli aliases) — build dependency fix
13. Phase 4.1 (zod migration) — needs testing
14. Phase 1.4 + 4.2 (circular dep fix) — most invasive, last
15. Phase 3.3 (add tests) — ongoing

## Verification
```bash
npm install                  # workspace linking works
npm run build               # unified build succeeds
npm run build:packages      # per-package builds succeed
npm test                    # all tests pass
npm run check               # biome + tsc clean
```
