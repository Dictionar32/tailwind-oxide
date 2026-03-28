# Zero Let — Cross-Format Batch (10 declarations)

The zero-everything analyzer scans ALL files in `src/` (`.mjs`, `.js`, `.html`, `.tsx`), not just `.ts`. The previous work only covered `.ts` files. 10 real `let` declarations remain in non-TS files.

## Files to Refactor

### 1. `dashboard/src/server.mjs` (2 let)

**Line 28:** `let currentMetrics = {...}` — module-level mutable state
- Wrap in state object: `const _state = { metrics: { generatedAt: ..., buildMs: null, ... } }`
- Update: line 46 (`updateMetrics` reassignment), line 47 (`history.push`), line 49 (`events.emit`), and any other refs to `currentMetrics`

**Line 161:** `let prevGenAt = null` — inside an HTML template string `<script>` block (browser JS)
- Change to: `const _state = { prevGenAt: null }`
- Update all `prevGenAt` refs inside that `<script>` block

### 2. `devtools/src/index.tsx` (1 let)

**Line 74:** `let cur: HTMLElement | null = el` — DOM parent chain traversal
```ts
// BEFORE
let cur: HTMLElement | null = el
while (cur) {
  if (cur.dataset?.tw) return cur
  cur = cur.parentElement
}

// AFTER — use reduce/find pattern or wrap in state
const cur = { el: el as HTMLElement | null }
while (cur.el) {
  if (cur.el.dataset?.tw) return cur.el
  cur.el = cur.el.parentElement
}
```

### 3. `studio-desktop/src/loading-error.html` (1 let)

**Line 54:** `let attempts = 0` — inline `<script>` block (browser JS)
- Change to: `const state = { attempts: 0 }`
- Update: `state.attempts++` on line 58, `state.attempts >= maxAttempts` on line 65

### 4. `studio-desktop/src/main.js` (6 let)

**Lines 44-48:** Module-level window/tray/server state
```js
// BEFORE
let mainWindow = null
let tray = null
let studioServer = null
let currentProject = process.argv.find(...)

// AFTER
const app = {
  mainWindow: null,
  tray: null,
  studioServer: null,
  currentProject: process.argv.find((a) => a.startsWith("--project="))?.split("=")[1]
      ?? process.cwd(),
}
```
Update all references: `mainWindow` → `app.mainWindow`, `tray` → `app.tray`, `studioServer` → `app.studioServer`, `currentProject` → `app.currentProject`

**Lines 293-294:** Lazy engine state (inside `app.whenReady()` callback)
```js
// BEFORE
let _engine = null
let _engineWatcher = null

// AFTER
const engineState = { engine: null, watcher: null }
```
Update: `_engine` → `engineState.engine`, `_engineWatcher` → `engineState.watcher`

## Verification
```bash
find packages -type d -name "src" -exec grep -rn "let " {} \; 2>/dev/null | grep -v "for (let" | grep -v "// \|/\*\|\* \|no let\|export let"
# Expected: only cli/createApp.ts (Svelte template) and svelte/index.ts (JSDoc)
```
