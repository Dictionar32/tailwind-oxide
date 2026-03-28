/**
 * tailwind-styled-v4 — Native bridge (ESM)
 *
 * Loads the compiled .node binding and re-exports all native functions
 * with consistent camelCase names. Every export has a graceful null
 * fallback so callers can always feature-detect with `hasNativeBinding()`.
 *
 * Functions exposed by the Rust engine (lib.rs):
 *   parse_classes          → parseClassesNative
 *   has_tw_usage           → hasTwUsageNative
 *   is_already_transformed → isAlreadyTransformedNative
 *   analyze_rsc            → analyzeRscNative
 *   transform_source       → transformSourceNative
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Locate .node binary ────────────────────────────────────────────────────

const candidates = [
  path.resolve(__dirname, "tailwind_styled_parser.node"),
  path.resolve(__dirname, "build/Release/tailwind_styled_parser.node"),
  path.resolve(__dirname, "../native/tailwind_styled_parser.node"),
];

let nativeBinding = null;

for (const full of candidates) {
  if (!fs.existsSync(full)) continue;
  try {
    nativeBinding = require(full);
    break;
  } catch {
    // try next candidate
  }
}

// ── Alias map: logical name → [snake_case, camelCase] ─────────────────────

const aliases = {
  // ── Core ────────────────────────────────────────────────────────────────────
  parseClasses:           ["parse_classes",             "parseClasses"],
  hasTwUsage:             ["has_tw_usage",              "hasTwUsage"],
  isAlreadyTransformed:   ["is_already_transformed",    "isAlreadyTransformed"],
  analyzeRsc:             ["analyze_rsc",               "analyzeRsc"],
  transformSource:        ["transform_source",          "transformSource"],
  // ── Analyzer ────────────────────────────────────────────────────────────────
  analyzeClasses:         ["analyze_classes",           "analyzeClasses"],
  // ── Animate ─────────────────────────────────────────────────────────────────
  compileAnimation:       ["compile_animation",         "compileAnimation"],
  compileKeyframes:       ["compile_keyframes",         "compileKeyframes"],
  // ── Theme ────────────────────────────────────────────────────────────────────
  compileTheme:           ["compile_theme",             "compileTheme"],
  extractCssVars:         ["extract_css_vars",          "extractCssVars"],
  // ── Engine ───────────────────────────────────────────────────────────────────
  computeIncrementalDiff: ["compute_incremental_diff",  "computeIncrementalDiff"],
  hashFileContent:        ["hash_file_content",         "hashFileContent"],
  // ── Scanner ──────────────────────────────────────────────────────────────────
  scanWorkspace:          ["scan_workspace",            "scanWorkspace"],
  extractClassesFromSource: ["extract_classes_from_source", "extractClassesFromSource"],
  // ── Disk Cache ───────────────────────────────────────────────────────────────
  cacheRead:              ["cache_read",                "cacheRead"],
  cacheWrite:             ["cache_write",               "cacheWrite"],
  cachePriority:          ["cache_priority",            "cachePriority"],
  // ── Ast Extract (regex-based) ────────────────────────────────────────────────
  astExtractClasses:      ["ast_extract_classes",       "astExtractClasses"],
  // ── LightningCSS-style compiler ──────────────────────────────────────────────
  compileCss:             ["compile_css",               "compileCss"],
  // ── Oxc AST + regex hybrid ───────────────────────────────────────────────────
  oxcExtractClasses:      ["oxc_extract_classes",       "oxcExtractClasses"],
  // ── In-memory scan cache ─────────────────────────────────────────────────────
  scanCacheGet:           ["scan_cache_get",            "scanCacheGet"],
  scanCachePut:           ["scan_cache_put",            "scanCachePut"],
  scanCacheInvalidate:    ["scan_cache_invalidate",     "scanCacheInvalidate"],
  scanCacheStats:         ["scan_cache_stats",          "scanCacheStats"],
  // ── Notify file watcher ───────────────────────────────────────────────────────
  startWatch:             ["start_watch",               "startWatch"],
  pollWatchEvents:        ["poll_watch_events",         "pollWatchEvents"],
  stopWatch:              ["stop_watch",                "stopWatch"],
};

function resolveFn(key) {
  if (!nativeBinding) return null;
  const [snake, camel] = aliases[key];
  return nativeBinding[snake] ?? nativeBinding[camel] ?? null;
}

function callRequired(key, ...args) {
  const fn = resolveFn(key);
  if (!fn) throw new Error(`[tailwind-styled/native] binding unavailable: ${key}`);
  return fn(...args);
}

function callOptional(key, ...args) {
  const fn = resolveFn(key);
  return fn ? fn(...args) : null;
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Returns true if the .node binding was loaded successfully. */
export function hasNativeBinding() {
  return nativeBinding !== null;
}

/**
 * Parse individual class tokens from a whitespace-separated string.
 * @returns {Array<{raw, base, variants, modifier_type, modifier_value}>}
 */
export function parseClassesNative(input) {
  return callRequired("parseClasses", input);
}

/**
 * Quick pre-check: does this source file contain any tw.* usage?
 * Returns null if the native binding is unavailable.
 * @returns {boolean | null}
 */
export function hasTwUsageNative(source) {
  return callOptional("hasTwUsage", source);
}

/**
 * Idempotency guard: was this file already transformed?
 * Returns null if the native binding is unavailable.
 * @returns {boolean | null}
 */
export function isAlreadyTransformedNative(source) {
  return callOptional("isAlreadyTransformed", source);
}

/**
 * Analyse RSC boundary for a source file.
 * @returns {{ isServer, needsClientDirective, clientReasons } | null}
 */
export function analyzeRscNative(source, filename = "") {
  return callOptional("analyzeRsc", source, filename);
}

/**
 * Full transform: parse tw.tag`...` templates → React component code.
 *
 * Also handles compound component blocks:
 *   tw.button`
 *     bg-blue-500
 *     icon { mr-2 w-5 h-5 }
 *     text { font-medium }
 *   `
 *
 * Returns:
 *   {
 *     code: string,              // transformed source
 *     classes: string[],         // all static classes (for CSS gen / safelist)
 *     changed: boolean,
 *     rscJson: string|null,      // JSON: { isServer, needsClientDirective }
 *     metadataJson: string|null, // JSON array of component metadata
 *   }
 *
 * Returns null if the native binding is unavailable (JS pipeline takes over).
 */
export function transformSourceNative(source, opts = {}) {
  // Rust expects Option<HashMap<String, String>> — filter out booleans/nulls
  const stringOpts = {};
  for (const [k, v] of Object.entries(opts)) {
    if (v !== null && v !== undefined && v !== false) {
      stringOpts[k] = String(v);
    }
  }
  const rustOpts = Object.keys(stringOpts).length > 0 ? stringOpts : null;
  return callOptional("transformSource", source, rustOpts);
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

/**
 * Analyse class frequency across a workspace scan.
 * @param {string} filesJson  JSON: [{file, classes:[]}...]
 * @param {string} root       Project root path
 * @param {number} topN       How many top/duplicate classes to return
 */
export function analyzeClassesNative(filesJson, root, topN = 10) {
  return callOptional("analyzeClasses", filesJson, root, topN);
}

// ── Animate ───────────────────────────────────────────────────────────────────

/**
 * Compile a from/to animation into @keyframes + animation CSS.
 */
export function compileAnimationNative(from, to, opts = {}) {
  return callOptional(
    "compileAnimation",
    from, to,
    opts.name ?? null,
    opts.durationMs ?? null,
    opts.easing ?? null,
    opts.delayMs ?? null,
    opts.fill ?? null,
    opts.iterations != null ? String(opts.iterations) : null,
    opts.direction ?? null,
  );
}

/**
 * Compile a custom multi-stop @keyframes.
 * @param {string} name
 * @param {string} stopsJson  JSON: [{stop:"0%", classes:"opacity-0 scale-95"},...]
 */
export function compileKeyframesNative(name, stopsJson) {
  return callOptional("compileKeyframes", name, stopsJson);
}

// ── Theme ─────────────────────────────────────────────────────────────────────

/**
 * Compile a token map into a CSS variable block.
 * @param {string} tokensJson  JSON: {"color":{"primary":"#3b82f6"}}
 * @param {string} themeName   "light" | "dark" | "brand" | etc.
 * @param {string} prefix      CSS var prefix, e.g. "tw"
 */
export function compileThemeNative(tokensJson, themeName, prefix = "") {
  return callOptional("compileTheme", tokensJson, themeName, prefix);
}

/**
 * Extract all CSS variable references (--var-name) from source.
 */
export function extractCssVarsNative(source) {
  return callOptional("extractCssVars", source);
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Compute incremental diff between two scan states.
 * @param {string} previousJson  JSON: [{file, classes:[], hash}...]
 * @param {string} currentJson   JSON: [{file, classes:[], hash}...]
 */
export function computeIncrementalDiffNative(previousJson, currentJson) {
  return callOptional("computeIncrementalDiff", previousJson, currentJson);
}

/**
 * Hash file content for change detection.
 */
export function hashFileContentNative(content) {
  return callOptional("hashFileContent", content);
}

// ── Scanner ───────────────────────────────────────────────────────────────────

/**
 * Scan a workspace directory tree and extract all Tailwind classes.
 * Rust replacement for scanWorkspace() in @tailwind-styled/scanner.
 */
export function scanWorkspaceNative(root, extensions = null) {
  return callOptional("scanWorkspace", root, extensions);
}

/**
 * Extract Tailwind classes from a single source file's content.
 */
export function extractClassesFromSourceNative(source) {
  return callOptional("extractClassesFromSource", source);
}

// ── Oxc AST Parser ────────────────────────────────────────────────────────────

/**
 * Ekstrak kelas Tailwind menggunakan Oxc AST + regex hybrid.
 * Lebih akurat dari regex murni: deteksi komponen, imports, "use client".
 * @param {string} source   Source code JS/TS/JSX/TSX
 * @param {string} filename Nama file untuk deteksi source type
 */
export function oxcExtractClassesNative(source, filename = "file.tsx") {
  return callOptional("oxcExtractClasses", source, filename);
}

// ── In-memory Scan Cache ──────────────────────────────────────────────────────

/**
 * Ambil kelas dari in-memory cache jika hash cocok.
 * Return null jika cache miss atau file berubah.
 */
export function scanCacheGetNative(filePath, contentHash) {
  return callOptional("scanCacheGet", filePath, contentHash);
}

/**
 * Simpan hasil ekstraksi ke in-memory cache (DashMap Rust).
 */
export function scanCachePutNative(filePath, contentHash, classes, mtimeMs, size) {
  return callOptional("scanCachePut", filePath, contentHash, classes, mtimeMs, size);
}

/**
 * Invalidate cache entry untuk file yang dihapus/direname.
 */
export function scanCacheInvalidateNative(filePath) {
  return callOptional("scanCacheInvalidate", filePath);
}

/**
 * Statistik cache: jumlah entry saat ini.
 */
export function scanCacheStatsNative() {
  return callOptional("scanCacheStats");
}

// ── Notify File Watcher ───────────────────────────────────────────────────────

/**
 * Mulai watch direktori secara rekursif menggunakan Rust notify.
 * Events dikumpulkan di queue — poll dengan pollWatchEventsNative().
 * @param {string} rootDir  Direktori yang di-watch
 * @returns {{ status: string, handleId: number }}
 */
export function startWatchNative(rootDir) {
  return callOptional("startWatch", rootDir);
}

/**
 * Poll events yang terkumpul sejak poll terakhir.
 * Panggil periodik (mis. setiap 200ms) di setInterval.
 * @param {number} handleId  Handle dari startWatchNative()
 * @returns {Array<{ kind: string, path: string }>}
 */
export function pollWatchEventsNative(handleId) {
  return callOptional("pollWatchEvents", handleId);
}

/**
 * Hentikan watcher.
 * @param {number} handleId  Handle dari startWatchNative()
 */
export function stopWatchNative(handleId) {
  return callOptional("stopWatch", handleId);
}

// ── LightningCSS-style Compiler ───────────────────────────────────────────────

/**
 * Compile list kelas Tailwind → atomic CSS.
 * 200+ mapping class → CSS property, color palette lengkap,
 * arbitrary values, variant hover/sm/md/dark.
 * @param {string[]} classes  Daftar kelas Tailwind
 * @param {string|null} prefix  CSS selector prefix (default: ".")
 */
export function compileCssNative(classes, prefix = null) {
  return callOptional("compileCss", classes, prefix);
}

// ── Disk Cache (JSON) ─────────────────────────────────────────────────────────

/**
 * Baca scanner cache JSON dari disk.
 */
export function cacheReadNative(cachePath) {
  return callOptional("cacheRead", cachePath);
}

/**
 * Tulis scanner cache ke disk sebagai JSON.
 */
export function cacheWriteNative(cachePath, entries) {
  return callOptional("cacheWrite", cachePath, entries);
}

/**
 * Hitung priority score untuk SmartCache (Rust version).
 */
export function cachePriorityNative(mtimeMs, size, cachedMtimeMs, cachedSize, cachedHitCount, cachedLastSeenMs, nowMs) {
  return callOptional("cachePriority", mtimeMs, size, cachedMtimeMs, cachedSize, cachedHitCount, cachedLastSeenMs, nowMs);
}
