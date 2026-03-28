# @tailwind-styled/vite

Part of the tailwind-styled-v5 ecosystem. For the core styling API, see [@tailwind-styled/core](https://www.npmjs.com/package/tailwind-styled-v4).

Vite plugin for tailwind-styled-v5 with compile-time transformation, safelist generation, and engine integration for building CSS.

## Installation

```bash
npm install @tailwind-styled/vite
```

Also make sure the required dependencies are installed:

```bash
npm install @tailwind-styled/compiler @tailwind-styled/engine @tailwind-styled/scanner
```

## Quick Start

Create or modify the `vite.config.ts` file in your project root:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tailwindStyledPlugin } from '@tailwind-styled/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindStyledPlugin()
  ]
})
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | `RegExp` | `/\.(tsx\|ts\|jsx\|js)$/` | Filter files to process |
| `exclude` | `RegExp` | `/node_modules/` | Files to ignore |
| `scanDirs` | `string[]` | `['src']` | Directories for safelist generation |
| `safelistOutput` | `string` | `.tailwind-styled-safelist.json` | Safelist output path |
| `generateSafelist` | `boolean` | `true` | Enable safelist generation |
| `scanReportOutput` | `string` | `.tailwind-styled-scan-report.json` | Scan report output path |
| `useEngineBuild` | `boolean` | `true` | Use engine for CSS build |
| `analyze` | `boolean` | `false` | Enable semantic report |

## Zero-Runtime Mode

This plugin operates in **zero-runtime** mode, which means:

- No CSS runtime is injected into the application during development or production
- All classes like `tw()` are transformed into regular class strings at compile-time
- Styling is done entirely at build time, not at runtime

How the plugin works:
1. **Transform Phase**: When Vite transforms files, the plugin processes all files matching the `include` pattern and excludes `exclude`. Each call to `tw()`, `styled()`, or other functions is transformed into a regular class string.

2. **Build End Phase**: After transformation completes, the plugin runs:
   - Safelist generation to ensure all used classes are not purged by Tailwind
   - Workspace scan for file analysis
   - CSS build using the engine (if `useEngineBuild: true`)

## Engine Build

The plugin uses `@tailwind-styled/engine` to generate final CSS on the `buildEnd` hook. Here's how the engine works:

1. **Engine Initialization**: The engine is created with root project configuration, CSS compile options, and scanner settings.

2. **Scanning**: The engine scans the workspace to find all relevant files based on extensions (`tsx`, `ts`, `jsx`, `js`).

3. **Class Analysis**: The engine analyzes all classes used in the project.

4. **CSS Generation**: The engine generates the final CSS file based on:
   - Generated safelist (to ensure classes are not purged)
   - Tailwind configuration
   - Imported CSS files

During the build process, the engine outputs a confirmation message: `[tailwind-styled-v4] ✓ Engine build complete`.

## Using analyze Option

The `analyze` option is used to enable semantic reports that provide more detailed information about styling used in your project.

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tailwindStyledPlugin } from '@tailwind-styled/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindStyledPlugin({
      analyze: true
    })
  ]
})
```

When `analyze` is enabled:
- The engine will perform deeper analysis of styling structure
- More complete information will be available in the scan report
- Useful for debugging and optimizing styling in large projects

## Safelist Output Example

The safelist is generated to `.tailwind-styled-safelist.json` file with the following format:

```json
{
  "safelist": [
    "bg-red-500",
    "text-white",
    "p-4",
    "flex",
    "items-center",
    "hover:bg-blue-500",
    "md:flex-row"
  ]
}
```

This safelist serves to:
- Prevent Tailwind from purging dynamically used classes (string interpolation, dynamic conditions, etc.)
- Ensure all used styling remains in the final CSS
- Useful when using patterns like `tw\`class-${variant}\`` or conditional classes

## Migration Notes from v4 to v5

### Breaking Changes

The following options are deprecated in v5:

| Deprecated Option | Status |
|-------------------|--------|
| `mode` | Deprecated - always zero-runtime |
| `routeCss` | Deprecated - handled by engine |
| `deadStyleElimination` | Deprecated - use `analyze: true` |
| `addDataAttr` | Deprecated - handled internally |
| `autoClientBoundary` | Deprecated - handled internally |
| `hoist` | Deprecated - handled internally |
| `incremental` | Deprecated - no longer needed |

### Console Warning

If you use deprecated options, the plugin will display a warning in the console:

```
[tailwind-styled-v4] Warning: 'mode' is deprecated in v5. Only zero-runtime is supported.
```

### Change Explanation

1. **Always Zero-Runtime Mode**: In v5, the mode is always `zero-runtime`. There is no option to use runtime mode. Styling is fully transformed at compile-time.

2. **useEngineBuild Default True**: Engine build is now enabled by default. The engine handles CSS generation, class analysis, and optimization. To disable, use `useEngineBuild: false`.

## Understanding scanDirs

**Important**: `scanDirs` is ONLY relevant for safelist generation, not for engine build.

- **Safelist Generation**: `scanDirs` determines which directories are scanned to find dynamically used classes. The default value is `['src']`.

- **Engine Build**: The engine uses an internal scanner with different configuration. The engine ignores directories in `scanDirs` when scanning for CSS build (see `scanner.ignoreDirectories: scanDirs` in the plugin code).

This means changes to `scanDirs` will affect:
- Files scanned for safelist generation
- But will NOT affect directories scanned by the engine for CSS build

If you want to change the directories scanned by the engine, you need to adjust the engine configuration internally or refer to the `@tailwind-styled/engine` documentation for more information.

## See Also

- [@tailwind-styled/core](https://www.npmjs.com/package/tailwind-styled-v4) - The core `tw()` API for styling
- [@tailwind-styled/next](https://www.npmjs.com/package/@tailwind-styled/next) - Next.js integration