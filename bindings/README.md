# Multi-language Bindings (Sprint Pack)

This directory contains FFI wrappers that call the Rust core through a C ABI.

## Current status

| Binding | Status | Notes |
| --- | --- | --- |
| C | Ready (baseline) | Uses `bindings/c/tailwind.h` directly |
| Go | Scaffold | CGO wrapper |
| Python | Scaffold | `ctypes` wrapper |
| Java | Scaffold | JNI style facade (native methods only) |
| C# | Scaffold | `DllImport` wrapper |
| Swift | Scaffold | C bridge wrapper |
| Zig | Scaffold | direct C import |
| PHP | Scaffold | FFI wrapper |
| Ruby | Scaffold | Fiddle wrapper |

## ABI functions

- `tailwind_compile(const char* code) -> char*`
- `tailwind_compile_with_stats(const char* code) -> char*`
- `tailwind_free(char* ptr)`
- `tailwind_version(void) -> const char*`
- `tailwind_clear_cache(void)`

## Build (library)

The Rust core is under `native/`.

```bash
cargo build --manifest-path native/Cargo.toml --release
```

## Notes

- Returned strings from `tailwind_compile*` must be released with `tailwind_free`.
- `tailwind_version` returns a static string and must not be freed.
- Wrappers here are intentionally minimal so Sprint 2-7 can evolve without lock-in.
