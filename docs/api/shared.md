# @tailwind-styled/shared API

Package utilitas bersama yang digunakan oleh semua packages dalam monorepo.

## `LRUCache<K, V>`

```ts
import { LRUCache } from "@tailwind-styled/shared"

const cache = new LRUCache<string, number>(256, 60_000) // max 256 entries, 60s TTL
cache.set("key", 42)
cache.get("key") // → 42
cache.has("key") // → true
cache.delete("key")
cache.clear()
cache.size       // → number
```

**Constructor:** `new LRUCache(max = 256, ttlMs = null)`
- `max` — maksimum entries (LRU eviction saat penuh)
- `ttlMs` — TTL dalam ms (null = tidak expire)

## `createLogger(prefix, level?)`

```ts
import { createLogger, logger } from "@tailwind-styled/shared"

const log = createLogger("tw:engine", "info")
log.info("Build started")
log.debug("Verbose detail")  // suppressed di level "info"
log.warn("Something odd")
log.error("Fatal")
log.setLevel("debug")        // ubah level runtime

// Global logger (prefix: "tailwind-styled")
logger.info("Global message")
```

**LogLevel:** `"silent" | "error" | "warn" | "info" | "debug"`  
**Env:** `TWS_LOG_LEVEL=debug` atau `TWS_DEBUG_SCANNER=1` untuk debug mode.

## `hashContent(content, algorithm?, length?)`

```ts
import { hashContent, hashFile } from "@tailwind-styled/shared"

hashContent("hello world")          // → "5eb63bbb" (8-char hex, MD5)
hashContent("abc", "sha256", 16)    // → 16-char hex, SHA-256
hashFile("/path/to/file.ts")        // → hash isi file
```

## `debounce(fn, ms)` / `throttle(fn, ms)`

```ts
import { debounce, throttle } from "@tailwind-styled/shared"

const onSave = debounce(() => rebuild(), 100)  // delay 100ms
const onScroll = throttle(() => update(), 16)   // max 1x per 16ms
```

## `parseVersion(v)` / `satisfiesMinVersion(version, min)`

```ts
import { parseVersion, satisfiesMinVersion } from "@tailwind-styled/shared"

parseVersion("4.2.1")              // → { major: 4, minor: 2, patch: 1 }
satisfiesMinVersion("4.2.0", "4.1.0")  // → true
satisfiesMinVersion("3.9.9", "4.0.0")  // → false
```
