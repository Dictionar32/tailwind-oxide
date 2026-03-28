# Zero Let — Final Batch (32 remaining declarations)

## Completed So Far
- Scanner: 22 → 0 ✅
- analyzer/binding.ts: 1 → 0 ✅
- animate/binding.ts: 1 → 0 ✅
- cli/traceService.ts: 7 → 0 ✅
- core/liveTokenEngine.ts: 2 → 0 ✅
- core/parser.ts binding loader: 1 → 0 ✅
- runtime-css/batchedInjector.ts: 2 → 0 ✅
- theme/liveTokenEngine.ts: 2 → 0 ✅
- theme/native-bridge.ts: 1 → 0 ✅
- vscode/inlineDecorationProvider.ts: 3 → 0 ✅
- next/routeCssMiddleware.ts:28-29: 2 → 0 ✅
- **Subtotal done: 43 declarations**

## Remaining: 32 declarations in 19 files

### Batch 1: Module-Level Singletons (3 let, 3 files)
1. **plugin/src/index.ts:195** — `let _globalRegistry = createRegistry()`
   - `const _state = { globalRegistry: createRegistry() }`
   - Update: line 198 (`resetGlobalRegistry`), line 283 (`createContext`)

2. **plugin-registry/src/index.ts:326** — `let defaultRegistry: PluginRegistry | null = null`
   - `const _state = { defaultRegistry: null as PluginRegistry | null }`
   - Update: lines 329, 331, 333 in `getRegistry()`

### Batch 2: Parser/Index Loops (14 let, 2 files)
3. **compiler/src/astParser.ts:176** — `let idx = 0` in `tokenize`
   - `const s = { idx: 0 }`, replace `idx` → `s.idx` throughout tokenize function

4. **compiler/src/astParser.ts:188-189** — `let j = idx + 1`, `let str = ch` (string parse inner loop)
   - `const inner = { j: s.idx + 1, str: ch }`, replace `j` → `inner.j`, `str` → `inner.str`

5. **compiler/src/astParser.ts:245** — `let j = idx` (word scan)
   - `const w = { j: s.idx }`, replace `j` → `w.j`

6. **compiler/src/astParser.ts:265** — `let i = startIdx` in `parseObject`
   - `const s = { i: startIdx }`, replace `i` → `s.i` throughout parseObject

7. **compiler/src/astParser.ts:320** — `let i = startIdx` in `parseArray`
   - `const s = { i: startIdx }`, replace `i` → `s.i` throughout parseArray

8. **core/src/parser.ts:116-119** — `let token`, `square`, `round`, `escaped` in `splitClassListJS`
   - `const s = { token: "", square: 0, round: 0, escaped: false }`
   - Replace: `token` → `s.token`, `square` → `s.square`, `round` → `s.round`, `escaped` → `s.escaped`

9. **core/src/parser.ts:150-153** — `let current`, `square`, `round`, `escaped` in `parseClassTokenJS`
   - `const s = { current: "", square: 0, round: 0, escaped: false }`
   - Replace: `current` → `s.current`, `square` → `s.square`, `round` → `s.round`, `escaped` → `s.escaped`

### Batch 3: String Accumulation (4 let, 4 files)
10. **vscode/src/commands/doctorCommand.ts:16** — `let html = \`...\`` then `html += ...`
    - Refactor to array: `const parts: string[] = [\`...\`]`, `parts.push(\`...\`)`, `const html = parts.join("")`

11. **vscode/src/commands/traceCommand.ts:39** — same pattern
12. **vscode/src/commands/whyCommand.ts:39** — same pattern

13. **next/src/routeCssMiddleware.ts:126** — `let concrete = routePattern` then for-loop reassign
    - `const concrete = Object.entries(params).reduce((c, [key, value]) => { ... }, routePattern)`

### Batch 4: Event Handler Accumulation (3 let, 1 file)
14. **vscode/src/utils/exec-script.ts:37-39** — `let stdout`, `stderr`, `timedOut`
    - `const io = { stdout: "", stderr: "", timedOut: false }`
    - Update all refs: `stdout` → `io.stdout`, `stderr` → `io.stderr`, `timedOut` → `io.timedOut`

### Batch 5: Conditional Assigns (2 let, 2 files)
15. **plugin-registry/src/cli.ts:72** — `let registryInstance` with if/else assign
    - IIFE pattern since one branch has try/catch:
      ```ts
      const registryInstance = await (async () => {
        if (registryUrl) {
          debugLog(debug, `loading registry from: ${registryUrl}`)
          try {
            const r = await PluginRegistry.loadFromUrl(registryUrl)
            debugLog(debug, `registry loaded`, t0)
            return r
          } catch (error) { printError(error); process.exit(1) }
        }
        return getRegistry()
      })()
      ```

16. **theme/src/index.ts:238** — `let style = document.getElementById(...); if (!style) { style = create... }`
    - Nullish coalescing + IIFE:
      ```ts
      const style = document.getElementById(styleId) as HTMLStyleElement | null
        ?? (() => { const el = document.createElement("style"); el.id = styleId; document.head.appendChild(el); return el })()
      ```

### Batch 6: Vite Plugin (2 let, 1 file)
17. **vite/src/plugin.ts:87-88** — `let root = process.cwd()`, `let isDev = true`
    - `const pluginState = { root: process.cwd(), isDev: true }`
    - Update: `root = config.root` → `pluginState.root = config.root`, `isDev = ...` → `pluginState.isDev = ...`
    - All `root` refs → `pluginState.root`, all `isDev` refs → `pluginState.isDev`

### Batch 7: Test Files (4 let, 1 file)
18. **shared/src/shared.test.ts:103-104** — `let tempDir`, `let tempFile` with beforeEach
    - `const testCtx = { tempDir: "", tempFile: "" }`
    - Update beforeEach, afterEach, and test blocks

19. **shared/src/shared.test.ts:231-232** — `let stdout`, `let stderr` with beforeEach
    - `const logCtx = { stdout: "", stderr: "" }`
    - Update beforeEach (including mock impl callbacks), afterEach, and test blocks

### SKIP
- **cli/src/createApp.ts:394** — `let count = 0` inside Svelte template string literal (not real TS)

## Verification
```bash
cd library
grep -rn "let " packages --include="*.ts" --exclude-dir=node_modules \
  | grep -v "for (let" \
  | grep -v "// \|/\*\|\* \|no let\|export let\|matchAll\|delete "
# Expected: only cli/createApp.ts (Svelte template) and svelte/index.ts (JSDoc)
```
