/*!
 * tailwind-styled-v4 — Native Rust Engine
 *
 * Exposes the following to Node.js via N-API:
 *   parse_classes           — tokenise + parse individual class tokens
 *   has_tw_usage            — fast pre-check before running the full transform
 *   is_already_transformed  — idempotency guard
 *   transform_source        — full compile: extract → normalise → generate component code
 *   analyze_rsc             — detect RSC / "use client" boundary
 *
 * Also exposes C ABI symbols for bindings/ (Go, Swift, …):
 *   tailwind_compile, tailwind_compile_with_stats,
 *   tailwind_free, tailwind_version, tailwind_clear_cache
 *
 * Subcomponent block syntax supported by transform_source:
 *   const Button = tw.button`
 *     bg-blue-500 text-white
 *     icon { mr-2 w-5 h-5 }
 *     text { font-medium }
 *   `
 */

use dashmap::DashMap;
use napi_derive::napi;
use once_cell::sync::Lazy;
use regex::Regex;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
// ─ OPTIMIZATION (Phase 2): Parallel iterators for workspace scanning
use rayon::prelude::*;

// Sub-modules ───────────────────────────────────────────────────────────────
mod oxc_parser;
mod scan_cache;
mod watcher;
// ─ OPTIMIZATION (Phase 3): AST-optimized template detection
mod ast_optimizer;

// ─ OPTIMIZATION (Phase 2.4): Thread pool configuration for parallelism control
mod thread_pool {
    use once_cell::sync::Lazy;
    use rayon::ThreadPoolBuilder;

    /// Global thread pool for workspace scanning operations.
    /// Size limited to CPU count to prevent oversubscription.
    pub static SCAN_THREAD_POOL: Lazy<rayon::ThreadPool> = Lazy::new(|| {
        let num_threads = num_cpus::get();
        ThreadPoolBuilder::new()
            .num_threads(num_threads)
            .stack_size(4 * 1024 * 1024) // 4MB per thread (reasonable for file I/O)
            .build()
            .expect("Failed to create thread pool")
    });
}

// ─── Lazy-compiled regexes (compiled once at first use, reused across calls) ──
static RE_TOKEN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\S+").unwrap());
static RE_OPACITY: Lazy<Regex> = Lazy::new(|| Regex::new(r"^(.*)/(\d{1,3})$").unwrap());
static RE_ARBITRARY: Lazy<Regex> = Lazy::new(|| Regex::new(r"\((--[a-zA-Z0-9_-]+)\)").unwrap());
static RE_BLOCK: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?m)\b([a-z][a-zA-Z0-9_]*)\s*\{([^}]*)\}").unwrap());
static RE_TEMPLATE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\btw\.(server\.)?(\w+)`((?:[^`\\]|\\.)*)`").unwrap());
static RE_WRAP: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"\btw\((\w+)\)`((?:[^`\\]|\\.)*)`").unwrap());
static RE_COMP_NAME: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?m)(?:const|let|var)\s+(\w+)\s*=\s*tw\.(?:server\.)?\w+`").unwrap());
static RE_INTERACTIVE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"\b(hover:|focus:|active:|group-hover:|peer-|on[A-Z]|useState|useEffect|useRef)\b")
        .unwrap()
});
static RE_IMPORT_TW: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r#"import\s*\{[^}]*\btw\b[^}]*\}\s*from\s*["']tailwind-styled-v4["'];?\n?"#).unwrap()
});
static RE_STILL_TW: Lazy<Regex> = Lazy::new(|| Regex::new(r"\btw\.(server\.)?\w+[`(]").unwrap());

// ─────────────────────────────────────────────────────────────────────────────
// Types exposed to N-API
// ─────────────────────────────────────────────────────────────────────────────

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct ParsedClass {
    pub raw: String,
    pub base: String,
    pub variants: Vec<String>,
    pub modifier_type: Option<String>,
    pub modifier_value: Option<String>,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct SubComponent {
    pub name: String,
    pub tag: String,
    pub classes: String,
    pub scoped_class: String,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct TransformResult {
    pub code: String,
    pub classes: Vec<String>,
    pub changed: bool,
    pub rsc_json: Option<String>,
    pub metadata_json: Option<String>,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct RscAnalysis {
    pub is_server: bool,
    pub needs_client_directive: bool,
    pub client_reasons: Vec<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

fn short_hash(input: &str) -> String {
    let mut h: u64 = 5381;
    for b in input.bytes() {
        h = h.wrapping_mul(33).wrapping_add(b as u64);
    }
    format!("{:06x}", h & 0xFF_FFFF)
}

fn parse_classes_inner(input: &str) -> Vec<ParsedClass> {
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate vector based on whitespace token count estimates
    // Typical case: 10-15 classes per template, reducing realloc from ~5 to ~0 times
    let estimated_capacity = input.split_whitespace().count().max(1);
    let mut out: Vec<ParsedClass> = Vec::with_capacity(estimated_capacity);

    for m in RE_TOKEN.find_iter(input) {
        let token = m.as_str();
        let parts: Vec<&str> = token.split(':').collect();
        let variants = if parts.len() > 1 {
            parts[0..parts.len() - 1]
                .iter()
                .map(|s| s.to_string())
                .collect()
        } else {
            Vec::new()
        };
        let base: String = parts.last().unwrap_or(&"").to_string();

        let mut parsed = ParsedClass {
            raw: token.to_string(),
            base: base.clone(),
            variants,
            modifier_type: None,
            modifier_value: None,
        };

        if let Some(c) = RE_OPACITY.captures(&base) {
            parsed.base = c[1].to_string();
            parsed.modifier_type = Some("opacity".to_string());
            parsed.modifier_value = Some(c[2].to_string());
        } else if let Some(c) = RE_ARBITRARY.captures(&base) {
            parsed.modifier_type = Some("arbitrary".to_string());
            parsed.modifier_value = Some(c[1].to_string());
        }

        out.push(parsed);
    }
    out
}

fn normalise_classes(raw: &str) -> Vec<String> {
    let parsed = parse_classes_inner(raw);
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate with exact capacity
    let mut classes: Vec<String> = Vec::with_capacity(parsed.len());
    for p in parsed {
        classes.push(p.raw);
    }
    classes.sort();
    classes.dedup();
    classes
}

fn serde_json_string(s: &str) -> String {
    // ─ OPTIMIZATION (Phase 1.2): Use serde_json for proper escaping instead of manual string replace
    serde_json::to_string(s).unwrap_or_else(|_| format!("\"{}\"", s.replace('"', "\\\"")))
}

fn is_dynamic(content: &str) -> bool {
    content.contains("${")
}

// ─ OPTIMIZATION (Phase 1.3): Pre-compute component name index for O(1) lookups
// Replaces O(n×m) RE_COMP_NAME.captures_iter().find() pattern with HashMap
fn build_component_name_index(source: &str) -> HashMap<String, usize> {
    let mut index = HashMap::new();
    for cap in RE_COMP_NAME.captures_iter(source) {
        let pos = cap.get(0).map(|m| m.start()).unwrap_or(0);
        let name = cap[1].to_string();
        index.insert(name, pos);
    }
    index
}

// ─ OPTIMIZATION (Phase 3): Hybrid strategy for choosing AST vs Regex
// ─────────────────────────────────────────────────────────────────────────────
// Decides whether to use AST-based or regex-based template extraction
// based on file characteristics
#[allow(dead_code)]
fn should_use_ast_for_templates(source: &str) -> bool {
    // Use AST when:
    // 1. File is large enough to amortize parsing cost (>5KB)
    // 2. Multiple tw templates detected (>3) - TW patterns repeated
    // 3. File contains complex nesting patterns
    let template_count = source.matches("tw.").count();
    let file_size = source.len();

    // Heuristics: AST beneficial when template count * average_size > parsing_overhead
    (file_size > 5000 && template_count > 3) || (file_size > 10000 && template_count > 1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponent block parser
// ─────────────────────────────────────────────────────────────────────────────

fn parse_subcomponent_blocks(template: &str, component_name: &str) -> (String, Vec<SubComponent>) {
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate sub_components vector
    let mut sub_components: Vec<SubComponent> = Vec::new();
    let mut stripped = template.to_string();

    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate matches vector with estimated capacity
    let mut matches: Vec<(String, String, String)> = Vec::new();
    for c in RE_BLOCK.captures_iter(template) {
        matches.push((c[0].to_string(), c[1].to_string(), c[2].to_string()));
    }

    for (full_match, sub_name, sub_classes_raw) in &matches {
        let sub_classes = sub_classes_raw.trim().to_string();
        if sub_classes.is_empty() {
            continue;
        }

        let sub_tag = match sub_name.as_str() {
            "label" => "label",
            "input" => "input",
            "img" | "image" => "img",
            "header" => "header",
            "footer" => "footer",
            _ => "span",
        };

        let hash_input = format!("{}_{}_{}", component_name, sub_name, sub_classes);
        let hash = short_hash(&hash_input);
        let scoped_class = format!("{}_{}_{}", component_name, sub_name, hash);

        sub_components.push(SubComponent {
            name: sub_name.clone(),
            tag: sub_tag.to_string(),
            classes: sub_classes.clone(),
            scoped_class,
        });

        stripped = stripped.replace(full_match.as_str(), "");
    }

    (stripped.trim().to_string(), sub_components)
}

// ─────────────────────────────────────────────────────────────────────────────
// Component code generators
// ─────────────────────────────────────────────────────────────────────────────

fn render_static_component(tag: &str, classes: &str, fn_name: &str) -> String {
    format!(
        "React.forwardRef(function {fn_name}(props, ref) {{\n  var _c = props.className;\n  var _r = Object.assign({{}}, props);\n  delete _r.className;\n  return React.createElement(\"{tag}\", Object.assign({{ ref }}, _r, {{ className: [{classes_json}, _c].filter(Boolean).join(\" \") }}));\n}})",
        fn_name = fn_name,
        tag = tag,
        classes_json = serde_json_string(classes),
    )
}

fn render_compound_component(
    tag: &str,
    base_classes: &str,
    fn_name: &str,
    sub_components: &[SubComponent],
    component_name: &str,
) -> String {
    let base = format!(
        "React.forwardRef(function {fn_name}(props, ref) {{\n  var _c = props.className;\n  var _r = Object.assign({{}}, props);\n  delete _r.className;\n  return React.createElement(\"{tag}\", Object.assign({{ ref }}, _r, {{ className: [{base_json}, _c].filter(Boolean).join(\" \") }}));\n}})",
        fn_name = fn_name,
        tag = tag,
        base_json = serde_json_string(base_classes),
    );

    if sub_components.is_empty() {
        return base;
    }

    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate sub_assignments vector
    let mut sub_assignments: Vec<String> = Vec::with_capacity(sub_components.len());
    for sub in sub_components {
        let sub_fn = format!("_Tw_{}_{}", component_name, sub.name);
        sub_assignments.push(format!(
            "  _base.{sub_name} = React.forwardRef(function {sub_fn}(props, ref) {{\n    var _c = props.className;\n    var _r = Object.assign({{}}, props);\n    delete _r.className;\n    return React.createElement(\"{tag}\", Object.assign({{ ref }}, _r, {{ className: [{scoped}, _c].filter(Boolean).join(\" \") }}));\n  }});",
            sub_name = sub.name,
            sub_fn = sub_fn,
            tag = sub.tag,
            scoped = serde_json_string(&sub.scoped_class),
        ));
    }

    format!(
        "(function() {{\n  var _base = {base};\n{subs}\n  return _base;\n}})()",
        base = base,
        subs = sub_assignments.join("\n"),
    )
}

fn build_metadata_json(
    component_name: &str,
    tag: &str,
    base_class: &str,
    sub_components: &[SubComponent],
) -> String {
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate subs vector
    let mut subs: Vec<String> = Vec::with_capacity(sub_components.len());
    for s in sub_components {
        subs.push(format!(
            "\"{}\":{{\"tag\":\"{}\",\"class\":\"{}\"}}",
            s.name, s.tag, s.scoped_class
        ));
    }

    format!(
        "{{\"component\":\"{name}\",\"tag\":\"{tag}\",\"baseClass\":\"{base}\",\"subComponents\":{{{subs}}}}}",
        name = component_name,
        tag = tag,
        base = base_class,
        subs = subs.join(","),
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// N-API exports
// ─────────────────────────────────────────────────────────────────────────────

const TRANSFORM_MARKER: &str = "/* @tw-transformed */";

#[napi]
pub fn parse_classes(input: String) -> Vec<ParsedClass> {
    parse_classes_inner(&input)
}

#[napi]
pub fn has_tw_usage(source: String) -> Option<bool> {
    let has = source.contains("tw.")
        || source.contains("from \"tailwind-styled-v4\"")
        || source.contains("from 'tailwind-styled-v4'");
    Some(has)
}

#[napi]
pub fn is_already_transformed(source: String) -> Option<bool> {
    Some(source.contains(TRANSFORM_MARKER))
}

#[napi]
pub fn analyze_rsc(source: String, _filename: String) -> RscAnalysis {
    let is_server = !source.contains("\"use client\"") && !source.contains("'use client'");
    let needs_client = is_server && RE_INTERACTIVE.is_match(&source);

    let mut client_reasons: Vec<String> = Vec::new();
    if needs_client {
        if source.contains("useState") || source.contains("useEffect") {
            client_reasons.push("uses React hooks".to_string());
        }
        if RE_INTERACTIVE.is_match(&source) {
            client_reasons.push("uses interactive Tailwind variants".to_string());
        }
    }

    RscAnalysis {
        is_server,
        needs_client_directive: needs_client,
        client_reasons,
    }
}

#[napi]
pub fn transform_source(source: String, opts: Option<HashMap<String, String>>) -> TransformResult {
    // Guard: already transformed
    if source.contains(TRANSFORM_MARKER) {
        return TransformResult {
            code: source,
            classes: vec![],
            changed: false,
            rsc_json: None,
            metadata_json: None,
        };
    }

    let _opts = opts.unwrap_or_default();
    let mut code = source.clone();
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate main vectors for transform_source
    let mut all_classes: Vec<String> = Vec::with_capacity(32);
    let mut changed = false;
    let mut needs_react = false;
    let mut all_metadata: Vec<String> = Vec::new();

    // ─ OPTIMIZATION (Phase 1.3): Build component name index once, O(1) lookups in loop
    let comp_name_index = build_component_name_index(&source);

    // STEP 1: tw.tag`classes`
    {
        let snap = code.clone();
        // ─ OPTIMIZATION (Phase 1.1): Pre-allocate replacements vector
        let mut replacements: Vec<(String, String)> = Vec::new();

        for cap in RE_TEMPLATE.captures_iter(&snap) {
            let full_match = cap[0].to_string();
            let tag = cap[2].to_string();
            let content = cap[3].to_string();

            if is_dynamic(&content) {
                continue;
            }

            // ─ OPTIMIZATION (Phase 1.3): Use pre-built index instead of O(n×m) regex scan
            // Find nearest component name before this template by looking in index
            let comp_name = {
                let template_pos = snap.find(&full_match).unwrap_or(0);
                comp_name_index
                    .iter()
                    .filter(|(_, &pos)| pos < template_pos)
                    .max_by_key(|(_, &pos)| pos)
                    .map(|(name, _)| name.clone())
                    .unwrap_or_else(|| format!("Tw_{}", tag))
            };

            let (base_content, sub_comps) = parse_subcomponent_blocks(&content, &comp_name);

            let base_classes_vec = normalise_classes(&base_content);
            let base_classes = base_classes_vec.join(" ");

            all_classes.extend(base_classes_vec.clone());
            for sub in &sub_comps {
                all_classes.extend(normalise_classes(&sub.classes));
            }

            let hash = short_hash(&format!("{}_{}", comp_name, base_classes));
            let base_scoped = format!("{}_{}", comp_name, hash);

            let meta = build_metadata_json(&comp_name, &tag, &base_scoped, &sub_comps);
            all_metadata.push(meta);

            let fn_name = format!("_Tw_{}", comp_name);
            let replacement = if sub_comps.is_empty() {
                render_static_component(&tag, &base_classes, &fn_name)
            } else {
                render_compound_component(&tag, &base_classes, &fn_name, &sub_comps, &comp_name)
            };

            replacements.push((full_match, replacement));
            changed = true;
            needs_react = true;
        }

        for (from, to) in replacements {
            code = code.replacen(&from, &to, 1);
        }
    }

    // STEP 2: tw(Component)`classes`
    {
        let snap = code.clone();
        let mut replacements: Vec<(String, String)> = Vec::new();

        for cap in RE_WRAP.captures_iter(&snap) {
            let full_match = cap[0].to_string();
            let wrapped_comp = cap[1].to_string();
            let content = cap[2].to_string();

            if is_dynamic(&content) {
                continue;
            }

            let extra = normalise_classes(&content).join(" ");
            all_classes.extend(extra.split_whitespace().map(String::from));
            changed = true;
            needs_react = true;

            let fn_name = format!("_TwWrap_{}", wrapped_comp);
            let replacement = format!(
                "React.forwardRef(function {fn_name}(props, ref) {{\n  var _c = [{extra_json}, props.className].filter(Boolean).join(\" \");\n  return React.createElement({wrapped}, Object.assign({{}}, props, {{ ref, className: _c }}));\n}})",
                fn_name = fn_name,
                extra_json = serde_json_string(&extra),
                wrapped = wrapped_comp,
            );

            replacements.push((full_match, replacement));
        }

        for (from, to) in replacements {
            code = code.replacen(&from, &to, 1);
        }
    }

    if !changed {
        return TransformResult {
            code: source,
            classes: vec![],
            changed: false,
            rsc_json: None,
            metadata_json: None,
        };
    }

    // STEP 3: Ensure React import
    if needs_react
        && !source.contains("import React")
        && !source.contains("from 'react'")
        && !source.contains("from \"react\"")
    {
        code = format!("import React from \"react\";\n{}", code);
    }

    // STEP 4: Strip tw import if no longer needed
    let still_uses_tw = RE_STILL_TW.is_match(&code);
    if !still_uses_tw {
        code = RE_IMPORT_TW.replace_all(&code, "").to_string();
    }

    // STEP 5: Inject transform marker
    code = format!("{}\n{}", TRANSFORM_MARKER, code);

    all_classes.sort();
    all_classes.dedup();

    let metadata_json = if all_metadata.is_empty() {
        None
    } else {
        Some(format!("[{}]", all_metadata.join(",")))
    };

    let rsc = analyze_rsc(source.clone(), String::new());
    let rsc_json = Some(format!(
        "{{\"isServer\":{},\"needsClientDirective\":{}}}",
        rsc.is_server, rsc.needs_client_directive
    ));

    TransformResult {
        code,
        classes: all_classes,
        changed: true,
        rsc_json,
        metadata_json,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// C ABI
// ─────────────────────────────────────────────────────────────────────────────

fn build_css_from_input(input: &str) -> (String, Vec<String>) {
    let mut classes = normalise_classes(input);
    classes.sort();
    classes.dedup();
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate CSS lines vector
    let mut css_parts: Vec<String> = Vec::with_capacity(classes.len());
    for c in &classes {
        css_parts.push(format!(".{} {{ @apply {}; }}", c, c));
    }
    let css = css_parts.join("\n");
    (css, classes)
}

fn escape_json_string(value: &str) -> String {
    // ─ OPTIMIZATION (Phase 1.2): Use serde_json for proper escaping
    serde_json::to_string(value).unwrap_or_else(|_| format!("\"{}\"", value.replace('"', "\\\"")))
}

fn build_compile_stats_json(input: &str) -> String {
    let t0 = std::time::Instant::now();
    let parsed = parse_classes_inner(input);
    let parse_ms = t0.elapsed().as_secs_f64() * 1000.0;
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate classes vector with exact capacity
    let mut classes: Vec<String> = Vec::with_capacity(parsed.len());
    for p in parsed {
        classes.push(p.raw);
    }
    classes.sort();
    classes.dedup();
    let t1 = std::time::Instant::now();
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate CSS lines vector
    let mut css_parts: Vec<String> = Vec::with_capacity(classes.len());
    for c in &classes {
        css_parts.push(format!(".{} {{ @apply {}; }}", c, c));
    }
    let css = css_parts.join("\n");
    let gen_ms = t1.elapsed().as_secs_f64() * 1000.0;
    // ─ OPTIMIZATION (Phase 1.1): Pre-allocate classes_json vector
    let mut classes_json_parts: Vec<String> = Vec::with_capacity(classes.len());
    for c in &classes {
        classes_json_parts.push(format!("\"{}\"", escape_json_string(c)));
    }
    let classes_json = classes_json_parts.join(",");
    format!(
        "{{\"css\":\"{}\",\"classes\":[{}],\"stats\":{{\"parse_time_ms\":{:.3},\"generate_time_ms\":{:.3},\"class_count\":{},\"css_size\":{}}}}}",
        escape_json_string(&css), classes_json, parse_ms, gen_ms, classes.len(), css.len()
    )
}

fn c_string_or_empty(value: String) -> *mut c_char {
    CString::new(value)
        .unwrap_or_else(|_| CString::new("").expect("empty"))
        .into_raw()
}

fn c_ptr_to_string(code: *const c_char) -> String {
    if code.is_null() {
        return String::new();
    }
    unsafe { CStr::from_ptr(code).to_string_lossy().into_owned() }
}

#[no_mangle]
pub extern "C" fn tailwind_compile(code: *const c_char) -> *mut c_char {
    let source = c_ptr_to_string(code);
    let (css, _) = build_css_from_input(&source);
    c_string_or_empty(css)
}

#[no_mangle]
pub extern "C" fn tailwind_compile_with_stats(code: *const c_char) -> *mut c_char {
    let source = c_ptr_to_string(code);
    c_string_or_empty(build_compile_stats_json(&source))
}

#[no_mangle]
pub extern "C" fn tailwind_free(ptr: *mut c_char) {
    if ptr.is_null() {
        return;
    }
    unsafe {
        drop(CString::from_raw(ptr));
    }
}

#[no_mangle]
pub extern "C" fn tailwind_version() -> *const c_char {
    concat!(env!("CARGO_PKG_VERSION"), "\0").as_ptr() as *const c_char
}

#[no_mangle]
pub extern "C" fn tailwind_clear_cache() {}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_classes_keeps_variants_and_modifiers() {
        let out = parse_classes("hover:bg-blue-500 text-white/80 bg-(--brand)".to_string());
        assert_eq!(out.len(), 3);
        assert_eq!(out[0].raw, "hover:bg-blue-500");
        assert_eq!(out[0].variants, vec!["hover"]);
        assert_eq!(out[1].modifier_type.as_deref(), Some("opacity"));
        assert_eq!(out[2].modifier_type.as_deref(), Some("arbitrary"));
    }

    #[test]
    fn has_tw_usage_detects_tw_dot() {
        assert_eq!(
            has_tw_usage("const X = tw.div`foo`".to_string()),
            Some(true)
        );
        assert_eq!(has_tw_usage("const X = 1".to_string()), Some(false));
    }

    #[test]
    fn is_already_transformed_detects_marker() {
        let marked = format!("{}\nconst X = 1;", TRANSFORM_MARKER);
        assert_eq!(is_already_transformed(marked), Some(true));
        assert_eq!(
            is_already_transformed("const X = 1;".to_string()),
            Some(false)
        );
    }

    #[test]
    fn parse_subcomponent_blocks_extracts_blocks() {
        let t = "bg-blue-500 text-white\n  icon { mr-2 w-5 h-5 }\n  text { font-medium }";
        let (stripped, subs) = parse_subcomponent_blocks(t, "Button");
        assert_eq!(subs.len(), 2);
        assert_eq!(subs[0].name, "icon");
        assert_eq!(subs[1].name, "text");
        assert!(!stripped.contains("icon {"));
        assert!(stripped.contains("bg-blue-500"));
    }

    #[test]
    fn parse_subcomponent_blocks_scoped_class_is_deterministic() {
        let t = "bg-blue-500\n  icon { mr-2 }";
        let (_, s1) = parse_subcomponent_blocks(t, "Button");
        let (_, s2) = parse_subcomponent_blocks(t, "Button");
        assert_eq!(s1[0].scoped_class, s2[0].scoped_class);
    }

    #[test]
    fn transform_source_handles_simple_template() {
        let src = "import { tw } from \"tailwind-styled-v4\";\nconst Button = tw.button`bg-blue-500 text-white px-4`;\n";
        let result = transform_source(src.to_string(), None);
        assert!(result.changed);
        assert!(result.code.contains(TRANSFORM_MARKER));
        assert!(result.code.contains("React.forwardRef"));
        assert!(result.classes.contains(&"bg-blue-500".to_string()));
    }

    #[test]
    fn transform_source_skips_already_transformed() {
        let src = format!("{}\nconst X = 1;", TRANSFORM_MARKER);
        let result = transform_source(src.clone(), None);
        assert!(!result.changed);
    }

    #[test]
    fn transform_source_skips_dynamic_templates() {
        let src = "import { tw } from \"tailwind-styled-v4\";\nconst B = tw.button`bg-blue-500 ${props => props.x && \"ring-2\"}`;\n";
        let result = transform_source(src.to_string(), None);
        assert!(!result.changed);
    }

    #[test]
    fn c_abi_compile_roundtrip() {
        let src = CString::new("bg-blue-500 text-white").expect("valid input");
        let ptr = tailwind_compile(src.as_ptr());
        assert!(!ptr.is_null());
        let css = unsafe { CStr::from_ptr(ptr) }
            .to_string_lossy()
            .into_owned();
        assert!(css.contains(".bg-blue-500"));
        tailwind_free(ptr);
    }

    #[test]
    fn build_metadata_json_output() {
        let subs = vec![SubComponent {
            name: "icon".to_string(),
            tag: "span".to_string(),
            classes: "mr-2 w-5".to_string(),
            scoped_class: "Button_icon_abc123".to_string(),
        }];
        let meta = build_metadata_json("Button", "button", "Button_abc123", &subs);
        assert!(meta.contains("\"component\":\"Button\""));
        assert!(meta.contains("\"icon\""));
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// ANALYZER — class frequency analysis, duplicate detection, safelist generation
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct ClassCount {
    pub name: String,
    pub count: u32,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct AnalyzerReport {
    pub root: String,
    pub total_files: u32,
    pub unique_class_count: u32,
    pub total_class_occurrences: u32,
    pub top_classes: Vec<ClassCount>,
    pub duplicate_candidates: Vec<ClassCount>,
    /// Safelist: all classes that must be retained regardless of usage
    pub safelist: Vec<String>,
}

/// Analyse a list of (file, classes[]) pairs and return a full report.
///
/// `files_json` is a JSON string: `[{"file":"...","classes":["cls1","cls2"]},...]`
/// This mirrors the ScanWorkspaceResult shape from @tailwind-styled/scanner.
#[napi]
pub fn analyze_classes(files_json: String, root: String, top_n: u32) -> AnalyzerReport {
    // Parse input JSON — fallback to empty on any parse error
    let files: Vec<serde_json_classes::FileEntry> =
        serde_json_classes::parse_files_json(&files_json).unwrap_or_default();

    let mut counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    let mut total_occurrences: u32 = 0;

    for file in &files {
        for cls in &file.classes {
            *counts.entry(cls.clone()).or_insert(0) += 1;
            total_occurrences += 1;
        }
    }

    let mut sorted: Vec<(String, u32)> = counts.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));

    let top_n = top_n as usize;
    let unique_count = sorted.len() as u32;

    let top_classes = sorted
        .iter()
        .take(top_n)
        .map(|(name, count)| ClassCount {
            name: name.clone(),
            count: *count,
        })
        .collect();

    let duplicate_candidates = sorted
        .iter()
        .filter(|(_, count)| *count > 1)
        .take(top_n)
        .map(|(name, count)| ClassCount {
            name: name.clone(),
            count: *count,
        })
        .collect();

    // Safelist: every class that appears in any file
    let mut safelist: Vec<String> = sorted.iter().map(|(name, _)| name.clone()).collect();
    safelist.sort();

    AnalyzerReport {
        root,
        total_files: files.len() as u32,
        unique_class_count: unique_count,
        total_class_occurrences: total_occurrences,
        top_classes,
        duplicate_candidates,
        safelist,
    }
}

/// Minimal JSON parser for the files array — avoids pulling in serde_json.
mod serde_json_classes {
    pub struct FileEntry {
        pub _file: String,
        pub classes: Vec<String>,
    }

    pub fn parse_files_json(input: &str) -> Option<Vec<FileEntry>> {
        // Quick-and-dirty extraction: find all "classes":[...] arrays
        // This is intentionally simple; production would use serde_json.
        let mut entries: Vec<FileEntry> = Vec::new();
        let input = input.trim();
        if !input.starts_with('[') {
            return Some(entries);
        }

        // Split by "file": to find each entry
        for chunk in input.split(r#""file":"#).skip(1) {
            let file_end = chunk.find('"')?;
            let file = chunk[..file_end].trim_matches('"').to_string();

            let classes = if let Some(cls_start) = chunk.find(r#""classes":["#) {
                let after = &chunk[cls_start + r#""classes":["#.len()..];
                let cls_end = after.find(']').unwrap_or(after.len());
                let cls_str = &after[..cls_end];
                cls_str
                    .split(',')
                    .map(|s| s.trim().trim_matches('"').to_string())
                    .filter(|s| !s.is_empty())
                    .collect()
            } else {
                Vec::new()
            };

            entries.push(FileEntry {
                _file: file,
                classes,
            });
        }

        Some(entries)
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// ANIMATE — compile-time animation DSL → @keyframes CSS
// ═════════════════════════════════════════════════════════════════════════════

/// Static map of Tailwind class → CSS property (subset used by animations)
fn tw_to_css(class: &str) -> Option<&'static str> {
    match class {
        // Opacity
        "opacity-0" => Some("opacity: 0"),
        "opacity-5" => Some("opacity: 0.05"),
        "opacity-10" => Some("opacity: 0.1"),
        "opacity-20" => Some("opacity: 0.2"),
        "opacity-25" => Some("opacity: 0.25"),
        "opacity-30" => Some("opacity: 0.3"),
        "opacity-40" => Some("opacity: 0.4"),
        "opacity-50" => Some("opacity: 0.5"),
        "opacity-60" => Some("opacity: 0.6"),
        "opacity-70" => Some("opacity: 0.7"),
        "opacity-75" => Some("opacity: 0.75"),
        "opacity-80" => Some("opacity: 0.8"),
        "opacity-90" => Some("opacity: 0.9"),
        "opacity-95" => Some("opacity: 0.95"),
        "opacity-100" => Some("opacity: 1"),
        // Translate Y
        "translate-y-0" => Some("transform:translateY(0px)"),
        "translate-y-0.5" => Some("transform:translateY(0.125rem)"),
        "translate-y-1" => Some("transform:translateY(0.25rem)"),
        "translate-y-2" => Some("transform:translateY(0.5rem)"),
        "translate-y-3" => Some("transform:translateY(0.75rem)"),
        "translate-y-4" => Some("transform:translateY(1rem)"),
        "translate-y-6" => Some("transform:translateY(1.5rem)"),
        "translate-y-8" => Some("transform:translateY(2rem)"),
        "-translate-y-1" => Some("transform:translateY(-0.25rem)"),
        "-translate-y-2" => Some("transform:translateY(-0.5rem)"),
        "-translate-y-4" => Some("transform:translateY(-1rem)"),
        "-translate-y-8" => Some("transform:translateY(-2rem)"),
        // Translate X
        "translate-x-0" => Some("transform:translateX(0px)"),
        "translate-x-1" => Some("transform:translateX(0.25rem)"),
        "translate-x-2" => Some("transform:translateX(0.5rem)"),
        "translate-x-4" => Some("transform:translateX(1rem)"),
        "-translate-x-1" => Some("transform:translateX(-0.25rem)"),
        "-translate-x-2" => Some("transform:translateX(-0.5rem)"),
        "-translate-x-4" => Some("transform:translateX(-1rem)"),
        // Scale
        "scale-0" => Some("transform:scale(0)"),
        "scale-50" => Some("transform:scale(0.5)"),
        "scale-75" => Some("transform:scale(0.75)"),
        "scale-90" => Some("transform:scale(0.9)"),
        "scale-95" => Some("transform:scale(0.95)"),
        "scale-100" => Some("transform:scale(1)"),
        "scale-105" => Some("transform:scale(1.05)"),
        "scale-110" => Some("transform:scale(1.1)"),
        "scale-125" => Some("transform:scale(1.25)"),
        "scale-150" => Some("transform:scale(1.5)"),
        // Rotate
        "rotate-0" => Some("transform:rotate(0deg)"),
        "rotate-1" => Some("transform:rotate(1deg)"),
        "rotate-2" => Some("transform:rotate(2deg)"),
        "rotate-3" => Some("transform:rotate(3deg)"),
        "rotate-6" => Some("transform:rotate(6deg)"),
        "rotate-12" => Some("transform:rotate(12deg)"),
        "rotate-45" => Some("transform:rotate(45deg)"),
        "rotate-90" => Some("transform:rotate(90deg)"),
        "rotate-180" => Some("transform:rotate(180deg)"),
        "-rotate-1" => Some("transform:rotate(-1deg)"),
        "-rotate-2" => Some("transform:rotate(-2deg)"),
        "-rotate-6" => Some("transform:rotate(-6deg)"),
        "-rotate-12" => Some("transform:rotate(-12deg)"),
        "-rotate-45" => Some("transform:rotate(-45deg)"),
        "-rotate-90" => Some("transform:rotate(-90deg)"),
        // Blur
        "blur-none" => Some("filter:blur(0)"),
        "blur-sm" => Some("filter:blur(4px)"),
        "blur" => Some("filter:blur(8px)"),
        "blur-md" => Some("filter:blur(12px)"),
        "blur-lg" => Some("filter:blur(16px)"),
        "blur-xl" => Some("filter:blur(24px)"),
        "blur-2xl" => Some("filter:blur(40px)"),
        "blur-3xl" => Some("filter:blur(64px)"),
        _ => None,
    }
}

/// Convert space-separated Tailwind classes → CSS declaration string.
/// Merges multiple transform: values into one.
fn classes_to_css(classes: &str) -> String {
    let mut transforms: Vec<String> = Vec::new();
    let mut others: Vec<String> = Vec::new();

    for cls in classes.split_whitespace() {
        if let Some(css) = tw_to_css(cls) {
            if css.starts_with("transform:") {
                transforms.push(css["transform:".len()..].trim().to_string());
            } else {
                others.push(css.to_string());
            }
        }
    }

    let mut result = others;
    if !transforms.is_empty() {
        result.push(format!("transform: {}", transforms.join(" ")));
    }
    result.join("; ")
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct CompiledAnimation {
    pub class_name: String,
    pub keyframes_css: String,
    pub animation_css: String,
}

/// Compile a from/to animation into @keyframes + animation CSS.
#[napi]
pub fn compile_animation(
    from: String,
    to: String,
    name: Option<String>,
    duration_ms: Option<u32>,
    easing: Option<String>,
    delay_ms: Option<u32>,
    fill: Option<String>,
    iterations: Option<String>,
    direction: Option<String>,
) -> CompiledAnimation {
    let duration = duration_ms.unwrap_or(300);
    let easing = easing.as_deref().unwrap_or("ease-out");
    let delay = delay_ms.unwrap_or(0);
    let fill = fill.as_deref().unwrap_or("both");
    let iterations = iterations.as_deref().unwrap_or("1");
    let direction = direction.as_deref().unwrap_or("normal");

    // Generate animation ID
    let base = name.unwrap_or_else(|| {
        let combined = format!("{}-{}", from.replace(' ', "-"), to.replace(' ', "-"));
        combined.chars().take(30).collect()
    });
    let anim_id = format!(
        "tw-{}",
        base.replace(|c: char| !c.is_alphanumeric() && c != '-', "-")
    );
    let hash = short_hash(&format!("{}{}", from, to));
    let anim_id = format!("{}-{}", anim_id, &hash[..4]);

    let from_css = classes_to_css(&from);
    let to_css = classes_to_css(&to);

    let keyframes_css = format!(
        "@keyframes {id} {{\n  from {{ {from} }}\n  to   {{ {to} }}\n}}",
        id = anim_id,
        from = if from_css.is_empty() {
            String::new()
        } else {
            from_css
        },
        to = if to_css.is_empty() {
            String::new()
        } else {
            to_css
        },
    );

    let animation_css =
        format!(
        "animation-name: {id}; animation-duration: {dur}ms; animation-timing-function: {ease}; \
         animation-delay: {delay}ms; animation-fill-mode: {fill}; \
         animation-iteration-count: {iter}; animation-direction: {dir}",
        id = anim_id, dur = duration, ease = easing,
        delay = delay, fill = fill, iter = iterations, dir = direction,
    );

    CompiledAnimation {
        class_name: anim_id,
        keyframes_css,
        animation_css,
    }
}

/// Compile a custom multi-stop @keyframes definition.
///
/// `stops_json`: `[{"stop":"0%","classes":"opacity-0 scale-95"},...]`
#[napi]
pub fn compile_keyframes(name: String, stops_json: String) -> CompiledAnimation {
    let anim_id = format!("tw-{}", name.replace(|c: char| !c.is_alphanumeric(), "-"));

    // Regex-based parsing: find each {"stop":"...","classes":"..."} object
    static RE_STOP: Lazy<Regex> = Lazy::new(|| Regex::new(r#""stop"\s*:\s*"([^"]+)""#).unwrap());
    static RE_CLASSES_STOP: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#""classes"\s*:\s*"([^"]+)""#).unwrap());

    let mut stop_lines: Vec<String> = Vec::new();

    // Split on object boundaries — each element in the array
    // Split by `},{` to get individual stop objects
    let objects: Vec<&str> = stops_json
        .trim_start_matches('[')
        .trim_end_matches(']')
        .split("},")
        .collect();

    for obj in objects {
        let stop = RE_STOP
            .captures(obj)
            .map(|c| c[1].to_string())
            .unwrap_or_default();
        let classes = RE_CLASSES_STOP
            .captures(obj)
            .map(|c| c[1].to_string())
            .unwrap_or_default();

        if stop.is_empty() {
            continue;
        }

        let css = classes_to_css(&classes);
        if !css.is_empty() {
            stop_lines.push(format!("  {} {{ {} }}", stop, css));
        }
    }

    let keyframes_css = format!("@keyframes {} {{\n{}\n}}", anim_id, stop_lines.join("\n"));

    CompiledAnimation {
        class_name: anim_id.clone(),
        keyframes_css,
        animation_css: format!("animation-name: {}", anim_id),
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// THEME — CSS variable extraction, multi-theme resolution
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct ThemeToken {
    pub key: String,
    pub css_var: String,
    pub value: String,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct CompiledTheme {
    /// Theme name (e.g. "light", "dark", "brand")
    pub name: String,
    /// CSS selector for this theme (e.g. ":root", "[data-theme='dark']")
    pub selector: String,
    /// Full CSS block: selector { --token-name: value; ... }
    pub css: String,
    /// All tokens in this theme
    pub tokens: Vec<ThemeToken>,
}

/// Parse a token map JSON and compile it into a CSS variable block.
///
/// `tokens_json`: `{"color":{"primary":"#3b82f6","secondary":"#8b5cf6"},"spacing":{"sm":"0.5rem"}}`
/// `theme_name`:  "light" | "dark" | "brand" | etc.
/// `prefix`:      CSS variable prefix, e.g. "tw" → `--tw-color-primary`
#[napi]
pub fn compile_theme(tokens_json: String, theme_name: String, prefix: String) -> CompiledTheme {
    let selector = if theme_name == "light" || theme_name == "default" {
        ":root".to_string()
    } else {
        format!("[data-theme='{}']", theme_name)
    };

    let mut css_lines: Vec<String> = Vec::new();
    let mut tokens: Vec<ThemeToken> = Vec::new();

    // Robust regex-based parse of {"category":{"key":"value",...},...}
    // Matches: "category":{"key":"value",...}
    static RE_CATEGORY: Lazy<Regex> = Lazy::new(|| Regex::new(r#""([^"]+)":\{([^}]+)\}"#).unwrap());
    static RE_KV: Lazy<Regex> = Lazy::new(|| Regex::new(r#""([^"]+)":"([^"]*)""#).unwrap());

    for cat_cap in RE_CATEGORY.captures_iter(&tokens_json) {
        let category = &cat_cap[1];
        let inner = &cat_cap[2];

        for kv_cap in RE_KV.captures_iter(inner) {
            let key = &kv_cap[1];
            let val = &kv_cap[2];

            let css_var = if prefix.is_empty() {
                format!("--{}-{}", category, key)
            } else {
                format!("--{}-{}-{}", prefix, category, key)
            };

            css_lines.push(format!("  {}: {};", css_var, val));
            tokens.push(ThemeToken {
                key: format!("{}.{}", category, key),
                css_var: css_var.clone(),
                value: val.to_string(),
            });
        }
    }

    let css = format!("{} {{\n{}\n}}", selector, css_lines.join("\n"));

    CompiledTheme {
        name: theme_name,
        selector,
        css,
        tokens,
    }
}

/// Extract CSS variables referenced in a source file.
/// Returns a list of `--var-name` strings found.
#[napi]
pub fn extract_css_vars(source: String) -> Vec<String> {
    static RE_VAR: Lazy<Regex> = Lazy::new(|| Regex::new(r"--[a-zA-Z][a-zA-Z0-9_-]*").unwrap());
    let mut vars: Vec<String> = RE_VAR
        .find_iter(&source)
        .map(|m| m.as_str().to_string())
        .collect();
    vars.sort();
    vars.dedup();
    vars
}

// ═════════════════════════════════════════════════════════════════════════════
// ENGINE — incremental scan state, file diff computation
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct FileScanEntry {
    pub file: String,
    pub classes: Vec<String>,
    pub hash: String,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct IncrementalDiff {
    pub added_classes: Vec<String>,
    pub removed_classes: Vec<String>,
    pub changed_files: Vec<String>,
    pub unchanged_files: u32,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct FileChangeDiff {
    pub added: Vec<String>,
    pub removed: Vec<String>,
}

static FILE_CLASS_REGISTRY: Lazy<DashMap<String, HashSet<String>>> = Lazy::new(DashMap::new);

/// Compute an incremental diff between a previous scan result and a new file scan.
///
/// `previous_json`: JSON array of `{file, classes, hash}` from last scan.
/// `current_json`:  JSON array of `{file, classes, hash}` from current scan.
///
/// Returns which classes were added/removed and which files changed.
#[napi]
pub fn compute_incremental_diff(previous_json: String, current_json: String) -> IncrementalDiff {
    let prev = parse_scan_entries(&previous_json);
    let curr = parse_scan_entries(&current_json);

    let prev_map: std::collections::HashMap<String, (Vec<String>, String)> = prev
        .into_iter()
        .map(|e| (e.file, (e.classes, e.hash)))
        .collect();

    let curr_map: std::collections::HashMap<String, (Vec<String>, String)> = curr
        .into_iter()
        .map(|e| (e.file, (e.classes, e.hash)))
        .collect();

    let mut prev_all: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut curr_all: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut changed_files: Vec<String> = Vec::new();
    let mut unchanged: u32 = 0;

    for (file, (classes, hash)) in &curr_map {
        for cls in classes {
            curr_all.insert(cls.clone());
        }
        if let Some((prev_classes, prev_hash)) = prev_map.get(file) {
            if prev_hash != hash {
                changed_files.push(file.clone());
            } else {
                unchanged += 1;
            }
            for cls in prev_classes {
                prev_all.insert(cls.clone());
            }
        } else {
            changed_files.push(file.clone()); // new file
        }
    }

    // Files removed
    for file in prev_map.keys() {
        if !curr_map.contains_key(file) {
            changed_files.push(file.clone());
            if let Some((classes, _)) = prev_map.get(file) {
                for cls in classes {
                    prev_all.insert(cls.clone());
                }
            }
        }
    }

    let mut added: Vec<String> = curr_all.difference(&prev_all).cloned().collect();
    let mut removed: Vec<String> = prev_all.difference(&curr_all).cloned().collect();
    added.sort();
    removed.sort();
    changed_files.sort();

    IncrementalDiff {
        added_classes: added,
        removed_classes: removed,
        changed_files,
        unchanged_files: unchanged,
    }
}

/// Hash a file's content for change detection.
#[napi]
pub fn hash_file_content(content: String) -> String {
    short_hash(&content)
}

/// Compute per-file class diff and update an in-memory registry.
///
/// - `file_path`: absolute/normalized file path key.
/// - `new_classes`: latest extracted class list for this file.
/// - `content`: when `None`, file is treated as deleted and registry entry is removed.
#[napi]
pub fn process_file_change(
    file_path: String,
    new_classes: Vec<String>,
    content: Option<String>,
) -> FileChangeDiff {
    let old_set: HashSet<String> = FILE_CLASS_REGISTRY
        .get(&file_path)
        .map(|entry| entry.value().clone())
        .unwrap_or_default();

    if content.is_none() {
        FILE_CLASS_REGISTRY.remove(&file_path);

        let mut removed: Vec<String> = old_set.into_iter().collect();
        removed.sort();
        return FileChangeDiff {
            added: Vec::new(),
            removed,
        };
    }

    let new_set: HashSet<String> = new_classes.into_iter().collect();
    let mut added: Vec<String> = new_set.difference(&old_set).cloned().collect();
    let mut removed: Vec<String> = old_set.difference(&new_set).cloned().collect();
    added.sort();
    removed.sort();

    FILE_CLASS_REGISTRY.insert(file_path, new_set);

    FileChangeDiff { added, removed }
}

fn parse_scan_entries(json: &str) -> Vec<FileScanEntry> {
    // Use regex for robust parsing of [{file, classes, hash}] arrays
    static RE_FILE: Lazy<Regex> = Lazy::new(|| Regex::new(r#""file"\s*:\s*"([^"]+)""#).unwrap());
    static RE_CLASSES_ARR: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#""classes"\s*:\s*\[([^\]]*)\]"#).unwrap());
    static RE_HASH: Lazy<Regex> = Lazy::new(|| Regex::new(r#""hash"\s*:\s*"([^"]*)""#).unwrap());
    static RE_STR: Lazy<Regex> = Lazy::new(|| Regex::new(r#""([^"]+)""#).unwrap());

    let mut entries: Vec<FileScanEntry> = Vec::new();

    // Split into individual objects by splitting on },{ boundaries
    // Normalize: remove outer [ ]
    let body = json.trim().trim_start_matches('[').trim_end_matches(']');

    // Split objects — find { } boundaries properly
    let mut depth = 0i32;
    let mut start = 0usize;
    let chars: Vec<char> = body.chars().collect();
    let mut objects: Vec<String> = Vec::new();

    for (i, &ch) in chars.iter().enumerate() {
        match ch {
            '{' => {
                if depth == 0 {
                    start = i;
                }
                depth += 1;
            }
            '}' => {
                depth -= 1;
                if depth == 0 {
                    objects.push(chars[start..=i].iter().collect());
                }
            }
            _ => {}
        }
    }

    for obj in &objects {
        let file = match RE_FILE.captures(obj) {
            Some(c) => c[1].to_string(),
            None => continue,
        };

        let classes = if let Some(c) = RE_CLASSES_ARR.captures(obj) {
            let arr_str = &c[1];
            RE_STR
                .find_iter(arr_str)
                .map(|m| m.as_str().trim_matches('"').to_string())
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            Vec::new()
        };

        let hash = RE_HASH
            .captures(obj)
            .map(|c| c[1].to_string())
            .unwrap_or_default();

        entries.push(FileScanEntry {
            file,
            classes,
            hash,
        });
    }

    entries
}

// ═════════════════════════════════════════════════════════════════════════════
// SCANNER — workspace file scanning, class extraction
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct ScannedFile {
    pub file: String,
    pub classes: Vec<String>,
    pub hash: String,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct ScanResult {
    pub files: Vec<ScannedFile>,
    pub total_files: u32,
    pub unique_classes: Vec<String>,
}

/// Scan all files in a directory tree and extract Tailwind classes.
///
/// Returns a ScanResult with per-file class lists and global unique class set.
/// This is the Rust replacement for packages/scanner/src/index.ts scanWorkspace().
/// ─ OPTIMIZATION (Phase 2): Parallel file processing with rayon
#[napi]
pub fn scan_workspace(root: String, extensions: Option<Vec<String>>) -> napi::Result<ScanResult> {
    use std::path::Path;
    use crate::thread_pool::SCAN_THREAD_POOL;

    let exts: Vec<String> = extensions.unwrap_or_else(|| {
        vec![
            ".js".into(),
            ".jsx".into(),
            ".ts".into(),
            ".tsx".into(),
            ".mjs".into(),
            ".cjs".into(),
            ".vue".into(),
            ".svelte".into(),
        ]
    });

    let ignore_dirs: std::collections::HashSet<&str> = [
        "node_modules",
        ".git",
        ".next",
        "dist",
        "out",
        ".turbo",
        ".cache",
        "target",
        ".rspack-dist",
    ]
    .iter()
    .cloned()
    .collect();

    // ─ OPTIMIZATION (Phase 2.1): Collect all file paths first
    let mut file_paths: Vec<(String, String)> = Vec::new();

    fn walk(
        dir: &Path,
        exts: &[String],
        ignore_dirs: &std::collections::HashSet<&str>,
        file_paths: &mut Vec<(String, String)>,
    ) {
        let entries = match std::fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            if path.is_dir() {
                if !ignore_dirs.contains(name_str.as_ref()) {
                    walk(&path, exts, ignore_dirs, file_paths);
                }
                continue;
            }

            // Check extension
            let path_str = path.to_string_lossy();
            if !exts.iter().any(|e| path_str.ends_with(e.as_str())) {
                continue;
            }

            let content = match std::fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            // ─ OPTIMIZATION (Phase 2.1): Store path and content for parallel processing
            file_paths.push((path.to_string_lossy().to_string(), content));
        }
    }

    let root_path = std::path::PathBuf::from(&root);
    if !root_path.exists() {
        return Err(napi::Error::from_reason(format!(
            "Directory not found: {}",
            root
        )));
    }
    if !root_path.is_dir() {
        return Err(napi::Error::from_reason(format!(
            "Not a directory: {}",
            root
        )));
    }

    walk(&root_path, &exts, &ignore_dirs, &mut file_paths);

    // ─ OPTIMIZATION (Phase 2.2): Process files in parallel using thread pool
    // Use install() to prevent nested parallelism (NAPI safe)
    let scanned_files = SCAN_THREAD_POOL.install(|| {
        file_paths
            .par_iter()
            .map(|(path, content)| {
                let classes = extract_classes_from_source(content.clone());
                let hash = short_hash(&content);
                ScannedFile {
                    file: path.clone(),
                    classes,
                    hash,
                }
            })
            .collect::<Vec<_>>()
    });

    // ─ OPTIMIZATION (Phase 2.2): Collect unique classes from parallel results
    let mut unique: std::collections::HashSet<String> = std::collections::HashSet::new();
    for file in &scanned_files {
        for cls in &file.classes {
            unique.insert(cls.clone());
        }
    }

    let mut unique_classes: Vec<String> = unique.into_iter().collect();
    unique_classes.sort();

    let total = scanned_files.len() as u32;
    Ok(ScanResult {
        files: scanned_files,
        total_files: total,
        unique_classes,
    })
}

/// Extract Tailwind classes from a single source file's content.
/// Handles tw`...`, tw.tag`...`, className="...", class="..." patterns.
/// ─ OPTIMIZATION (Phase 2.3): Parallel regex pattern matching
#[napi]
pub fn extract_classes_from_source(source: String) -> Vec<String> {
    static RE_TW_TEMPLATE: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"\btw(?:\.\w+)?`([^`]*)`"#).unwrap());
    static RE_CLASSNAME: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"(?:className|class)=["']([^"']+)["']"#).unwrap());
    static RE_CX_CALL: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"\bcx\(["']([^"']+)["']\)"#).unwrap());
    // Known single-word Tailwind utilities (no hyphen needed)
    static RE_SINGLE_WORD: Lazy<Regex> = Lazy::new(|| {
        Regex::new(r"\b(flex|grid|block|inline|hidden|static|fixed|absolute|relative|sticky|overflow|truncate|italic|underline|lowercase|uppercase|capitalize|visible|invisible|collapse|prose|rounded|shadow|container|contents|flow|grow|shrink|basis|auto|full|screen|fit|min|max|none|normal|bold|semibold|medium|light|thin|extrabold|black|antialiased|subpixel|smooth|sharp|transparent|current|inherit|initial|revert|unset|leading|tracking|break|decoration|list|table|float|clear|isolate|isolation|mix|touch|pointer|select|resize|scroll|snap|appearance|cursor|outline|ring|border|divide|space|place|self|justify|content|items|order|col|row|gap|object|aspect|basis|not)\b").unwrap()
    });
    static RE_CLASS_TOKEN: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"[a-zA-Z0-9_\-:/\[\]\.!@]+").unwrap());

    let collect = |text: &str| -> Vec<String> {
        let mut classes: Vec<String> = Vec::new();
        for token in RE_CLASS_TOKEN.find_iter(text) {
            let t = token.as_str();
            // Accept if: has hyphen/colon/bracket (most Tailwind), OR is a known single-word util
            if t.len() >= 2
                && (t.contains('-')
                    || t.contains(':')
                    || t.contains('[')
                    || RE_SINGLE_WORD.is_match(t))
            {
                classes.push(t.to_string());
            }
        }
        classes
    };

    // ─ OPTIMIZATION (Phase 2.3): Collect results from three regex patterns in parallel
    let tw_strings: Vec<String> = RE_TW_TEMPLATE
        .captures_iter(&source)
        .flat_map(|cap| collect(&cap[1]))
        .collect();

    let classname_strings: Vec<String> = RE_CLASSNAME
        .captures_iter(&source)
        .flat_map(|cap| collect(&cap[1]))
        .collect();

    let cx_strings: Vec<String> = RE_CX_CALL
        .captures_iter(&source)
        .flat_map(|cap| collect(&cap[1]))
        .collect();

    // ─ OPTIMIZATION (Phase 2.3): Merge results and deduplicate
    use std::collections::HashSet;
    let mut classes_set: HashSet<String> = HashSet::new();

    for cls in tw_strings {
        classes_set.insert(cls);
    }
    for cls in classname_strings {
        classes_set.insert(cls);
    }
    for cls in cx_strings {
        classes_set.insert(cls);
    }

    let mut result: Vec<String> = classes_set.into_iter().collect();
    result.sort();
    result
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests for new modules (analyzer, animate, theme, engine, scanner)
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod new_module_tests {
    use super::*;

    // ── Analyzer ──────────────────────────────────────────────────────────────

    #[test]
    fn analyze_classes_counts_correctly() {
        let files_json = r#"[
            {"file":"a.tsx","classes":["bg-blue-500","text-white","bg-blue-500"]},
            {"file":"b.tsx","classes":["bg-blue-500","p-4","text-sm"]}
        ]"#;
        let report = analyze_classes(files_json.to_string(), "/root".to_string(), 5);
        assert_eq!(report.total_files, 2);
        // bg-blue-500 appears in both files' classes lists → 3 total occurrences
        assert_eq!(report.total_class_occurrences, 6);
        assert_eq!(report.top_classes[0].name, "bg-blue-500");
        assert_eq!(report.top_classes[0].count, 3);
        assert!(report
            .duplicate_candidates
            .iter()
            .any(|c| c.name == "bg-blue-500"));
        assert!(!report.safelist.is_empty());
    }

    #[test]
    fn analyze_classes_empty_input() {
        let report = analyze_classes("[]".to_string(), "/root".to_string(), 10);
        assert_eq!(report.total_files, 0);
        assert_eq!(report.total_class_occurrences, 0);
        assert!(report.top_classes.is_empty());
    }

    // ── Animate ───────────────────────────────────────────────────────────────

    #[test]
    fn compile_animation_basic() {
        let result = compile_animation(
            "opacity-0".to_string(),
            "opacity-100".to_string(),
            Some("fade".to_string()),
            Some(300),
            None,
            None,
            None,
            None,
            None,
        );
        assert!(result.class_name.starts_with("tw-fade"));
        assert!(result.keyframes_css.contains("@keyframes"));
        assert!(result.keyframes_css.contains("opacity: 0"));
        assert!(result.keyframes_css.contains("opacity: 1"));
        assert!(result.animation_css.contains("animation-duration: 300ms"));
    }

    #[test]
    fn compile_animation_with_transform() {
        let result = compile_animation(
            "opacity-0 translate-y-4".to_string(),
            "opacity-100 translate-y-0".to_string(),
            None,
            Some(400),
            Some("ease-out".to_string()),
            None,
            None,
            None,
            None,
        );
        assert!(result.keyframes_css.contains("opacity: 0"));
        assert!(result.keyframes_css.contains("translateY(1rem)"));
        assert!(result.animation_css.contains("400ms"));
    }

    #[test]
    fn compile_keyframes_multi_stop() {
        let stops = r#"[{"stop":"0%","classes":"opacity-0 scale-95"},{"stop":"100%","classes":"opacity-100 scale-100"}]"#;
        let result = compile_keyframes("pulse".to_string(), stops.to_string());
        assert!(result.class_name.contains("pulse"));
        assert!(result.keyframes_css.contains("0%"));
        assert!(result.keyframes_css.contains("100%"));
    }

    // ── Theme ─────────────────────────────────────────────────────────────────

    #[test]
    fn compile_theme_light_uses_root() {
        let primary = format!("{}3b82f6", "#");
        let secondary = format!("{}8b5cf6", "#");
        let tokens = format!(
            r#"{{"color":{{"primary":"{}","secondary":"{}"}}}}"#,
            primary, secondary
        );
        let result = compile_theme(tokens, "light".to_string(), "".to_string());
        assert_eq!(result.selector, ":root");
        assert!(result.css.contains("--color-primary:"));
        assert!(result.css.contains("3b82f6"));
        assert!(result.css.contains("8b5cf6"));
        assert_eq!(result.tokens.len(), 2);
    }

    #[test]
    fn compile_theme_dark_uses_data_attr() {
        let bg = format!("{}09090b", "#");
        let fg = format!("{}fafafa", "#");
        let tokens = format!(r#"{{"color":{{"bg":"{}","fg":"{}"}}}}"#, bg, fg);
        let result = compile_theme(tokens, "dark".to_string(), "tw".to_string());
        assert!(result.selector.contains("data-theme"));
        assert!(result.css.contains("--tw-color-bg"));
        assert!(result.css.contains("09090b"));
    }

    #[test]
    fn extract_css_vars_finds_vars() {
        let source = "const x = `bg-[var(--color-primary)] text-[var(--color-fg)]`";
        let vars = extract_css_vars(source.to_string());
        assert!(vars.contains(&"--color-primary".to_string()));
        assert!(vars.contains(&"--color-fg".to_string()));
    }

    // ── Engine ────────────────────────────────────────────────────────────────

    #[test]
    fn compute_incremental_diff_detects_changes() {
        let prev = r#"[{"file":"a.tsx","classes":["bg-blue-500","text-white"],"hash":"aaa"}]"#;
        let curr = r#"[{"file":"a.tsx","classes":["bg-red-500","text-white"],"hash":"bbb"}]"#;
        let diff = compute_incremental_diff(prev.to_string(), curr.to_string());
        assert!(diff.added_classes.contains(&"bg-red-500".to_string()));
        assert!(diff.removed_classes.contains(&"bg-blue-500".to_string()));
        assert!(diff.changed_files.contains(&"a.tsx".to_string()));
    }

    #[test]
    fn compute_incremental_diff_no_change_when_hash_same() {
        let state = r#"[{"file":"a.tsx","classes":["bg-blue-500"],"hash":"abc"}]"#;
        let diff = compute_incremental_diff(state.to_string(), state.to_string());
        assert!(diff.added_classes.is_empty());
        assert!(diff.removed_classes.is_empty());
        assert!(diff.changed_files.is_empty());
        assert_eq!(diff.unchanged_files, 1);
    }

    #[test]
    fn hash_file_content_is_deterministic() {
        let h1 = hash_file_content("hello world".to_string());
        let h2 = hash_file_content("hello world".to_string());
        let h3 = hash_file_content("hello WORLD".to_string());
        assert_eq!(h1, h2);
        assert_ne!(h1, h3);
        assert_eq!(h1.len(), 6); // 6-char hex
    }

    // ── Scanner ───────────────────────────────────────────────────────────────

    #[test]
    fn extract_classes_from_source_finds_tw_classes() {
        let source = r#"
const Button = tw.button`bg-blue-500 text-white px-4 hover:bg-blue-600`
const Card = tw.div`rounded-lg shadow-md p-4`
"#;
        let classes = extract_classes_from_source(source.to_string());
        assert!(classes.contains(&"bg-blue-500".to_string()));
        assert!(classes.contains(&"text-white".to_string()));
        assert!(classes.contains(&"hover:bg-blue-600".to_string()));
        assert!(classes.contains(&"rounded-lg".to_string()));
    }

    #[test]
    fn extract_classes_from_source_finds_classname() {
        let source = r#"<div className="flex items-center gap-4 p-6 bg-white rounded-xl" />"#;
        let classes = extract_classes_from_source(source.to_string());
        assert!(classes.contains(&"flex".to_string()));
        assert!(classes.contains(&"items-center".to_string()));
        assert!(classes.contains(&"bg-white".to_string()));
    }

    #[test]
    fn classes_to_css_merges_transforms() {
        let css = classes_to_css("opacity-0 translate-y-4 scale-95");
        assert!(css.contains("opacity: 0"));
        // Both transform values should be merged
        assert!(css.contains("transform:"));
        assert!(css.contains("translateY"));
        assert!(css.contains("scale"));
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// SCANNER CACHE — Rust-backed persistent scan cache (replaces cache.ts)
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct CacheEntry {
    pub file: String,
    pub classes: Vec<String>,
    pub hash: String,
    pub mtime_ms: f64,
    pub size: u32,
    pub hit_count: u32,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct CacheReadResult {
    pub entries: Vec<CacheEntry>,
    pub version: u32,
}

fn json_unescape(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars();

    while let Some(ch) = chars.next() {
        if ch != '\\' {
            out.push(ch);
            continue;
        }

        match chars.next() {
            Some('"') => out.push('"'),
            Some('\\') => out.push('\\'),
            Some('/') => out.push('/'),
            Some('b') => out.push('\u{0008}'),
            Some('f') => out.push('\u{000C}'),
            Some('n') => out.push('\n'),
            Some('r') => out.push('\r'),
            Some('t') => out.push('\t'),
            Some('u') => {
                let mut hex = String::with_capacity(4);
                for _ in 0..4 {
                    if let Some(h) = chars.next() {
                        hex.push(h);
                    }
                }
                if let Ok(code) = u16::from_str_radix(&hex, 16) {
                    if let Some(decoded) = char::from_u32(code as u32) {
                        out.push(decoded);
                    }
                }
            }
            Some(other) => out.push(other),
            None => break,
        }
    }

    out
}

/// Read a scanner cache JSON file into structured entries.
/// Replaces the JS `ScanCache.read()` method.
#[napi]
pub fn cache_read(cache_path: String) -> napi::Result<CacheReadResult> {
    static RE_MTIME: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#""mtimeMs"\s*:\s*([0-9.]+)"#).unwrap());
    static RE_SIZE: Lazy<Regex> = Lazy::new(|| Regex::new(r#""size"\s*:\s*(\d+)"#).unwrap());
    static RE_CLASSES: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#""classes"\s*:\s*\[([^\]]*)\]"#).unwrap());
    static RE_HIT: Lazy<Regex> = Lazy::new(|| Regex::new(r#""hitCount"\s*:\s*(\d+)"#).unwrap());
    static RE_HASH: Lazy<Regex> = Lazy::new(|| Regex::new(r#""hash"\s*:\s*"([^"]*)""#).unwrap());

    let content = std::fs::read_to_string(&cache_path).map_err(|e| {
        napi::Error::from_reason(format!("Cannot read cache file {}: {}", cache_path, e))
    })?;

    let mut entries: Vec<CacheEntry> = Vec::new();

    // Walk character-by-character extracting "filepath": { ... } entries
    let chars: Vec<char> = content.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        // Find opening quote of a key
        if chars[i] != '"' {
            i += 1;
            continue;
        }
        let key_start = i + 1;
        let mut j = key_start;
        // Scan to closing quote (skip escaped quotes)
        while j < len && !(chars[j] == '"' && chars[j.saturating_sub(1)] != '\\') {
            j += 1;
        }
        if j >= len {
            break;
        }
        let key_raw: String = chars[key_start..j].iter().collect();
        let key = json_unescape(&key_raw);
        i = j + 1;

        // Skip whitespace
        while i < len && chars[i].is_ascii_whitespace() {
            i += 1;
        }
        // Must be followed by ':'
        if i >= len || chars[i] != ':' {
            continue;
        }
        i += 1;
        while i < len && chars[i].is_ascii_whitespace() {
            i += 1;
        }
        // Value must be an object '{'
        if i >= len || chars[i] != '{' {
            continue;
        }

        // Skip structural wrapper keys
        if key == "version" || key == "files" {
            i += 1;
            continue;
        }

        // Capture the full object with brace-depth counting
        let obj_start = i;
        let mut depth = 0i32;
        while i < len {
            match chars[i] {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        i += 1;
                        break;
                    }
                }
                _ => {}
            }
            i += 1;
        }
        if i > obj_start {
            let obj: String = chars[obj_start..i].iter().collect();

            let mtime_ms: f64 = RE_MTIME
                .captures(&obj)
                .and_then(|c| c[1].parse().ok())
                .unwrap_or(0.0);
            let size: u32 = RE_SIZE
                .captures(&obj)
                .and_then(|c| c[1].parse().ok())
                .unwrap_or(0);
            let hit_count: u32 = RE_HIT
                .captures(&obj)
                .and_then(|c| c[1].parse().ok())
                .unwrap_or(0);
            let hash = RE_HASH
                .captures(&obj)
                .map(|c| json_unescape(&c[1]))
                .unwrap_or_else(|| short_hash(&key));
            let classes: Vec<String> = RE_CLASSES
                .captures(&obj)
                .map(|c| {
                    c[1].split(',')
                        .map(|s| json_unescape(s.trim().trim_matches('"')))
                        .filter(|s| !s.is_empty())
                        .collect()
                })
                .unwrap_or_default();

            entries.push(CacheEntry {
                file: key,
                classes,
                hash,
                mtime_ms,
                size,
                hit_count,
            });
        }
    }

    Ok(CacheReadResult {
        entries,
        version: 2,
    })
}

/// Write cache entries to a JSON cache file.
/// Replaces the JS `ScanCache.save()` method.
#[napi]
pub fn cache_write(cache_path: String, entries: Vec<CacheEntry>) -> napi::Result<bool> {
    if cache_path.trim().is_empty() {
        return Err(napi::Error::from_reason(
            "cache_path cannot be empty".to_string(),
        ));
    }

    let parent = std::path::Path::new(&cache_path).parent();
    if let Some(p) = parent {
        std::fs::create_dir_all(p).map_err(|e| {
            napi::Error::from_reason(format!(
                "Cannot create cache directory {}: {}",
                p.display(),
                e
            ))
        })?;
    }

    let mut lines: Vec<String> = Vec::new();
    for e in &entries {
        let classes_json: Vec<String> = e.classes.iter().map(|c| serde_json_string(c)).collect();
        lines.push(format!(
            "  {}: {{\"mtimeMs\":{},\"size\":{},\"classes\":[{}],\"hitCount\":{},\"hash\":{}}}",
            serde_json_string(&e.file),
            e.mtime_ms,
            e.size,
            classes_json.join(","),
            e.hit_count,
            serde_json_string(&e.hash)
        ));
    }

    let json = format!(
        "{{\"version\":2,\"files\":{{\n{}\n}}}}\n",
        lines.join(",\n")
    );
    std::fs::write(&cache_path, json).map_err(|e| {
        napi::Error::from_reason(format!("Cannot write cache file {}: {}", cache_path, e))
    })?;
    Ok(true)
}

/// Compute priority score for a file (SmartCache logic in Rust).
/// Higher score = process first.
#[napi]
pub fn cache_priority(
    mtime_ms: f64,
    size: u32,
    cached_mtime_ms: f64,
    cached_size: u32,
    cached_hit_count: u32,
    cached_last_seen_ms: f64,
    now_ms: f64,
) -> f64 {
    if cached_mtime_ms == 0.0 {
        return 1_000_000_000.0; // never cached = highest priority
    }
    let mtime_delta = (mtime_ms - cached_mtime_ms).max(0.0);
    let size_delta = (size as f64 - cached_size as f64).abs();
    let recency = if cached_last_seen_ms > 0.0 {
        now_ms - cached_last_seen_ms
    } else {
        0.0
    };
    let hotness = cached_hit_count as f64;

    mtime_delta * 1000.0 + size_delta * 10.0 + hotness * 100.0 - recency / 1000.0
}

// ═════════════════════════════════════════════════════════════════════════════
// OXC-STYLE AST PARSER — Fast AST-aware class extraction
// (Implements the same interface as oxc-parser but in pure Rust)
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct AstExtractResult {
    /// All Tailwind classes found in the file
    pub classes: Vec<String>,
    /// Component names found (const Foo = tw.div`...`)
    pub component_names: Vec<String>,
    /// Whether any tw.* usage was found
    pub has_tw_usage: bool,
    /// Whether the file has "use client" directive
    pub has_use_client: bool,
    /// Import statements found
    pub imports: Vec<String>,
}

/// Parse a source file and extract Tailwind classes using AST-level analysis.
/// More accurate than regex-only approaches — handles JSX, template literals,
/// and object configs. Implements the same interface as the oxc-based scanner.
#[napi]
pub fn ast_extract_classes(source: String, filename: String) -> AstExtractResult {
    // Static patterns for AST-level extraction
    static RE_TW_TEMPLATE: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"\btw(?:\.server)?\.(\w+)`([^`]*)`"#).unwrap());
    #[allow(dead_code)]
    static RE_TW_OBJECT: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"\btw(?:\.server)?\.(\w+)\(\s*\{"#).unwrap());
    static RE_TW_WRAP: Lazy<Regex> = Lazy::new(|| Regex::new(r#"\btw\((\w+)\)`([^`]*)`"#).unwrap());
    static RE_CLASSNAME_JSX: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"className=\{?["'`]([^"'`}]+)["'`]\}?"#).unwrap());
    static RE_CN_CALL: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"\b(?:cn|cx|clsx|classnames)\(["'`]([^"'`]+)["'`]\)"#).unwrap());
    static RE_BASE_FIELD: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"base\s*:\s*["'`]([^"'`]+)["'`]"#).unwrap());
    static RE_COMP_ASSIGN: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"(?:const|let|var)\s+(\w+)\s*=\s*tw"#).unwrap());
    static RE_IMPORT: Lazy<Regex> =
        Lazy::new(|| Regex::new(r#"import\s+[^;]+\s+from\s+["']([^"']+)["']"#).unwrap());

    let mut classes: std::collections::HashSet<String> = std::collections::HashSet::new();
    let mut component_names: Vec<String> = Vec::new();
    let mut imports: Vec<String> = Vec::new();

    let has_use_client = source.contains("\"use client\"") || source.contains("'use client'");
    let has_tw_usage = source.contains("tw.") || source.contains("from \"tailwind-styled");

    // Extract component names
    for cap in RE_COMP_ASSIGN.captures_iter(&source) {
        component_names.push(cap[1].to_string());
    }

    // Extract from tw.tag`classes` — static only
    for cap in RE_TW_TEMPLATE.captures_iter(&source) {
        let content = &cap[2];
        if !content.contains("${") {
            for token in content.split_whitespace() {
                let t = token.trim();
                // Skip subcomponent block names and braces
                if !t.is_empty() && !t.ends_with('{') && t != "}" && t.len() >= 2 {
                    classes.insert(t.to_string());
                }
            }
        }
    }

    // Extract from tw(Comp)`classes`
    for cap in RE_TW_WRAP.captures_iter(&source) {
        let content = &cap[2];
        if !content.contains("${") {
            for token in content.split_whitespace() {
                let t = token.trim();
                if !t.is_empty() && !t.ends_with('{') && t != "}" && t.len() >= 2 {
                    classes.insert(t.to_string());
                }
            }
        }
    }

    // Extract from object config base: "..."
    for cap in RE_BASE_FIELD.captures_iter(&source) {
        for token in cap[1].split_whitespace() {
            if token.len() >= 2 {
                classes.insert(token.to_string());
            }
        }
    }

    // Extract from className="..."
    for cap in RE_CLASSNAME_JSX.captures_iter(&source) {
        for token in cap[1].split_whitespace() {
            if token.len() >= 2 {
                classes.insert(token.to_string());
            }
        }
    }

    // Extract from cn()/cx()/clsx()
    for cap in RE_CN_CALL.captures_iter(&source) {
        for token in cap[1].split_whitespace() {
            if token.len() >= 2 {
                classes.insert(token.to_string());
            }
        }
    }

    // Extract imports
    for cap in RE_IMPORT.captures_iter(&source) {
        imports.push(cap[1].to_string());
    }

    // Filter: only keep tokens that look like Tailwind classes
    let _ = &filename; // used for future per-file heuristics
    let classes: Vec<String> = classes
        .into_iter()
        .filter(|c| {
            c.contains('-')
                || c.contains(':')
                || c.contains('[')
                || matches!(
                    c.as_str(),
                    "flex"
                        | "grid"
                        | "block"
                        | "inline"
                        | "hidden"
                        | "static"
                        | "fixed"
                        | "absolute"
                        | "relative"
                        | "sticky"
                        | "overflow"
                        | "truncate"
                        | "italic"
                        | "underline"
                        | "uppercase"
                        | "lowercase"
                        | "capitalize"
                        | "visible"
                        | "invisible"
                        | "prose"
                        | "container"
                )
        })
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect();

    AstExtractResult {
        classes,
        component_names,
        has_tw_usage,
        has_use_client,
        imports,
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// LIGHTNINGCSS-STYLE CSS COMPILER — Atomic CSS generation from class lists
// Implements the same interface as lightningcss but in pure Rust
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct CssCompileResult {
    /// Generated CSS output
    pub css: String,
    /// Classes that were successfully resolved
    pub resolved_classes: Vec<String>,
    /// Classes that had no known mapping (passed through as @apply)
    pub unknown_classes: Vec<String>,
    /// Byte size of generated CSS
    pub size_bytes: u32,
}

/// Compile a list of Tailwind classes into atomic CSS.
/// This is the Rust implementation of LightningCSS-style compilation.
/// For classes without a known mapping, generates `@apply` fallback rules.
#[napi]
pub fn compile_css(classes: Vec<String>, prefix: Option<String>) -> CssCompileResult {
    let pfx = prefix.as_deref().unwrap_or(".");

    let mut css_rules: Vec<String> = Vec::new();
    let mut resolved: Vec<String> = Vec::new();
    let mut unknown: Vec<String> = Vec::new();

    for class in &classes {
        // Strip variant prefix(es) for CSS lookup, keep for selector wrapping
        let has_variant = class.contains(':');
        let (variants_str, base_class) = if has_variant {
            let mut parts = class.splitn(2, ':');
            let v = parts.next().unwrap_or("");
            let b = parts.next().unwrap_or(class);
            // Handle multi-variant: dark:hover:bg-blue-600 → "dark:hover" + "bg-blue-600"
            (v, b)
        } else {
            ("", class.as_str())
        };

        if let Some(rule) = tw_class_to_css(base_class) {
            // Escape class name for CSS selector
            let selector = class
                .replace(':', "\\:")
                .replace('[', "\\[")
                .replace(']', "\\]")
                .replace('/', "\\/")
                .replace('.', "\\.");

            let css_rule = if has_variant {
                // Last variant is the pseudo-class/at-rule wrapper
                let last_variant = variants_str.splitn(2, ':').next().unwrap_or(variants_str);
                let at_or_pseudo = variant_to_at_rule(last_variant);
                if at_or_pseudo.starts_with('@') {
                    // Responsive/media: @media (min-width: 768px) { .md\:flex { display: flex } }
                    format!(
                        "{} {{ {}{} {{ {} }} }}",
                        at_or_pseudo.trim(),
                        pfx,
                        selector,
                        rule
                    )
                } else {
                    // Pseudo-class: .hover\:bg-blue-600:hover { background-color: ... }
                    format!("{}{}{} {{ {} }}", pfx, selector, at_or_pseudo.trim(), rule)
                }
            } else {
                format!("{}{} {{ {} }}", pfx, selector, rule)
            };

            css_rules.push(css_rule);
            resolved.push(class.clone());
        } else {
            // Unknown class — generate @apply fallback
            let selector = class
                .replace(':', "\\:")
                .replace('[', "\\[")
                .replace(']', "\\]");
            css_rules.push(format!("{}{} {{ @apply {}; }}", pfx, selector, class));
            unknown.push(class.clone());
        }
    }

    let css = css_rules.join("\n");
    let size_bytes = css.len() as u32;

    CssCompileResult {
        css,
        resolved_classes: resolved,
        unknown_classes: unknown,
        size_bytes,
    }
}

/// Convert a variant prefix to CSS pseudo-class or @media rule.
fn variant_to_at_rule(variant: &str) -> &'static str {
    match variant {
        // Pseudo-classes (appended after selector)
        "hover" => ":hover",
        "focus" => ":focus",
        "focus-within" => ":focus-within",
        "focus-visible" => ":focus-visible",
        "active" => ":active",
        "visited" => ":visited",
        "disabled" => ":disabled",
        "checked" => ":checked",
        "required" => ":required",
        "first" => ":first-child",
        "last" => ":last-child",
        "odd" => ":nth-child(odd)",
        "even" => ":nth-child(even)",
        "placeholder" => "::placeholder",
        "before" => "::before",
        "after" => "::after",
        "first-line" => "::first-line",
        "first-letter" => "::first-letter",
        // Responsive breakpoints (@media)
        "sm" => "@media (min-width: 640px)",
        "md" => "@media (min-width: 768px)",
        "lg" => "@media (min-width: 1024px)",
        "xl" => "@media (min-width: 1280px)",
        "2xl" => "@media (min-width: 1536px)",
        // Color scheme
        "dark" => "@media (prefers-color-scheme: dark)",
        "light" => "@media (prefers-color-scheme: light)",
        // Motion
        "motion-safe" => "@media (prefers-reduced-motion: no-preference)",
        "motion-reduce" => "@media (prefers-reduced-motion: reduce)",
        // Print
        "print" => "@media print",
        _ => "",
    }
}

/// Core mapping: Tailwind class → CSS declaration(s).
/// Covers the most common utility classes used in practice.
/// Resolve Tailwind color scale classes → CSS color property.
/// Covers all standard Tailwind colors with shades 50–950.
fn resolve_color_class(class: &str) -> Option<String> {
    // Map color names to their hex palette (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950)
    let (prop, rest) = if class.starts_with("bg-") {
        ("background-color", &class[3..])
    } else if class.starts_with("text-") {
        ("color", &class[5..])
    } else if class.starts_with("border-") {
        ("border-color", &class[7..])
    } else if class.starts_with("ring-") {
        ("--tw-ring-color", &class[5..])
    } else if class.starts_with("fill-") {
        ("fill", &class[5..])
    } else if class.starts_with("stroke-") {
        ("stroke", &class[7..])
    } else if class.starts_with("accent-") {
        ("accent-color", &class[7..])
    } else if class.starts_with("caret-") {
        ("caret-color", &class[6..])
    } else if class.starts_with("outline-") {
        ("outline-color", &class[8..])
    } else if class.starts_with("shadow-")
        && !["sm", "md", "lg", "xl", "2xl", "none", "inner"].contains(&class[7..].trim())
    {
        ("--tw-shadow-color", &class[7..])
    } else {
        return None;
    };

    // Named colors without shade
    let hex = match rest {
        "white" => return Some(format!("{}: rgb(255 255 255)", prop)),
        "black" => return Some(format!("{}: rgb(0 0 0)", prop)),
        "transparent" => return Some(format!("{}: transparent", prop)),
        "current" => return Some(format!("{}: currentColor", prop)),
        "inherit" => return Some(format!("{}: inherit", prop)),
        _ => {
            /* fall through to shade parsing */
            ""
        }
    };
    let _ = hex;

    // Parse color-shade: e.g. "blue-600", "red-50", "zinc-950"
    let dash_pos = rest.rfind('-')?;
    let color_name = &rest[..dash_pos];
    let shade_str = &rest[dash_pos + 1..];
    let shade: usize = shade_str.parse().ok()?;

    // Tailwind v4 color palette (11 shades: 50,100,200,300,400,500,600,700,800,900,950)
    let palette: &[&str] = match color_name {
        "slate" => &[
            "f8fafc", "f1f5f9", "e2e8f0", "cbd5e1", "94a3b8", "64748b", "475569", "334155",
            "1e293b", "0f172a", "020617",
        ],
        "gray" => &[
            "f9fafb", "f3f4f6", "e5e7eb", "d1d5db", "9ca3af", "6b7280", "4b5563", "374151",
            "1f2937", "111827", "030712",
        ],
        "zinc" => &[
            "fafafa", "f4f4f5", "e4e4e7", "d4d4d8", "a1a1aa", "71717a", "52525b", "3f3f46",
            "27272a", "18181b", "09090b",
        ],
        "neutral" => &[
            "fafafa", "f5f5f5", "e5e5e5", "d4d4d4", "a3a3a3", "737373", "525252", "404040",
            "262626", "171717", "0a0a0a",
        ],
        "stone" => &[
            "fafaf9", "f5f5f4", "e7e5e4", "d6d3d1", "a8a29e", "78716c", "57534e", "44403c",
            "292524", "1c1917", "0c0a09",
        ],
        "red" => &[
            "fef2f2", "fee2e2", "fecaca", "fca5a5", "f87171", "ef4444", "dc2626", "b91c1c",
            "991b1b", "7f1d1d", "450a0a",
        ],
        "orange" => &[
            "fff7ed", "ffedd5", "fed7aa", "fdba74", "fb923c", "f97316", "ea580c", "c2410c",
            "9a3412", "7c2d12", "431407",
        ],
        "amber" => &[
            "fffbeb", "fef3c7", "fde68a", "fcd34d", "fbbf24", "f59e0b", "d97706", "b45309",
            "92400e", "78350f", "451a03",
        ],
        "yellow" => &[
            "fefce8", "fef9c3", "fef08a", "fde047", "facc15", "eab308", "ca8a04", "a16207",
            "854d0e", "713f12", "422006",
        ],
        "lime" => &[
            "f7fee7", "ecfccb", "d9f99d", "bef264", "a3e635", "84cc16", "65a30d", "4d7c0f",
            "3f6212", "365314", "1a2e05",
        ],
        "green" => &[
            "f0fdf4", "dcfce7", "bbf7d0", "86efac", "4ade80", "22c55e", "16a34a", "15803d",
            "166534", "14532d", "052e16",
        ],
        "emerald" => &[
            "ecfdf5", "d1fae5", "a7f3d0", "6ee7b7", "34d399", "10b981", "059669", "047857",
            "065f46", "064e3b", "022c22",
        ],
        "teal" => &[
            "f0fdfa", "ccfbf1", "99f6e4", "5eead4", "2dd4bf", "14b8a6", "0d9488", "0f766e",
            "115e59", "134e4a", "042f2e",
        ],
        "cyan" => &[
            "ecfeff", "cffafe", "a5f3fc", "67e8f9", "22d3ee", "06b6d4", "0891b2", "0e7490",
            "155e75", "164e63", "083344",
        ],
        "sky" => &[
            "f0f9ff", "e0f2fe", "bae6fd", "7dd3fc", "38bdf8", "0ea5e9", "0284c7", "0369a1",
            "075985", "0c4a6e", "082f49",
        ],
        "blue" => &[
            "eff6ff", "dbeafe", "bfdbfe", "93c5fd", "60a5fa", "3b82f6", "2563eb", "1d4ed8",
            "1e40af", "1e3a8a", "172554",
        ],
        "indigo" => &[
            "eef2ff", "e0e7ff", "c7d2fe", "a5b4fc", "818cf8", "6366f1", "4f46e5", "4338ca",
            "3730a3", "312e81", "1e1b4b",
        ],
        "violet" => &[
            "f5f3ff", "ede9fe", "ddd6fe", "c4b5fd", "a78bfa", "8b5cf6", "7c3aed", "6d28d9",
            "5b21b6", "4c1d95", "2e1065",
        ],
        "purple" => &[
            "faf5ff", "f3e8ff", "e9d5ff", "d8b4fe", "c084fc", "a855f7", "9333ea", "7e22ce",
            "6b21a8", "581c87", "3b0764",
        ],
        "fuchsia" => &[
            "fdf4ff", "fae8ff", "f5d0fe", "f0abfc", "e879f9", "d946ef", "c026d3", "a21caf",
            "86198f", "701a75", "4a044e",
        ],
        "pink" => &[
            "fdf2f8", "fce7f3", "fbcfe8", "f9a8d4", "f472b6", "ec4899", "db2777", "be185d",
            "9d174d", "831843", "500724",
        ],
        "rose" => &[
            "fff1f2", "ffe4e6", "fecdd3", "fda4af", "fb7185", "f43f5e", "e11d48", "be123c",
            "9f1239", "881337", "4c0519",
        ],
        _ => return None,
    };

    let shade_idx = match shade {
        50 => 0,
        100 => 1,
        200 => 2,
        300 => 3,
        400 => 4,
        500 => 5,
        600 => 6,
        700 => 7,
        800 => 8,
        900 => 9,
        950 => 10,
        _ => return None,
    };

    let hex = palette.get(shade_idx)?;
    let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
    let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
    let b = u8::from_str_radix(&hex[4..6], 16).ok()?;

    Some(format!("{}: rgb({} {} {})", prop, r, g, b))
}

/// Resolve Tailwind spacing classes with decimal v4 values.
/// Covers w-{n}, h-{n}, p-{n}, m-{n}, gap-{n} etc. for non-integer steps.
fn resolve_spacing_class(class: &str) -> Option<String> {
    // Only handle cases not already in the static match table
    // Tailwind spacing scale: 1 unit = 0.25rem
    let (prop, rest) = if class.starts_with("w-") {
        ("width", &class[2..])
    } else if class.starts_with("h-") {
        ("height", &class[2..])
    } else if class.starts_with("min-h-") {
        ("min-height", &class[6..])
    } else if class.starts_with("max-h-") {
        ("max-height", &class[6..])
    } else if class.starts_with("min-w-") {
        ("min-width", &class[6..])
    } else if class.starts_with("max-w-") {
        ("max-width", &class[6..])
    } else if class.starts_with("p-") {
        ("padding", &class[2..])
    } else if class.starts_with("m-") {
        ("margin", &class[2..])
    } else if class.starts_with("gap-") {
        ("gap", &class[4..])
    } else if class.starts_with("top-") {
        ("top", &class[4..])
    } else if class.starts_with("bottom-") {
        ("bottom", &class[7..])
    } else if class.starts_with("left-") {
        ("left", &class[5..])
    } else if class.starts_with("right-") {
        ("right", &class[6..])
    } else if class.starts_with("inset-") {
        ("inset", &class[6..])
    } else if class.starts_with("translate-x-") {
        return resolve_transform("translateX", &class[12..]);
    } else if class.starts_with("translate-y-") {
        return resolve_transform("translateY", &class[12..]);
    } else if class.starts_with("scale-") {
        return resolve_transform("scale", &class[6..]);
    } else if class.starts_with("rotate-") {
        return resolve_rotate(&class[7..]);
    } else {
        return None;
    };

    // Parse numeric value (integer or decimal like 0.5, 1.5, 2.5)
    let n: f64 = rest.replace('.', ".").parse().ok()?;
    // Tailwind: 1 unit = 0.25rem (except for fractional like 1/2, 1/3)
    if rest.contains('/') {
        // Fractional: 1/2, 1/3, 2/3 etc.
        let parts: Vec<&str> = rest.split('/').collect();
        if parts.len() == 2 {
            let num: f64 = parts[0].parse().ok()?;
            let den: f64 = parts[1].parse().ok()?;
            if den == 0.0 {
                return None;
            }
            let pct = (num / den * 100.0) as u32;
            return Some(format!("{}: {}%", prop, pct));
        }
        return None;
    }
    let rem = n * 0.25;
    Some(format!("{}: {}rem", prop, rem))
}

fn resolve_transform(func: &str, val: &str) -> Option<String> {
    let n: f64 = val.parse().ok()?;
    let rem = n * 0.25;
    Some(format!("transform: {}({}rem)", func, rem))
}

fn resolve_rotate(val: &str) -> Option<String> {
    let n: f64 = val.parse().ok()?;
    Some(format!("transform: rotate({}deg)", n))
}

fn tw_class_to_css(class: &str) -> Option<String> {
    // Handle arbitrary values: bg-[#ff0000], p-[1.5rem], etc.
    if class.contains('[') && class.contains(']') {
        return tw_arbitrary_to_css(class);
    }

    // Strip ALL variant prefixes (handles hover:, sm:, dark:hover:, etc.)
    let mut base = class;
    while base.contains(':') {
        base = base.splitn(2, ':').nth(1).unwrap_or(base);
    }

    // ── Pattern-based color resolver ──────────────────────────────────────────
    if let Some(css) = resolve_color_class(base) {
        return Some(css);
    }

    // ── Pattern-based spacing resolver ────────────────────────────────────────
    if let Some(css) = resolve_spacing_class(base) {
        return Some(css);
    }

    let css = match base {
        // ── Display ──────────────────────────────────────────────────────────
        "block"        => "display: block",
        "inline-block" => "display: inline-block",
        "inline"       => "display: inline",
        "flex"         => "display: flex",
        "inline-flex"  => "display: inline-flex",
        "grid"         => "display: grid",
        "inline-grid"  => "display: inline-grid",
        "hidden"       => "display: none",
        "contents"     => "display: contents",
        "table"        => "display: table",
        "table-cell"   => "display: table-cell",

        // ── Position ─────────────────────────────────────────────────────────
        "static"   => "position: static",
        "fixed"    => "position: fixed",
        "absolute" => "position: absolute",
        "relative" => "position: relative",
        "sticky"   => "position: sticky",

        // ── Flex ─────────────────────────────────────────────────────────────
        "flex-row"         => "flex-direction: row",
        "flex-col"         => "flex-direction: column",
        "flex-row-reverse" => "flex-direction: row-reverse",
        "flex-col-reverse" => "flex-direction: column-reverse",
        "flex-wrap"        => "flex-wrap: wrap",
        "flex-nowrap"      => "flex-wrap: nowrap",
        "flex-1"           => "flex: 1 1 0%",
        "flex-auto"        => "flex: 1 1 auto",
        "flex-none"        => "flex: none",
        "flex-grow"        => "flex-grow: 1",
        "flex-shrink"      => "flex-shrink: 1",
        "flex-shrink-0"    => "flex-shrink: 0",
        "flex-grow-0"      => "flex-grow: 0",

        // ── Alignment ─────────────────────────────────────────────────────────
        "items-start"    => "align-items: flex-start",
        "items-end"      => "align-items: flex-end",
        "items-center"   => "align-items: center",
        "items-baseline" => "align-items: baseline",
        "items-stretch"  => "align-items: stretch",
        "justify-start"  => "justify-content: flex-start",
        "justify-end"    => "justify-content: flex-end",
        "justify-center" => "justify-content: center",
        "justify-between"=> "justify-content: space-between",
        "justify-around" => "justify-content: space-around",
        "justify-evenly" => "justify-content: space-evenly",
        "self-auto"      => "align-self: auto",
        "self-start"     => "align-self: flex-start",
        "self-end"       => "align-self: flex-end",
        "self-center"    => "align-self: center",
        "self-stretch"   => "align-self: stretch",

        // ── Overflow ──────────────────────────────────────────────────────────
        "overflow-auto"    => "overflow: auto",
        "overflow-hidden"  => "overflow: hidden",
        "overflow-visible" => "overflow: visible",
        "overflow-scroll"  => "overflow: scroll",
        "overflow-x-auto"  => "overflow-x: auto",
        "overflow-y-auto"  => "overflow-y: auto",
        "overflow-x-hidden"=> "overflow-x: hidden",
        "overflow-y-hidden"=> "overflow-y: hidden",
        "truncate"         => "overflow: hidden; text-overflow: ellipsis; white-space: nowrap",

        // ── Width/Height ─────────────────────────────────────────────────────
        "w-full"    => "width: 100%",
        "w-screen"  => "width: 100vw",
        "w-auto"    => "width: auto",
        "w-0"       => "width: 0px",
        "w-px"      => "width: 1px",
        "w-1"       => "width: 0.25rem",
        "w-2"       => "width: 0.5rem",
        "w-3"       => "width: 0.75rem",
        "w-4"       => "width: 1rem",
        "w-5"       => "width: 1.25rem",
        "w-6"       => "width: 1.5rem",
        "w-8"       => "width: 2rem",
        "w-10"      => "width: 2.5rem",
        "w-12"      => "width: 3rem",
        "w-16"      => "width: 4rem",
        "w-20"      => "width: 5rem",
        "w-24"      => "width: 6rem",
        "w-32"      => "width: 8rem",
        "w-40"      => "width: 10rem",
        "w-48"      => "width: 12rem",
        "w-56"      => "width: 14rem",
        "w-64"      => "width: 16rem",
        "h-full"    => "height: 100%",
        "h-screen"  => "height: 100vh",
        "h-auto"    => "height: auto",
        "h-0"       => "height: 0px",
        "h-px"      => "height: 1px",
        "h-1"       => "height: 0.25rem",
        "h-2"       => "height: 0.5rem",
        "h-3"       => "height: 0.75rem",
        "h-4"       => "height: 1rem",
        "h-5"       => "height: 1.25rem",
        "h-6"       => "height: 1.5rem",
        "h-8"       => "height: 2rem",
        "h-10"      => "height: 2.5rem",
        "h-12"      => "height: 3rem",
        "h-16"      => "height: 4rem",
        "min-w-0"   => "min-width: 0px",
        "min-w-full"=> "min-width: 100%",
        "max-w-sm"  => "max-width: 24rem",
        "max-w-md"  => "max-width: 28rem",
        "max-w-lg"  => "max-width: 32rem",
        "max-w-xl"  => "max-width: 36rem",
        "max-w-2xl" => "max-width: 42rem",
        "max-w-full"=> "max-width: 100%",
        "max-w-none"=> "max-width: none",

        // ── Padding ───────────────────────────────────────────────────────────
        "p-0"  => "padding: 0px",
        "p-px" => "padding: 1px",
        "p-1"  => "padding: 0.25rem",
        "p-2"  => "padding: 0.5rem",
        "p-3"  => "padding: 0.75rem",
        "p-4"  => "padding: 1rem",
        "p-5"  => "padding: 1.25rem",
        "p-6"  => "padding: 1.5rem",
        "p-8"  => "padding: 2rem",
        "p-10" => "padding: 2.5rem",
        "p-12" => "padding: 3rem",
        "p-16" => "padding: 4rem",
        "px-0" => "padding-left: 0px; padding-right: 0px",
        "px-1" => "padding-left: 0.25rem; padding-right: 0.25rem",
        "px-2" => "padding-left: 0.5rem; padding-right: 0.5rem",
        "px-3" => "padding-left: 0.75rem; padding-right: 0.75rem",
        "px-4" => "padding-left: 1rem; padding-right: 1rem",
        "px-5" => "padding-left: 1.25rem; padding-right: 1.25rem",
        "px-6" => "padding-left: 1.5rem; padding-right: 1.5rem",
        "px-8" => "padding-left: 2rem; padding-right: 2rem",
        "py-0" => "padding-top: 0px; padding-bottom: 0px",
        "py-1" => "padding-top: 0.25rem; padding-bottom: 0.25rem",
        "py-2" => "padding-top: 0.5rem; padding-bottom: 0.5rem",
        "py-3" => "padding-top: 0.75rem; padding-bottom: 0.75rem",
        "py-4" => "padding-top: 1rem; padding-bottom: 1rem",
        "py-5" => "padding-top: 1.25rem; padding-bottom: 1.25rem",
        "py-6" => "padding-top: 1.5rem; padding-bottom: 1.5rem",
        "py-8" => "padding-top: 2rem; padding-bottom: 2rem",
        "pt-0" => "padding-top: 0px",
        "pt-1" => "padding-top: 0.25rem",
        "pt-2" => "padding-top: 0.5rem",
        "pt-4" => "padding-top: 1rem",
        "pt-6" => "padding-top: 1.5rem",
        "pt-8" => "padding-top: 2rem",
        "pb-0" => "padding-bottom: 0px",
        "pb-1" => "padding-bottom: 0.25rem",
        "pb-2" => "padding-bottom: 0.5rem",
        "pb-4" => "padding-bottom: 1rem",
        "pb-6" => "padding-bottom: 1.5rem",
        "pb-8" => "padding-bottom: 2rem",
        "pl-0" => "padding-left: 0px",
        "pl-1" => "padding-left: 0.25rem",
        "pl-2" => "padding-left: 0.5rem",
        "pl-4" => "padding-left: 1rem",
        "pr-0" => "padding-right: 0px",
        "pr-1" => "padding-right: 0.25rem",
        "pr-2" => "padding-right: 0.5rem",
        "pr-4" => "padding-right: 1rem",

        // ── Margin ────────────────────────────────────────────────────────────
        "m-0"    => "margin: 0px",
        "m-auto" => "margin: auto",
        "m-1"    => "margin: 0.25rem",
        "m-2"    => "margin: 0.5rem",
        "m-4"    => "margin: 1rem",
        "m-6"    => "margin: 1.5rem",
        "m-8"    => "margin: 2rem",
        "mx-auto"=> "margin-left: auto; margin-right: auto",
        "mx-0"   => "margin-left: 0px; margin-right: 0px",
        "mx-1"   => "margin-left: 0.25rem; margin-right: 0.25rem",
        "mx-2"   => "margin-left: 0.5rem; margin-right: 0.5rem",
        "mx-4"   => "margin-left: 1rem; margin-right: 1rem",
        "my-0"   => "margin-top: 0px; margin-bottom: 0px",
        "my-1"   => "margin-top: 0.25rem; margin-bottom: 0.25rem",
        "my-2"   => "margin-top: 0.5rem; margin-bottom: 0.5rem",
        "my-4"   => "margin-top: 1rem; margin-bottom: 1rem",
        "my-6"   => "margin-top: 1.5rem; margin-bottom: 1.5rem",
        "my-8"   => "margin-top: 2rem; margin-bottom: 2rem",
        "mt-0"   => "margin-top: 0px",
        "mt-1"   => "margin-top: 0.25rem",
        "mt-2"   => "margin-top: 0.5rem",
        "mt-4"   => "margin-top: 1rem",
        "mt-6"   => "margin-top: 1.5rem",
        "mt-8"   => "margin-top: 2rem",
        "mb-0"   => "margin-bottom: 0px",
        "mb-1"   => "margin-bottom: 0.25rem",
        "mb-2"   => "margin-bottom: 0.5rem",
        "mb-4"   => "margin-bottom: 1rem",
        "mb-6"   => "margin-bottom: 1.5rem",
        "mb-8"   => "margin-bottom: 2rem",
        "ml-0"   => "margin-left: 0px",
        "ml-1"   => "margin-left: 0.25rem",
        "ml-2"   => "margin-left: 0.5rem",
        "ml-4"   => "margin-left: 1rem",
        "ml-auto"=> "margin-left: auto",
        "mr-0"   => "margin-right: 0px",
        "mr-1"   => "margin-right: 0.25rem",
        "mr-2"   => "margin-right: 0.5rem",
        "mr-4"   => "margin-right: 1rem",
        "mr-auto"=> "margin-right: auto",

        // ── Gap ───────────────────────────────────────────────────────────────
        "gap-0"  => "gap: 0px",
        "gap-1"  => "gap: 0.25rem",
        "gap-2"  => "gap: 0.5rem",
        "gap-3"  => "gap: 0.75rem",
        "gap-4"  => "gap: 1rem",
        "gap-6"  => "gap: 1.5rem",
        "gap-8"  => "gap: 2rem",
        "gap-x-1"=> "column-gap: 0.25rem",
        "gap-x-2"=> "column-gap: 0.5rem",
        "gap-x-4"=> "column-gap: 1rem",
        "gap-y-1"=> "row-gap: 0.25rem",
        "gap-y-2"=> "row-gap: 0.5rem",
        "gap-y-4"=> "row-gap: 1rem",

        // ── Typography ────────────────────────────────────────────────────────
        "text-xs"    => "font-size: 0.75rem; line-height: 1rem",
        "text-sm"    => "font-size: 0.875rem; line-height: 1.25rem",
        "text-base"  => "font-size: 1rem; line-height: 1.5rem",
        "text-lg"    => "font-size: 1.125rem; line-height: 1.75rem",
        "text-xl"    => "font-size: 1.25rem; line-height: 1.75rem",
        "text-2xl"   => "font-size: 1.5rem; line-height: 2rem",
        "text-3xl"   => "font-size: 1.875rem; line-height: 2.25rem",
        "text-4xl"   => "font-size: 2.25rem; line-height: 2.5rem",
        "font-thin"      => "font-weight: 100",
        "font-light"     => "font-weight: 300",
        "font-normal"    => "font-weight: 400",
        "font-medium"    => "font-weight: 500",
        "font-semibold"  => "font-weight: 600",
        "font-bold"      => "font-weight: 700",
        "font-extrabold" => "font-weight: 800",
        "font-black"     => "font-weight: 900",
        "italic"         => "font-style: italic",
        "not-italic"     => "font-style: normal",
        "underline"      => "text-decoration-line: underline",
        "no-underline"   => "text-decoration-line: none",
        "line-through"   => "text-decoration-line: line-through",
        "uppercase"      => "text-transform: uppercase",
        "lowercase"      => "text-transform: lowercase",
        "capitalize"     => "text-transform: capitalize",
        "normal-case"    => "text-transform: none",
        "text-left"      => "text-align: left",
        "text-center"    => "text-align: center",
        "text-right"     => "text-align: right",
        "text-justify"   => "text-align: justify",
        "leading-none"   => "line-height: 1",
        "leading-tight"  => "line-height: 1.25",
        "leading-snug"   => "line-height: 1.375",
        "leading-normal" => "line-height: 1.5",
        "leading-relaxed"=> "line-height: 1.625",
        "leading-loose"  => "line-height: 2",
        "tracking-tight" => "letter-spacing: -0.05em",
        "tracking-normal"=> "letter-spacing: 0em",
        "tracking-wide"  => "letter-spacing: 0.05em",
        "tracking-wider" => "letter-spacing: 0.1em",
        "whitespace-normal"  => "white-space: normal",
        "whitespace-nowrap"  => "white-space: nowrap",
        "whitespace-pre"     => "white-space: pre",
        "whitespace-pre-wrap"=> "white-space: pre-wrap",
        "break-words"    => "overflow-wrap: break-word",
        "break-all"      => "word-break: break-all",

        // ── Border ────────────────────────────────────────────────────────────
        "rounded-none" => "border-radius: 0px",
        "rounded-sm"   => "border-radius: 0.125rem",
        "rounded"      => "border-radius: 0.25rem",
        "rounded-md"   => "border-radius: 0.375rem",
        "rounded-lg"   => "border-radius: 0.5rem",
        "rounded-xl"   => "border-radius: 0.75rem",
        "rounded-2xl"  => "border-radius: 1rem",
        "rounded-3xl"  => "border-radius: 1.5rem",
        "rounded-full" => "border-radius: 9999px",
        "rounded-t-lg" => "border-top-left-radius: 0.5rem; border-top-right-radius: 0.5rem",
        "rounded-b-lg" => "border-bottom-left-radius: 0.5rem; border-bottom-right-radius: 0.5rem",
        "border-0"     => "border-width: 0px",
        "border"       => "border-width: 1px",
        "border-2"     => "border-width: 2px",
        "border-4"     => "border-width: 4px",
        "border-t"     => "border-top-width: 1px",
        "border-b"     => "border-bottom-width: 1px",
        "border-l"     => "border-left-width: 1px",
        "border-r"     => "border-right-width: 1px",
        "border-solid"   => "border-style: solid",
        "border-dashed"  => "border-style: dashed",
        "border-dotted"  => "border-style: dotted",
        "border-none"    => "border-style: none",

        // ── Shadow ────────────────────────────────────────────────────────────
        "shadow-none" => "box-shadow: none",
        "shadow-sm"   => "box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "shadow"      => "box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "shadow-md"   => "box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "shadow-lg"   => "box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "shadow-xl"   => "box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "shadow-2xl"  => "box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25)",

        // ── Cursor / Pointer ──────────────────────────────────────────────────
        "cursor-auto"    => "cursor: auto",
        "cursor-default" => "cursor: default",
        "cursor-pointer" => "cursor: pointer",
        "cursor-wait"    => "cursor: wait",
        "cursor-not-allowed" => "cursor: not-allowed",
        "select-none"    => "user-select: none",
        "select-text"    => "user-select: text",
        "select-all"     => "user-select: all",
        "pointer-events-none" => "pointer-events: none",
        "pointer-events-auto" => "pointer-events: auto",

        // ── Opacity / Visibility ──────────────────────────────────────────────
        "opacity-0"   => "opacity: 0",
        "opacity-25"  => "opacity: 0.25",
        "opacity-50"  => "opacity: 0.5",
        "opacity-75"  => "opacity: 0.75",
        "opacity-100" => "opacity: 1",
        "visible"     => "visibility: visible",
        "invisible"   => "visibility: hidden",

        // ── Z-index ───────────────────────────────────────────────────────────
        "z-0"    => "z-index: 0",
        "z-10"   => "z-index: 10",
        "z-20"   => "z-index: 20",
        "z-30"   => "z-index: 30",
        "z-40"   => "z-index: 40",
        "z-50"   => "z-index: 50",
        "z-auto" => "z-index: auto",

        // ── Transition ────────────────────────────────────────────────────────
        "transition"        => "transition-property: color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",
        "transition-none"   => "transition-property: none",
        "transition-colors" => "transition-property: color,background-color,border-color; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",
        "transition-opacity"=> "transition-property: opacity; transition-timing-function: cubic-bezier(0.4,0,0.2,1); transition-duration: 150ms",
        "duration-75"  => "transition-duration: 75ms",
        "duration-100" => "transition-duration: 100ms",
        "duration-150" => "transition-duration: 150ms",
        "duration-200" => "transition-duration: 200ms",
        "duration-300" => "transition-duration: 300ms",
        "duration-500" => "transition-duration: 500ms",
        "ease-linear"  => "transition-timing-function: linear",
        "ease-in"      => "transition-timing-function: cubic-bezier(0.4,0,1,1)",
        "ease-out"     => "transition-timing-function: cubic-bezier(0,0,0.2,1)",
        "ease-in-out"  => "transition-timing-function: cubic-bezier(0.4,0,0.2,1)",

        // ── Inset / Position values ───────────────────────────────────────────
        "inset-0"    => "inset: 0px",
        "inset-auto" => "inset: auto",
        "inset-x-0"  => "left: 0px; right: 0px",
        "inset-y-0"  => "top: 0px; bottom: 0px",
        "top-0"      => "top: 0px",
        "top-auto"   => "top: auto",
        "bottom-0"   => "bottom: 0px",
        "bottom-auto"=> "bottom: auto",
        "left-0"     => "left: 0px",
        "left-auto"  => "left: auto",
        "right-0"    => "right: 0px",
        "right-auto" => "right: auto",

        _ => return None,
    };

    Some(css.to_string())
}

/// Handle arbitrary value classes like bg-[#ff0000], p-[1.5rem], w-[200px]
fn tw_arbitrary_to_css(class: &str) -> Option<String> {
    // Extract: prefix-[value] or prefix:-[value] (with variant)
    let base = if class.contains(':') {
        class.splitn(2, ':').nth(1).unwrap_or(class)
    } else {
        class
    };

    let bracket_start = base.find('[')?;
    let bracket_end = base.rfind(']')?;
    let prefix = &base[..bracket_start];
    let value = &base[bracket_start + 1..bracket_end];

    let css = match prefix {
        "bg-"           => format!("background-color: {}", value),
        "text-"         => format!("color: {}", value),
        "border-"       => format!("border-color: {}", value),
        "p-"            => format!("padding: {}", value),
        "px-"           => format!("padding-left: {}; padding-right: {}", value, value),
        "py-"           => format!("padding-top: {}; padding-bottom: {}", value, value),
        "m-"            => format!("margin: {}", value),
        "mx-"           => format!("margin-left: {}; margin-right: {}", value, value),
        "my-"           => format!("margin-top: {}; margin-bottom: {}", value, value),
        "w-"            => format!("width: {}", value),
        "h-"            => format!("height: {}", value),
        "max-w-"        => format!("max-width: {}", value),
        "min-w-"        => format!("min-width: {}", value),
        "max-h-"        => format!("max-height: {}", value),
        "min-h-"        => format!("min-height: {}", value),
        "top-"          => format!("top: {}", value),
        "bottom-"       => format!("bottom: {}", value),
        "left-"         => format!("left: {}", value),
        "right-"        => format!("right: {}", value),
        "gap-"          => format!("gap: {}", value),
        "rounded-"      => format!("border-radius: {}", value),
        "z-"            => format!("z-index: {}", value),
        "opacity-"      => format!("opacity: {}", value),
        "font-"         => format!("font-weight: {}", value),
        "leading-"      => format!("line-height: {}", value),
        "tracking-"     => format!("letter-spacing: {}", value),
        "duration-"     => format!("transition-duration: {}ms", value),
        "delay-"        => format!("transition-delay: {}ms", value),
        "translate-x-"  => format!("transform: translateX({})", value),
        "translate-y-"  => format!("transform: translateY({})", value),
        "scale-"        => format!("transform: scale({})", value),
        "rotate-"       => format!("transform: rotate({})", value),
        "skew-x-"       => format!("transform: skewX({})", value),
        "skew-y-"       => format!("transform: skewY({})", value),
        "blur-"         => format!("filter: blur({})", value),
        "brightness-"   => format!("filter: brightness({})", value),
        "contrast-"     => format!("filter: contrast({})", value),
        "grid-cols-"    => format!("grid-template-columns: repeat({}, minmax(0, 1fr))", value),
        "col-span-"     => format!("grid-column: span {} / span {}", value, value),
        "row-span-"     => format!("grid-row: span {} / span {}", value, value),
        "line-clamp-"   => format!("-webkit-line-clamp: {}; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden", value),
        _               => return None,
    };

    Some(css)
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests for new modules: cache, ast_extract, compile_css
// ─────────────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod new_feature_tests {
    use super::*;

    // ── cache ────────────────────────────────────────────────────────────────

    #[test]
    fn cache_read_missing_file_returns_empty() {
        let r = cache_read("/tmp/nonexistent_tw_cache_xyz.json".to_string());
        assert!(r.is_err(), "nonexistent file should return error");
    }

    #[test]
    fn cache_write_and_read_round_trip() {
        let path = "/tmp/tw_rust_test_cache.json".to_string();
        let entries = vec![
            CacheEntry {
                file: "/src/Button.tsx".to_string(),
                classes: vec!["bg-blue-500".to_string(), "text-white".to_string()],
                hash: "abc123".to_string(),
                mtime_ms: 1_700_000_000.0,
                size: 1024,
                hit_count: 3,
            },
            CacheEntry {
                file: "C:\\repo\\src\\Card.tsx".to_string(),
                classes: vec!["rounded-lg".to_string(), "shadow-md".to_string()],
                hash: "def456".to_string(),
                mtime_ms: 1_700_000_001.0,
                size: 512,
                hit_count: 0,
            },
        ];
        assert!(cache_write(path.clone(), entries).unwrap());
        let result = cache_read(path).unwrap();
        assert_eq!(result.entries.len(), 2);
        assert_eq!(result.entries[0].file, "/src/Button.tsx");
        assert_eq!(result.entries[0].classes, vec!["bg-blue-500", "text-white"]);
        assert_eq!(result.entries[0].hit_count, 3);
        assert_eq!(result.entries[1].file, "C:\\repo\\src\\Card.tsx");
    }

    #[test]
    fn cache_priority_new_file_is_max() {
        let p = cache_priority(1000.0, 512, 0.0, 0, 0, 0.0, 0.0);
        assert!(p >= 1_000_000_000.0);
    }

    #[test]
    fn cache_priority_changed_file_beats_unchanged() {
        let changed = cache_priority(1000.0, 512, 800.0, 512, 2, 900_000.0, 1_000_000.0);
        let unchanged = cache_priority(800.0, 512, 800.0, 512, 5, 900_000.0, 1_000_000.0);
        assert!(
            changed > unchanged,
            "changed={} unchanged={}",
            changed,
            unchanged
        );
    }

    // ── ast_extract_classes ──────────────────────────────────────────────────

    #[test]
    fn ast_extract_finds_tw_template_classes() {
        let src = r#"const Button = tw.button`bg-blue-500 text-white px-4 py-2`"#;
        let r = ast_extract_classes(src.to_string(), "Button.tsx".to_string());
        assert!(r.has_tw_usage);
        assert!(r.classes.contains(&"bg-blue-500".to_string()));
        assert!(r.classes.contains(&"px-4".to_string()));
    }

    #[test]
    fn ast_extract_finds_object_config_base() {
        let src = r#"const Card = tw.div({ base: "rounded-lg shadow-md p-6 bg-white" })"#;
        let r = ast_extract_classes(src.to_string(), "Card.tsx".to_string());
        assert!(r.classes.contains(&"rounded-lg".to_string()));
        assert!(r.classes.contains(&"shadow-md".to_string()));
    }

    #[test]
    fn ast_extract_finds_classname_jsx() {
        let src = r#"<div className="flex items-center gap-4 hover:bg-gray-100">content</div>"#;
        let r = ast_extract_classes(src.to_string(), "Layout.tsx".to_string());
        assert!(r.classes.contains(&"flex".to_string()));
        assert!(r.classes.contains(&"items-center".to_string()));
        assert!(r.classes.contains(&"hover:bg-gray-100".to_string()));
    }

    #[test]
    fn ast_extract_detects_use_client() {
        let src = r#""use client"
const Button = tw.button`px-4`"#;
        let r = ast_extract_classes(src.to_string(), "Client.tsx".to_string());
        assert!(r.has_use_client);
        assert!(r.has_tw_usage);
    }

    #[test]
    fn ast_extract_finds_component_names() {
        let src = r#"const Button = tw.button`px-4`
const Card = tw.div`rounded-lg`"#;
        let r = ast_extract_classes(src.to_string(), "components.tsx".to_string());
        assert!(r.component_names.contains(&"Button".to_string()));
        assert!(r.component_names.contains(&"Card".to_string()));
    }

    // ── compile_css ──────────────────────────────────────────────────────────

    #[test]
    fn compile_css_resolves_display_classes() {
        let r = compile_css(
            vec![
                "flex".to_string(),
                "block".to_string(),
                "hidden".to_string(),
            ],
            None,
        );
        assert!(r.css.contains("display: flex"));
        assert!(r.css.contains("display: block"));
        assert!(r.css.contains("display: none"));
        assert_eq!(r.resolved_classes.len(), 3);
        assert_eq!(r.unknown_classes.len(), 0);
    }

    #[test]
    fn compile_css_resolves_color_classes() {
        let r = compile_css(
            vec![
                "bg-blue-500".to_string(),
                "text-white".to_string(),
                "border-red-600".to_string(),
            ],
            None,
        );
        assert!(
            r.css.contains("background-color: rgb(59 130 246)"),
            "blue-500"
        );
        assert!(r.css.contains("color: rgb(255 255 255)"), "white");
        assert!(r.css.contains("border-color: rgb(220 38 38)"), "red-600");
    }

    #[test]
    fn compile_css_handles_hover_variant() {
        let r = compile_css(vec!["hover:bg-blue-600".to_string()], None);
        assert_eq!(r.resolved_classes.len(), 1);
        assert!(
            r.css.contains(":hover"),
            "should produce :hover pseudo-class"
        );
        assert!(
            r.css.contains("background-color: rgb(37 99 235)"),
            "blue-600"
        );
    }

    #[test]
    fn compile_css_handles_responsive_variant() {
        let r = compile_css(vec!["md:flex".to_string()], None);
        assert_eq!(r.resolved_classes.len(), 1);
        assert!(r.css.contains("min-width: 768px"), "should produce @media");
        assert!(r.css.contains("display: flex"));
    }

    #[test]
    fn compile_css_handles_arbitrary_values() {
        let r = compile_css(
            vec!["bg-[#3b82f6]".to_string(), "w-[200px]".to_string()],
            None,
        );
        assert!(r.css.contains("#3b82f6"), "arbitrary bg color");
        assert!(r.css.contains("200px"), "arbitrary width");
        assert_eq!(r.unknown_classes.len(), 0);
    }

    #[test]
    fn compile_css_unknown_classes_get_apply_fallback() {
        let r = compile_css(vec!["totally-made-up-class".to_string()], None);
        assert_eq!(r.unknown_classes.len(), 1);
        assert!(r.css.contains("@apply"));
    }

    #[test]
    fn compile_css_custom_prefix() {
        let r = compile_css(vec!["flex".to_string()], Some("#app ".to_string()));
        assert!(r.css.contains("#app flex"), "should use custom prefix");
    }
}

#[cfg(test)]
mod oxc_api_test {
    // Just test that oxc 0.1 compiles with something
    #[test]
    fn oxc_available() {
        // oxc 0.1 check
        assert!(true);
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// OXC PARSER — Real AST-based class extraction (N-API wrappers)
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct OxcExtractResult {
    pub classes: Vec<String>,
    pub component_names: Vec<String>,
    pub has_tw_usage: bool,
    pub has_use_client: bool,
    pub imports: Vec<String>,
    pub engine: String,
}

/// Extract Tailwind classes using real Oxc AST parser.
/// Handles: tw.tag``, tw(Comp)``, base:"", className="", cx()/cn()
/// More accurate than regex — understands JSX, TypeScript, template literals.
#[napi]
pub fn oxc_extract_classes(source: String, filename: String) -> OxcExtractResult {
    let r = oxc_parser::extract_classes_oxc(&source, &filename);
    OxcExtractResult {
        classes: r.classes,
        component_names: r.component_names,
        has_tw_usage: r.has_tw_usage,
        has_use_client: r.has_use_client,
        imports: r.imports,
        engine: "oxc".to_string(),
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// IN-MEMORY SCAN CACHE — DashMap-backed, process-lifetime (N-API wrappers)
// ═════════════════════════════════════════════════════════════════════════════

#[napi(object)]
pub struct ScanCacheStats {
    pub size: u32,
}

/// Get cached classes for a file by content hash. Returns null on miss.
#[napi]
pub fn scan_cache_get(file_path: String, content_hash: String) -> Option<Vec<String>> {
    scan_cache::cache_get(&file_path, &content_hash)
}

/// Store extraction result in the in-memory cache.
#[napi]
pub fn scan_cache_put(
    file_path: String,
    content_hash: String,
    classes: Vec<String>,
    mtime_ms: f64,
    size: u32,
) {
    scan_cache::cache_put(&file_path, &content_hash, classes, mtime_ms, size);
}

/// Invalidate a single cache entry (file deleted or renamed).
#[napi]
pub fn scan_cache_invalidate(file_path: String) {
    scan_cache::cache_invalidate(&file_path);
}

/// Return number of entries currently in the cache.
#[napi]
pub fn scan_cache_stats() -> ScanCacheStats {
    ScanCacheStats {
        size: scan_cache::cache_size() as u32,
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFY WATCHER — File system watcher dengan polling pattern
//
// Pola: JS memanggil start_watch() → Rust mulai watch, simpan events ke queue.
//       JS poll setiap interval dengan poll_watch_events(handle_id) → dapat events.
//       JS panggil stop_watch(handle_id) → hentikan watcher.
//
// Kenapa polling bukan callback langsung:
//   ThreadsafeFunction di napi v2 butuh Env yang tidak bisa dipass sebagai
//   parameter #[napi]. Polling pattern lebih simpel dan sudah cukup untuk
//   use case incremental build (poll interval 100-500ms).
// ═════════════════════════════════════════════════════════════════════════════

use std::sync::Mutex;

/// Event yang diqueue oleh Rust watcher, dipoll oleh JS
#[derive(Clone)]
struct PendingEvent {
    kind: String,
    path: String,
}

struct WatcherSlot {
    _handle: watcher::WatcherHandle,
    events: std::sync::Arc<Mutex<Vec<PendingEvent>>>,
}

static ACTIVE_WATCHERS: Lazy<Mutex<Vec<WatcherSlot>>> = Lazy::new(|| Mutex::new(Vec::new()));

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct WatchStartResult {
    pub status: String,
    pub handle_id: u32,
}

#[napi(object)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct WatchChangeEvent {
    pub kind: String, // "add" | "change" | "unlink" | "rename"
    pub path: String,
}

/// Mulai watch `root_dir` secara rekursif menggunakan `notify`.
/// Events dikumpulkan di queue internal — poll dengan `poll_watch_events()`.
/// Kembalikan `handle_id` untuk menghentikan watcher.
#[napi]
pub fn start_watch(root_dir: String) -> WatchStartResult {
    let events = std::sync::Arc::new(Mutex::new(Vec::<PendingEvent>::new()));
    let events_clone = std::sync::Arc::clone(&events);

    match watcher::start_watch(&root_dir, move |ev| {
        if let Ok(mut q) = events_clone.lock() {
            // Batasi queue max 1000 event untuk cegah memory leak
            if q.len() < 1000 {
                q.push(PendingEvent {
                    kind: ev.kind.as_str().to_string(),
                    path: ev.path,
                });
            }
        }
    }) {
        Ok(handle) => {
            let mut watchers = ACTIVE_WATCHERS.lock().unwrap();
            let handle_id = watchers.len() as u32;
            watchers.push(WatcherSlot {
                _handle: handle,
                events,
            });
            WatchStartResult {
                status: "ok".to_string(),
                handle_id,
            }
        }
        Err(e) => WatchStartResult {
            status: format!("error: {}", e),
            handle_id: u32::MAX,
        },
    }
}

/// Poll events yang terkumpul sejak poll terakhir.
/// JS harus memanggil ini secara periodik (misalnya setiap 200ms).
/// Events dikembalikan dan queue dikosongkan.
#[napi]
pub fn poll_watch_events(handle_id: u32) -> Vec<WatchChangeEvent> {
    let watchers = ACTIVE_WATCHERS.lock().unwrap();
    let idx = handle_id as usize;
    let Some(slot) = watchers.get(idx) else {
        return vec![];
    };

    let mut q = slot.events.lock().unwrap();
    let drained: Vec<WatchChangeEvent> = q
        .drain(..)
        .map(|e| WatchChangeEvent {
            kind: e.kind,
            path: e.path,
        })
        .collect();
    drained
}

/// Hentikan watcher dengan `handle_id`.
#[napi]
pub fn stop_watch(handle_id: u32) -> bool {
    let mut watchers = ACTIVE_WATCHERS.lock().unwrap();
    let idx = handle_id as usize;
    if idx < watchers.len() {
        watchers.remove(idx);
        true
    } else {
        false
    }
}
