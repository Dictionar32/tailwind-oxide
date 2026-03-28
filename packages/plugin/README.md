# @tailwind-styled/plugin v5

Plugin system untuk tailwind-styled-v5 — extend compiler pipeline di berbagai tahap.

## Instalasi

```bash
npm install @tailwind-styled/plugin@5.0.0
```

## API Utama

### `use(plugin, config)`

Register plugin ke global registry.

```typescript
import { use, presetVariants } from "@tailwind-styled/plugin"

use(presetVariants())
```

### `createTw(opts)`

Buat scoped instance dengan registry terpisah. Berguna untuk library atau sub-application yang butuh isolasi.

```typescript
import { createTw, pluginAnimation, pluginTokens } from "@tailwind-styled/plugin"

const { registry, use } = createTw({
  plugins: [
    pluginAnimation(),
    pluginTokens({ colors: { primary: "#3b82f6" } })
  ]
})
```

Return value:
- `registry` — PluginRegistry object
- `use(plugin)` — Function untuk add plugin ke scoped registry

## Plugin Resmi

Import dari `./plugins`:

```typescript
import { 
  pluginAnimation, 
  pluginTokens, 
  pluginTypography 
} from "@tailwind-styled/plugin/plugins"

// pluginAnimation - Animation utilities dan variants
// pluginTokens   - Design tokens sebagai CSS variables
// pluginTypography - Prose utility class
```

### pluginAnimation

Menambahkan:
- `motion-safe` / `motion-reduce` variants
- Animation utilities: `animate-fade-in`, `animate-slide-up`, `animate-spin`, etc.
- CSS @keyframes injection

```typescript
use(pluginAnimation({ 
  prefix: "tw-anim",        // default: "tw-anim"
  reducedMotion: true      // default: true
}))
```

### pluginTokens

Menambahkan design tokens sebagai CSS custom properties + utility classes.

```typescript
use(pluginTokens({
  colors: {
    primary: "#3b82f6",
    secondary: "#6366f1",
  },
  fonts: {
    sans: "InterVariable, system-ui",
  },
  spacing: {
    sm: "0.5rem",
    md: "1rem",
  },
  generateUtilities: true // default: true
}))
```

### pluginTypography

Menambahkan `prose` utility class untuk rich text content.

```typescript
use(pluginTypography({
  color: "inherit",
  fontFamily: "inherit", 
  maxWidth: "65ch"
}))
```

## Presets Bawaan

Import dari root atau `./presets`:

```typescript
import { 
  presetVariants, 
  presetScrollbar, 
  presetTokens 
} from "@tailwind-styled/plugin"

// atau
import { presetVariants } from "@tailwind-styled/plugin/presets"
```

| Preset | Deskripsi |
|--------|-----------|
| `presetVariants()` | group-hover, group-focus, peer-checked, rtl, ltr, print, motion-safe, motion-reduce |
| `presetScrollbar()` | scrollbar-none, scrollbar-thin, scrollbar-auto |
| `presetTokens(tokens)` | Color tokens sebagai CSS variables |
| `presetRustCompiler()` | Rust CSS compiler integration |

## Membuat Plugin Sendiri

```typescript
import { TwPlugin, TwContext } from "@tailwind-styled/plugin"

const myPlugin: TwPlugin = {
  name: "my-custom-plugin",
  
  setup(ctx: TwContext) {
    // Add variant
    ctx.addVariant("print", (sel) => `@media print { ${sel} }`)
    
    // Add utility
    ctx.addUtility("glow", { "box-shadow": "0 0 20px currentColor" })
    
    // Add token
    ctx.addToken("brand-color", "#ff4d6d")
    
    // Add transform hook untuk tw.tag({ ... })
    ctx.addTransform((config, meta) => {
      // Modify component config
      return config
    })
    
    // Hook into CSS generation
    ctx.onGenerateCSS((css) => {
      // Modify generated CSS
      return css
    })
    
    // Hook into build end
    ctx.onBuildEnd(async () => {
      // Cleanup atau reporting
    })
  }
}

use(myPlugin)
```

## TwContext API

| Method | Deskripsi |
|--------|-----------|
| `addVariant(name, resolver)` | Tambah variant baru |
| `addUtility(name, styles)` | Tambah utility class |
| `addToken(name, value)` | Tambah design token (CSS variable) |
| `addTransform(fn)` | Hook untuk tw.tag({ ... }) transform |
| `onGenerateCSS(hook)` | Hook ke CSS generation phase |
| `onBuildEnd(hook)` | Hook ke build end |
| `getToken(name)` | Ambil live token value (jika token engine tersedia) |
| `subscribeTokens(callback)` | Subscribe ke token updates |

## Types

```typescript
import type { 
  TwPlugin, 
  TwContext, 
  PluginRegistry,
  VariantResolver,
  UtilityDefinition 
} from "@tailwind-styled/plugin"
```

## Rust CSS Compiler

Generate CSS menggunakan Rust engine:

```typescript
import { generateCssRust } from "@tailwind-styled/plugin"

const result = await generateCssRust(["flex", "items-center", "bg-blue-500"])
// result.css         → generated CSS string
// result.resolvedCount → number of resolved classes
// result.unknownCount  → number of unknown classes
// result.engine        → "rust" | "fallback"
```

## Live Token Engine

Plugin automatically integrates dengan live token engine jika tersedia:

```typescript
// Token engine should expose:
globalThis.__TW_TOKEN_ENGINE__ = {
  getToken(name: string): string | undefined,
  getTokens(): Record<string, string>,
  subscribeTokens(callback): () => void
}
```

Plugin akan otomatis sync tokens dan reaktif terhadap perubahan.

## Upgrade dari v4

Untuk upgrade dari v4 ke v5:

1. **Update import paths** untuk plugin resmi:
   ```typescript
   // v4
   import { pluginAnimation } from "@tailwind-styled/plugin"
   
   // v5
   import { pluginAnimation } from "@tailwind-styled/plugin/plugins"
   ```

2. **Version bump**:
   ```bash
   npm install @tailwind-styled/plugin@5.0.0
   ```

## Lisensi

MIT
