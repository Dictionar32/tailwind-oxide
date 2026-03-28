# @tailwind-styled/animate

Native-backed animation compiler for `tailwind-styled-v4`.

## v5 Highlights

- Async API (`animate`, `keyframes`, `compileAnimation`, `compileKeyframes`)
- Native backend only (no JS fallback)
- Optimized class validation (`compileCss` native when available, analyzer fallback)
- Instance-based registry (`createAnimationRegistry`)
- No automatic runtime style injection
- Node.js `>=20`

## Install

```bash
npm install @tailwind-styled/animate
```

## Usage

```ts
import {
  animate,
  animations,
  extractAnimationCss,
  injectAnimationCss,
  keyframes,
} from "@tailwind-styled/animate"

const fadeIn = await animate({ from: "opacity-0", to: "opacity-100", duration: 200 })
const spin = await keyframes("spin", { "0%": "rotate-0", "100%": "rotate-180" })
const preset = await animations.slideUp()

// Build-time extraction
const css = extractAnimationCss()

// Optional runtime injection (manual, browser only)
injectAnimationCss()

// Non-browser safe mode
injectAnimationCss(undefined, { silent: true })
```

## Registry API

```ts
import {
  animate,
  createAnimationRegistry,
  extractAnimationCss,
  resetAnimationRegistry,
} from "@tailwind-styled/animate"

const registry = createAnimationRegistry()
const cls = await animate({ from: "opacity-0", to: "opacity-100" }, registry)
const css = extractAnimationCss(registry)
resetAnimationRegistry(registry)

// Optional cache limit (LRU)
const boundedRegistry = createAnimationRegistry({ cacheLimit: 128 })
```

## API Notes

- `animate(opts)` and `keyframes(name, stops)` return only `className`.
- `compileAnimation(opts)` and `compileKeyframes(name, stops)` return full compiled output:
  - `className`
  - `keyframesCss`
  - `animationCss`
- Preset helpers (`animations.*`) use internal LRU caching and registry-aware reuse for repeated calls.
- Registry cache is in-memory with bounded LRU behavior (default limit: `512` entries).
- Use `createAnimationRegistry({ cacheLimit })` to tune max retained entries.
- `resetAnimationRegistry()` still clears all registry state immediately.

## Environment Variables

| Variable | Description |
| --- | --- |
| `TWS_ANIMATE_NATIVE_PATH` | Explicit `.node` path for animate binding resolution. |
| `TWS_NATIVE_PATH` | Shared fallback override path for native binding resolution. |
| `TWS_NO_NATIVE` / `TWS_NO_RUST` | Disable native loading (unsupported in v5 animate, will throw). |
| `TWS_DEBUG` / `TAILWIND_STYLED_DEBUG` | Set `1` to enable animate debug logs. |
| `DEBUG` | Supports `tailwind-styled:animate` or `tailwind-styled:*`. |

## Breaking Changes from v4

1. `animate()` and `keyframes()` are now async and must be awaited.
2. JS fallback has been removed; native backend is required.
3. Automatic `<style>` injection has been removed from `animate()` and `keyframes()`.
4. Preset `animations` entries are async functions (`await animations.fadeIn()`).
5. Global mutable registry APIs were replaced by explicit registry instances and helpers.

## License

MIT
