# @tailwind-styled/shared

Shared utilities for tailwind-styled monorepo.

## Installation

```bash
npm install @tailwind-styled/shared
```

## Features

### LRUCache

Least Recently Used cache with optional TTL support.

```typescript
import { LRUCache } from "@tailwind-styled/shared"

const cache = new LRUCache<string, number>(100) // max 100 entries
cache.set("key", 42)
cache.get("key") // 42

// With TTL (100ms)
const cacheWithTTL = new LRUCache<string, string>(10, 100)
```

Methods:
- `get(key)` - Get value, returns undefined if missing/expired
- `set(key, value)` - Set value
- `has(key)` - Check if key exists
- `delete(key)` - Remove key
- `clear()` - Clear all entries
- `size` - Number of entries
- `keys()`, `values()`, `entries()` - Iterators

### Logger

Centralized logger with configurable log levels.

```typescript
import { createLogger, logger } from "@tailwind-styled/shared"

// Create a namespaced logger
const log = createLogger("my-component")

log.info("Starting...")
log.warn("Warning message")
log.error("Error!")

// Set log level programmatically
log.setLevel("debug")
log.debug("Debug info")

// Use environment variable
// TWS_LOG_LEVEL=debug npm run ...
```

Log levels: `silent` | `error` | `warn` | `info` | `debug`

### Hash

Content and file hashing utilities.

```typescript
import { hashContent, hashFile } from "@tailwind-styled/shared"

// Hash string content
hashContent("hello world") // "4aeac639"
hashContent("hello world", "sha256", 16) // custom algorithm/length

// Hash file content
hashFile("./package.json") // "a1b2c3d4"
```

### Timing

Debounce and throttle utilities.

```typescript
import { debounce, throttle } from "@tailwind-styled/shared"

// Debounce - delay until after inactivity
const debouncedFn = debounce(() => {
  console.log("Executed after 300ms of inactivity")
}, 300)

// Throttle - execute at most once per interval
const throttledFn = throttle(() => {
  console.log("Executed at most once per 100ms")
}, 100)
```

### Version

Version parsing and comparison.

```typescript
import { parseVersion, satisfiesMinVersion } from "@tailwind-styled/shared"

// Parse semver
parseVersion("1.2.3") // { major: 1, minor: 2, patch: 3 }
parseVersion("v2.0.1") // { major: 2, minor: 0, patch: 1 }

// Check minimum version
satisfiesMinVersion("1.2.0", "1.1.0") // true
satisfiesMinVersion("1.0.0", "1.1.0") // false
```

### Native Binding Helpers

Utilities for loading native Node.js bindings.

```typescript
import {
  loadNativeBinding,
  resolveNativeBindingCandidates,
  isDebugNamespaceEnabled,
} from "@tailwind-styled/shared"

// Load native binding with fallback
const binding = loadNativeBinding({
  moduleName: "my_native_module",
  fallback: () => ({ /* JS fallback */ }),
})

// Resolve candidate paths
const candidates = resolveNativeBindingCandidates({
  moduleName: "my_module",
  runtimeDir: __dirname,
})
```

## API

### LRUCache\<K, V\>

| Method | Description |
|--------|-------------|
| `get(key)` | Get value, returns undefined if missing or expired |
| `set(key, value)` | Set a value |
| `has(key)` | Check if key exists |
| `delete(key)` | Delete a key |
| `clear()` | Clear all entries |
| `size` | Number of entries |
| `keys()` | Iterator over keys |
| `values()` | Iterator over values |
| `entries()` | Iterator over [key, value] pairs |

### createLogger

```typescript
function createLogger(prefix: string, level?: LogLevel): Logger
```

### Logger

```typescript
interface Logger {
  error(...args: unknown[]): void
  warn(...args: unknown[]): void
  info(...args: unknown[]): void
  debug(...args: unknown[]): void
  setLevel(level: LogLevel): void
}
```

## License

MIT
