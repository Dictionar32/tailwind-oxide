# Plan: Test All 28 Packages in next-js-app Example

## Goal
Create a comprehensive test page in `examples/next-js-app` that tests all 28 packages from `packages/` directory, with clear status indicators for each package (pass/fail/skipped).

## Package Analysis Summary

### Directly Testable (No Mocks) — 6 packages
| Package | Exports to Test | Reason |
|---------|----------------|--------|
| `atomic` | `parseAtomicClass`, `generateAtomicCss`, `toAtomicClasses`, `getAtomicRegistry`, `clearAtomicRegistry` | Pure functions, no dependencies |
| `shared` | `LRUCache`, `createLogger`, `hashContent`, `debounce`, `throttle`, `parseVersion` | Pure utility functions |
| `preset` | `defaultPreset`, `defaultGlobalCss`, `defaultThemeCss`, `designTokens` | Pure data/config exports |
| `plugin-api` | `createPluginRegistry`, `createPluginContext`, `getGlobalRegistry`, `resetGlobalRegistry` | Pure plugin contracts |
| `testing` | `toHaveClass`, `toHaveClasses`, `toNotHaveClass`, `expectClasses`, `getClassList` | Pure assertion helpers |
| `storybook-addon` | `generateArgTypes`, `enumerateVariantProps`, `getVariantClass`, `createVariantStoryArgs` | Pure variant utilities |

### Testable With Mocks — 18 packages
| Package | Exports to Test | Mock Required |
|---------|----------------|---------------|
| `animate` | `compileAnimation`, `compileKeyframes`, `animate`, `keyframes`, `extractAnimationCss`, `animations` | None for pure functions |
| `core` | `tw`, `server`, `cv`, `cn`, `cx`, `cxm`, `twMerge`, `liveToken`, `setToken`, `getTokens`, `tokenRef`, `tokenVar`, `createTheme`, `parseTailwindClasses` | React (already available) |
| `devtools` | `TwDevTools`, `DevToolsPanel`, `parseDataTw`, `parseVariantAttr` | DOM mock |
| `runtime-css` | `batchedInject`, `flushBatchedCss`, `getBatchedCssStats`, `resetBatchedCss`, `syncInject` | None for pure functions |
| `runtime` | `createComponent`, `cx` | React (already available) |
| `theme` | `defineThemeContract`, `createTheme`, `ThemeRegistry`, `compileDesignTokens`, `liveToken`, `tokenVar` | DOM mock for liveToken |
| `compiler` | `extractAllClasses`, `mergeClassesStatic`, `normalizeClasses` | None for pure functions |
| `engine` | `createEngine`, `parseEngineOptions` | None for schema validation |
| `scanner` | `isScannableFile`, `DEFAULT_EXTENSIONS`, `DEFAULT_IGNORES` | None for pure functions |
| `analyzer` | `classToCss`, `__internal` (normalizeClassInput, splitVariantAndBase) | None for pure functions |
| `dashboard` | `currentMetrics`, `getMetricsSummary`, `normalizeMetrics`, `resetHistory` | None for pure functions |
| `next` | `withTailwindStyled`, `parseNextAdapterOptions` | None for schema validation |
| `rspack` | `TailwindStyledRspackPlugin`, `parseRspackPluginOptions` | None for class instantiation |
| `vite` | `tailwindStyledPlugin`, `parseVitePluginOptions` | None for class instantiation |
| `plugin` | `createTwPlugin` + re-exports from plugin-api | None for pure functions |
| `plugin-registry` | `PluginRegistry`, `getRegistry`, `registry` | None for read-only operations |
| `svelte` | `cv`, `tw` | None for pure functions |
| `vue` | `cv`, `tw`, `extend`, `TailwindStyledPlugin` | None for pure functions |
| `syntax` | `parseClasses` | None for pure functions |

### NOT Testable in Next.js — 4 packages
| Package | Reason |
|---------|--------|
| `cli` | CLI tool designed for terminal, not browser/Node.js library |
| `vscode` | VS Code extension, requires `vscode` API only available in VS Code runtime |
| `studio-desktop` | Electron app, not a library, no exports to test |

## Implementation Plan

### Step 1: Create Test Page Structure
Create `examples/next-js-app/src/app/packages-test/page.tsx` with:
- Header section explaining the test
- Category-based organization (Runtime, Shared Utilities, Bundler Plugins, etc.)
- Individual package test sections with status indicators
- Summary section with pass/fail/skipped counts

### Step 2: Create Package Test Components
Create `examples/next-js-app/src/components/packages/` directory with:
- `PackageCard.tsx` — Reusable card component for each package test
- `TestResult.tsx` — Component to display test results (pass/fail/skipped)
- Individual test files for each package category

### Step 3: Implement Direct Testable Packages (6)
For each package:
1. Import the package
2. Call key exported functions
3. Verify results
4. Display status

### Step 4: Implement Mock-Dependent Packages (18)
For each package:
1. Import the package
2. Create minimal mocks where needed
3. Test key functionality
4. Display status

### Step 5: Implement Skip Logic for Non-Testable Packages (4)
For each package:
1. Display package name
2. Show "SKIPPED" status
3. Display reason why it can't be tested in Next.js context

### Step 6: Build and Verify
1. Run `npm run build` in examples/next-js-app
2. Verify all packages are loaded without errors
3. Check that test page renders correctly
4. Verify build output in `.next/` directory

## File Structure

```
examples/next-js-app/src/
├── app/
│   └── packages-test/
│       └── page.tsx              # Main test page
└── components/
    └── packages/
        ├── PackageCard.tsx       # Reusable package test card
        ├── TestResult.tsx        # Test result display
        ├── atomic-test.tsx       # Atomic package tests
        ├── shared-test.tsx       # Shared package tests
        ├── preset-test.tsx       # Preset package tests
        ├── plugin-api-test.tsx   # Plugin API tests
        ├── testing-test.tsx      # Testing package tests
        ├── storybook-addon-test.tsx # Storybook addon tests
        ├── animate-test.tsx      # Animate package tests
        ├── core-test.tsx         # Core package tests
        ├── devtools-test.tsx     # DevTools package tests
        ├── runtime-css-test.tsx  # Runtime CSS tests
        ├── runtime-test.tsx      # Runtime package tests
        ├── theme-test.tsx        # Theme package tests
        ├── compiler-test.tsx     # Compiler package tests
        ├── engine-test.tsx       # Engine package tests
        ├── scanner-test.tsx      # Scanner package tests
        ├── analyzer-test.tsx     # Analyzer package tests
        ├── dashboard-test.tsx    # Dashboard package tests
        ├── next-test.tsx         # Next.js adapter tests
        ├── rspack-test.tsx       # Rspack adapter tests
        ├── vite-test.tsx         # Vite adapter tests
        ├── plugin-test.tsx       # Plugin package tests
        ├── plugin-registry-test.tsx # Plugin registry tests
        ├── svelte-test.tsx       # Svelte adapter tests
        ├── vue-test.tsx          # Vue adapter tests
        ├── syntax-test.tsx       # Syntax package tests
        └── skipped-test.tsx      # Skipped packages display
```

## Test Implementation Details

### Direct Testable Packages (6 packages)

#### atomic
```typescript
import { parseAtomicClass, generateAtomicCss, toAtomicClasses, clearAtomicRegistry } from "@tailwind-styled/atomic"

// Test: Parse atomic class
const rule = parseAtomicClass("p-4")
// Expected: { twClass: "p-4", atomicName: "_tw_p_4", property: "padding", value: "1rem" }

// Test: Generate CSS
const css = generateAtomicCss([rule])
// Expected: CSS string with the rule

// Test: Convert to atomic classes
const result = toAtomicClasses("p-4 m-2 text-sm")
// Expected: { atomicClasses: "_tw_p_4 _tw_m_2 _tw_text_sm", rules: [...], unknownClasses: [] }

// Cleanup
clearAtomicRegistry()
```

#### shared
```typescript
import { LRUCache, createLogger, hashContent, debounce, throttle, parseVersion } from "@tailwind-styled/shared"

// Test: LRU Cache
const cache = new LRUCache<string, number>(2)
cache.set("a", 1)
cache.set("b", 2)
cache.get("a") // Should return 1

// Test: Logger
const logger = createLogger("test")
logger.info("test message")

// Test: Hash
const hash = hashContent("test content")
// Should return a hash string

// Test: Debounce
const debouncedFn = debounce(() => {}, 100)
debouncedFn()

// Test: Throttle
const throttledFn = throttle(() => {}, 100)
throttledFn()

// Test: Version parsing
const version = parseVersion("5.0.4")
// Should return { major: 5, minor: 0, patch: 4 }
```

#### preset
```typescript
import { defaultPreset, defaultGlobalCss, defaultThemeCss, designTokens } from "@tailwind-styled/preset"

// Test: Default preset exists
// Expected: defaultPreset is an object

// Test: CSS exports exist
// Expected: defaultGlobalCss and defaultThemeCss are strings

// Test: Design tokens exist
// Expected: designTokens is an object with colors, spacing, etc.
```

#### plugin-api
```typescript
import { createPluginRegistry, createPluginContext, getGlobalRegistry, resetGlobalRegistry } from "@tailwind-styled/plugin-api"

// Test: Create plugin registry
const registry = createPluginRegistry()
// Expected: registry object with registerTransform, registerToken, etc.

// Test: Create plugin context
const context = createPluginContext()
// Expected: context object with utilities for plugin development

// Test: Get global registry
const globalRegistry = getGlobalRegistry()
// Expected: global registry instance

// Cleanup
resetGlobalRegistry()
```

#### testing
```typescript
import { toHaveClass, toHaveClasses, toNotHaveClass, expectClasses, getClassList } from "@tailwind-styled/testing"

// Test: getClassList
const classList = getClassList("p-4 m-2 text-sm")
// Expected: ["p-4", "m-2", "text-sm"]

// Test: expectClasses
const element = document.createElement("div")
element.className = "p-4 m-2"
// expectClasses(element, ["p-4", "m-2"]) — would pass

// Test: expectNoClasses
// expectNoClasses(element, ["text-sm"]) — would pass
```

#### storybook-addon
```typescript
import { generateArgTypes, enumerateVariantProps, getVariantClass, createVariantStoryArgs } from "@tailwind-styled/storybook-addon"

// Test: Generate arg types
const argTypes = generateArgTypes({
  intent: {
    options: ["primary", "secondary"],
    control: { type: "select" }
  }
})
// Expected: argTypes object with intent property

// Test: Enumerate variant props
const variants = enumerateVariantProps({
  intent: ["primary", "secondary"],
  size: ["sm", "md", "lg"]
})
// Expected: array of variant combinations

// Test: Get variant class
const className = getVariantClass("intent", "primary")
// Expected: class string for primary intent

// Test: Create variant story args
const args = createVariantStoryArgs({
  intent: "primary",
  size: "md"
})
// Expected: args object with variant values
```

### Mock-Dependent Packages (18 packages)

#### animate
```typescript
import { compileAnimation, compileKeyframes, animate, keyframes, extractAnimationCss, animations } from "@tailwind-styled/animate"

// Test: Compile animation
const compiled = await compileAnimation({
  name: "fadeIn",
  duration: "300ms",
  timingFunction: "ease-out"
})
// Expected: { className: string, css: string }

// Test: Extract CSS
const css = extractAnimationCss()
// Expected: CSS string with animation definitions

// Test: Preset animations
// Expected: animations object with fadeIn, slideUp, etc.
```

#### core
```typescript
import { tw, server, cv, cn, cx, cxm, twMerge, liveToken, setToken, getTokens, tokenRef, tokenVar, createTheme, parseTailwindClasses } from "tailwind-styled-v4"

// Test: cn/cx merge
const merged = cn("p-4", "m-2", "text-sm")
// Expected: "p-4 m-2 text-sm"

// Test: Conditional merge
const conditional = cx("p-4", false && "m-2", "text-sm")
// Expected: "p-4 text-sm"

// Test: Parse classes
const parsed = parseTailwindClasses("p-4 m-2 hover:text-sm")
// Expected: parsed class objects

// Test: Create theme
const theme = createTheme({
  colors: {
    primary: "blue-500",
    secondary: "gray-500"
  }
})
// Expected: theme object with CSS variables

// Test: Live tokens
const token = liveToken("blue-500")
setToken("colors.primary", "blue-600")
const value = getTokens()
// Expected: tokens object

// Test: Token ref/var
const ref = tokenRef("colors.primary")
const var_ = tokenVar("colors.primary")
// Expected: CSS variable references
```

#### devtools
```typescript
import { parseDataTw, parseVariantAttr, findNearestTwElement } from "@tailwind-styled/devtools"

// Test: Parse data-tw attribute
const parsed = parseDataTw("p-4 m-2")
// Expected: parsed class information

// Test: Parse variant attribute
const variant = parseVariantAttr('{"intent":"primary"}')
// Expected: variant object

// Note: TwDevTools component needs React context and DOM
```

#### runtime-css
```typescript
import { batchedInject, flushBatchedCss, getBatchedCssStats, resetBatchedCss, syncInject } from "@tailwind-styled/runtime-css"

// Test: Batched inject
batchedInject("test-class", "p-4 { padding: 1rem; }")
const stats = getBatchedCssStats()
// Expected: { pending: number, injected: number }

// Test: Flush batched CSS
const css = flushBatchedCss()
// Expected: CSS string

// Test: Sync inject
syncInject("sync-class", "m-2 { margin: 0.5rem; }")
// Expected: void

// Cleanup
resetBatchedCss()
```

#### runtime
```typescript
import { createComponent, cx } from "@tailwind-styled/runtime"

// Test: cx merge
const merged = cx("p-4", "m-2")
// Expected: "p-4 m-2"

// Test: Create component
const MyComponent = createComponent({
  displayName: "MyComponent",
  render: (props) => null
})
// Expected: React component
```

#### theme
```typescript
import { defineThemeContract, createTheme, ThemeRegistry, compileDesignTokens, liveToken, tokenVar, tokenRef } from "@tailwind-styled/theme"

// Test: Define theme contract
const contract = defineThemeContract({
  colors: {
    primary: "string",
    secondary: "string"
  }
})
// Expected: theme contract object

// Test: Create theme
const theme = createTheme(contract, {
  colors: {
    primary: "blue-500",
    secondary: "gray-500"
  }
})
// Expected: theme object

// Test: Theme registry
const registry = new ThemeRegistry()
registry.register("default", theme)
const retrieved = registry.get("default")
// Expected: theme object

// Test: Compile design tokens
const tokens = compileDesignTokens({
  colors: {
    primary: "blue-500"
  }
})
// Expected: compiled token object

// Test: Live tokens
const token = liveToken("blue-500")
const var_ = tokenVar("colors.primary")
const ref = tokenRef("colors.primary")
// Expected: token references
```

#### compiler
```typescript
import { extractAllClasses, mergeClassesStatic, normalizeClasses } from "@tailwind-styled/compiler"

// Test: Extract classes
const classes = extractAllClasses("p-4 m-2 hover:text-sm focus:bg-blue-500")
// Expected: array of class objects

// Test: Merge classes
const merged = mergeClassesStatic(["p-4", "p-2"], { strategy: "last-wins" })
// Expected: "p-2"

// Test: Normalize classes
const normalized = normalizeClasses("p-4  m-2   text-sm")
// Expected: normalized class string
```

#### engine
```typescript
import { createEngine, parseEngineOptions } from "@tailwind-styled/engine"

// Test: Parse engine options
const options = parseEngineOptions({
  root: ".",
  output: "dist",
  watch: false
})
// Expected: validated options object

// Note: createEngine needs filesystem access, test schema validation only
```

#### scanner
```typescript
import { isScannableFile, DEFAULT_EXTENSIONS, DEFAULT_IGNORES } from "@tailwind-styled/scanner"

// Test: Is scannable file
const isScannable = isScannableFile("src/App.tsx")
// Expected: true

const notScannable = isScannableFile("package.json")
// Expected: false

// Test: Default extensions
// Expected: array of file extensions to scan

// Test: Default ignores
// Expected: array of patterns to ignore
```

#### analyzer
```typescript
import { classToCss, __internal } from "@tailwind-styled/analyzer"

// Test: Class to CSS
const css = classToCss("p-4")
// Expected: "padding: 1rem;"

// Test: Internal utilities
const normalized = __internal.normalizeClassInput("p-4 m-2")
// Expected: normalized class array

const [variant, base] = __internal.splitVariantAndBase("hover:text-sm")
// Expected: ["hover", "text-sm"]

const prefix = __internal.utilityPrefix("p-4")
// Expected: "p"
```

#### dashboard
```typescript
import { currentMetrics, getMetricsSummary, normalizeMetrics, resetHistory } from "@tailwind-styled/dashboard"

// Test: Get current metrics
const metrics = currentMetrics()
// Expected: metrics object

// Test: Get metrics summary
const summary = getMetricsSummary()
// Expected: summary object with averages, totals

// Test: Normalize metrics
const normalized = normalizeMetrics({
  buildTime: 100,
  scanTime: 50,
  compileTime: 75
})
// Expected: normalized metrics object

// Cleanup
resetHistory()
```

#### next
```typescript
import { withTailwindStyled, parseNextAdapterOptions } from "tailwind-styled-v4/next"

// Test: Parse Next adapter options
const options = parseNextAdapterOptions({
  autoClientBoundary: true,
  optimizePackageImports: ["@tailwind-styled/core"]
})
// Expected: validated options object

// Note: withTailwindStyled is a config wrapper, test schema validation only
```

#### rspack
```typescript
import { TailwindStyledRspackPlugin, parseRspackPluginOptions } from "@tailwind-styled/rspack"

// Test: Parse Rspack plugin options
const options = parseRspackPluginOptions({
  include: ["src/**/*.{ts,tsx}"],
  exclude: ["node_modules"]
})
// Expected: validated options object

// Test: Create plugin instance
const plugin = new TailwindStyledRspackPlugin()
// Expected: plugin instance
```

#### vite
```typescript
import { tailwindStyledPlugin, parseVitePluginOptions } from "@tailwind-styled/vite"

// Test: Parse Vite plugin options
const options = parseVitePluginOptions({
  include: ["src/**/*.{ts,tsx}"],
  exclude: ["node_modules"]
})
// Expected: validated options object

// Test: Create plugin
const plugin = tailwindStyledPlugin()
// Expected: Vite plugin object
```

#### plugin
```typescript
import { createTwPlugin, createPluginRegistry, createPluginContext, getGlobalRegistry, resetGlobalRegistry } from "@tailwind-styled/plugin"

// Test: Create plugin
const plugin = createTwPlugin("test-plugin", (context) => {
  // Plugin setup
})
// Expected: plugin object

// Test: Re-exports from plugin-api
const registry = createPluginRegistry()
const context = createPluginContext()
const globalRegistry = getGlobalRegistry()

// Cleanup
resetGlobalRegistry()
```

#### plugin-registry
```typescript
import { PluginRegistry, getRegistry, registry } from "@tailwind-styled/plugin-registry"

// Test: Get registry
const reg = getRegistry()
// Expected: PluginRegistry instance

// Test: Registry instance
// Expected: registry is a PluginRegistry instance

// Test: Search (read-only operation)
const results = reg.search("tailwind")
// Expected: array of plugin info objects
```

#### svelte
```typescript
import { cv, tw } from "@tailwind-styled/svelte"

// Test: cv function
const variants = cv({
  base: "p-4",
  variants: {
    intent: {
      primary: "bg-blue-500",
      secondary: "bg-gray-500"
    }
  }
})
// Expected: variant resolver function

// Test: tw function
const classes = tw("p-4", "m-2")
// Expected: merged class string
```

#### vue
```typescript
import { cv, tw, extend, TailwindStyledPlugin } from "@tailwind-styled/vue"

// Test: cv function
const variants = cv({
  base: "p-4",
  variants: {
    intent: {
      primary: "bg-blue-500",
      secondary: "bg-gray-500"
    }
  }
})
// Expected: variant resolver function

// Test: tw function
const classes = tw("p-4", "m-2")
// Expected: merged class string

// Test: extend function
const extended = extend("p-4", "m-2")
// Expected: extended class string

// Test: TailwindStyledPlugin
// Expected: Vue plugin object
```

#### syntax
```typescript
import { parseClasses } from "@tailwind-styled/syntax"

// Test: Parse classes
const classes = parseClasses("p-4 m-2 hover:text-sm")
// Expected: array of class objects
```

### Skipped Packages (4 packages)

#### cli
```typescript
// SKIPPED: CLI tool designed for terminal, not browser/Node.js library
// Reason: CLI commands require terminal interaction and filesystem access
// Alternative: Use `npx create-tailwind-styled` in terminal
```

#### vscode
```typescript
// SKIPPED: VS Code extension, requires `vscode` API only available in VS Code runtime
// Reason: Extension API is only available in VS Code environment
// Alternative: Install extension from VS Code marketplace
```

#### studio-desktop
```typescript
// SKIPPED: Electron app, not a library, no exports to test
// Reason: Desktop application with no library exports
// Alternative: Run Electron app directly
```

## UI Components

### PackageCard Component
```typescript
interface PackageCardProps {
  name: string
  packageName: string
  category: string
  status: "pass" | "fail" | "skipped"
  tests: TestResult[]
  skipReason?: string
}

interface TestResult {
  name: string
  status: "pass" | "fail" | "skipped"
  result?: any
  error?: string
}
```

### Page Layout
1. Header with title and description
2. Category sections (Runtime, Shared Utilities, Bundler Plugins, etc.)
3. Package cards with test results
4. Summary section with counts
5. Build verification section

## Success Criteria

1. All 28 packages are represented on the test page
2. 6 packages show "PASS" status with working tests
3. 18 packages show "PASS" or "FAIL" based on mock implementation success
4. 4 packages show "SKIPPED" with clear reasons
5. Page builds successfully with `npm run build`
6. No TypeScript errors in the test page
7. Page renders correctly in browser

## Risks and Mitigations

1. **Risk**: Some packages may have circular dependencies
   **Mitigation**: Test packages in isolation, avoid cross-package imports

2. **Risk**: Native bindings may fail in browser context
   **Mitigation**: Use pure JavaScript fallbacks where available

3. **Risk**: React version conflicts
   **Mitigation**: Use the same React version as the Next.js app

4. **Risk**: Build size increase
   **Mitigation**: Use dynamic imports for large packages

## Timeline

- Step 1-2: 30 minutes (setup and components)
- Step 3: 1 hour (direct testable packages)
- Step 4: 2 hours (mock-dependent packages)
- Step 5: 30 minutes (skipped packages)
- Step 6: 30 minutes (build and verify)

Total estimated time: 4.5 hours
