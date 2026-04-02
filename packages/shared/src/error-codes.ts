/**
 * Error code registry — single source of truth for all error codes.
 *
 * Format: E[0-9]xx for errors, W[0-9]xx for warnings.
 * Use with TwError for consistent error handling.
 */

export const ERROR_CODES = {
  // E0xx — Native binding
  NATIVE_NOT_FOUND: "E001",
  NATIVE_LOAD_FAILED: "E002",
  NATIVE_VERSION_MISMATCH: "E003",
  SCANNER_NATIVE_NOT_FOUND: "E004",
  SCANNER_HASH_FAILED: "E005",
  NATIVE_TRANSFORM_UNAVAILABLE: "E006",

  // E2xx — Compilation
  MISSING_REACT_IMPORT: "E201",
  UNSUPPORTED_PATTERN: "E202",
  TEMPLATE_PARSE_ERROR: "E203",
  COMPILE_TIMEOUT: "E204",

  // E3xx — Compatibility
  TAILWIND_VERSION_UNSUPPORTED: "E301",
  NODE_VERSION_UNSUPPORTED: "E302",

  // E4xx — Cache
  CACHE_READ_FAILED: "E401",
  CACHE_WRITE_FAILED: "E402",
  CACHE_CORRUPTED: "E403",

  // E5xx — RSC
  RSC_BOUNDARY_CONFLICT: "E501",

  // W1xx — Warnings
  DYNAMIC_CONTENT: "W101",
  INVALID_VARIANT_VALUE: "W201",
  DEPRECATED_MODE: "W301",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

const ERROR_SUGGESTIONS: Record<string, string> = {
  E001: "Run: npm install @tailwind-styled/native-{platform} or build from source",
  E002: "Try: npm rebuild or reinstall the package",
  E003: "Run: npm install tailwind-styled-v4@latest to sync versions",
  E004: "Run: npm install @tailwind-styled/scanner",
  E006: "Run: npm install @tailwind-styled/compiler",
  E301: "Upgrade: npm install tailwindcss@^4",
}

export function getSuggestion(code: string): string | undefined {
  return ERROR_SUGGESTIONS[code]
}

export function formatErrorCode(code: string): string {
  const prefix = code.startsWith("E") ? "Error" : code.startsWith("W") ? "Warning" : "Code"
  return `[${prefix} ${code}]`
}
