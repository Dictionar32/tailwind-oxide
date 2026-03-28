# @tailwind-styled/engine

Unified build engine for tailwind-styled-v5 with native-first architecture.
Part of the tailwind-styled-v5 ecosystem.

## Features

- **Native-First**: Uses Rust bindings for optimal performance
- **Incremental Builds**: Efficient file change detection and CSS regeneration
- **Watch Mode**: Real-time file watching with debounce and batching
- **Plugin System**: Extensible hooks for customization
- **Analyzer Integration**: Optional semantic analysis (unused classes, conflicts)
- **Zero Runtime Overhead**: Generates compile-time CSS

## Installation

```bash
npm install @tailwind-styled/engine
```

## Quick Start

```typescript
import { createEngine } from "@tailwind-styled/engine"

async function main() {
  const engine = await createEngine({
    root: "./src",
    compileCss: true,
  })

  // Build once
  const result = await engine.build()
  console.log(result.css) // Generated atomic CSS
  console.log(result.mergedClassList) // All classes found

  // Or watch for changes
  await engine.watch((event) => {
    console.log(event.type, event.result.css)
  })
}

main()
```

## API Reference

### createEngine(options?)

Creates an engine instance with the following options:

```typescript
interface EngineOptions {
  /** Project root directory */
  root?: string
  /** Scanner options */
  scanner?: ScanWorkspaceOptions
  /** Whether to compile CSS (default: true) */
  compileCss?: boolean
  /** Path to tailwind config */
  tailwindConfigPath?: string
  /** Plugin instances */
  plugins?: EnginePlugin[]
  /** Enable analyzer integration (default: false) */
  analyze?: boolean
}
```

### Engine Methods

| Method | Description |
|--------|-------------|
| `scan()` | Scan workspace for files and classes |
| `build()` | Run full build (scan + CSS generation) |
| `watch(onEvent)` | Start watch mode with event callback |

### BuildResult

```typescript
interface BuildResult {
  scan: ScanWorkspaceResult
  mergedClassList: string // All unique classes
  css: string // Generated CSS
  analysis?: {
    unusedClasses: string[]
    classConflicts: Array<{ className: string; files: string[] }>
    classUsage: Record<string, number>
  }
}
```

## Plugins

Create custom plugins to extend engine functionality:

```typescript
const myPlugin: EnginePlugin = {
  name: "my-plugin",
  beforeScan(context) {
    console.log("Starting scan:", context.root)
  },
  afterScan(scan, context) {
    console.log(`Found ${scan.totalFiles} files`)
    return scan
  },
  transformClasses(classes, context) {
    // Add or modify classes
    return classes.map(c => c.includes("btn") ? `${c} font-bold` : c)
  },
  beforeBuild(scan, context) {
    console.log("Building...")
  },
  afterBuild(result, context) {
    console.log(`Generated ${result.css.length} bytes of CSS`)
    return result
  },
  onError(error, context) {
    console.error("Build error:", error.message)
  },
}
```

### Plugin Hooks

| Hook | Description |
|------|-------------|
| `beforeScan` | Called before scanning starts |
| `afterScan` | Called after scan completes |
| `transformClasses` | Transform class list before CSS generation |
| `beforeBuild` | Called before CSS build |
| `afterBuild` | Called after CSS build completes |
| `onError` | Called when an error occurs |

## Watch Events

```typescript
engine.watch((event) => {
  switch (event.type) {
    case "initial":
      console.log("Initial build:", event.result.css)
      break
    case "change":
      console.log("File changed:", event.filePath)
      break
    case "unlink":
      console.log("File deleted:", event.filePath)
      break
    case "full-rescan":
      console.log("Full rescan triggered")
      break
    case "error":
      console.error("Error:", event.error)
      break
  }
})
```

## Analyzer Integration

Enable semantic analysis for insights:

```typescript
const engine = await createEngine({
  root: "./src",
  analyze: true, // Enable analyzer
})

const result = await engine.build()

// Access analysis results
console.log(result.analysis?.unusedClasses)
console.log(result.analysis?.classUsage)
```

## Internal API

For advanced usage, import internal functions:

```typescript
import { applyIncrementalChange } from "@tailwind-styled/engine/internal"
import { watchWorkspaceNative } from "@tailwind-styled/engine/internal"
```

**Note**: Internal APIs may change at any time without notice.

## Breaking Changes in v5

| Area | v4 | v5 |
|------|----|----|
| API Exports | Many functions | Only `createEngine` + `EnginePlugin` |
| Analyzer | N/A | Optional via `analyze: true` |
| Watch Hooks | N/A | Added `beforeWatch`/`afterWatch` |

## TypeScript

This package is written in TypeScript and includes type definitions.

## See Also

- [@tailwind-styled/core](https://www.npmjs.com/package/tailwind-styled-v4) - Core styling API
- [@tailwind-styled/vite](https://www.npmjs.com/package/@tailwind-styled/vite) - Vite plugin
- [@tailwind-styled/next](https://www.npmjs.com/package/@tailwind-styled/next) - Next.js adapter