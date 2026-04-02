//! Oxc AST parser untuk informasi struktural + regex untuk class extraction.
//!
//! Strategi hybrid yang proven:
//! - Oxc TSX pass: component names, imports, "use client"
//! - Regex (extract_classes_from_source): class extraction dari semua pola tw.*
//!
//! Ini menghindari keterbatasan Oxc 0.1.3 yang tidak bisa parse
//! JSX + tagged template literals bersamaan.

use once_cell::sync::Lazy;
use oxc_allocator::Allocator;
use oxc_ast::{ast::*, Visit};
use oxc_parser::Parser;
use oxc_span::SourceType;
use regex::Regex;
use std::path::Path;

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Default)]
pub struct OxcExtractResult {
    pub classes: Vec<String>,
    pub component_names: Vec<String>,
    pub has_tw_usage: bool,
    pub has_use_client: bool,
    pub imports: Vec<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Visitor struktural (TSX pass) — hanya ambil nama komponen + imports
// ─────────────────────────────────────────────────────────────────────────────

struct StructuralVisitor {
    component_names: Vec<String>,
    imports: Vec<String>,
    has_use_client: bool,
}

impl StructuralVisitor {
    fn new() -> Self {
        Self {
            component_names: Vec::new(),
            imports: Vec::new(),
            has_use_client: false,
        }
    }

    fn is_tw(expr: &Expression) -> bool {
        match expr {
            Expression::MemberExpression(me) => match me.object() {
                Expression::Identifier(id) => id.name == "tw",
                Expression::MemberExpression(inner) => {
                    matches!(inner.object(), Expression::Identifier(id) if id.name == "tw")
                }
                _ => false,
            },
            Expression::CallExpression(ce) => {
                matches!(&ce.callee, Expression::Identifier(id) if id.name == "tw")
            }
            _ => false,
        }
    }
}

impl<'a> Visit<'a> for StructuralVisitor {
    fn visit_directive(&mut self, dir: &Directive) {
        if dir.expression.value == "use client" {
            self.has_use_client = true;
        }
    }

    fn visit_import_declaration(&mut self, decl: &'a ImportDeclaration<'a>) {
        self.imports.push(decl.source.value.to_string());
        for spec in &decl.specifiers {
            self.visit_import_declaration_specifier(spec);
        }
    }

    fn visit_variable_declarator(&mut self, decl: &'a VariableDeclarator<'a>) {
        if let BindingPatternKind::BindingIdentifier(id) = &decl.id.kind {
            if let Some(init) = &decl.init {
                let is_tw = matches!(init,
                    Expression::TaggedTemplateExpression(t) if Self::is_tw(&t.tag)
                ) || matches!(init,
                    Expression::CallExpression(c) if Self::is_tw(&c.callee)
                );
                if is_tw {
                    self.component_names.push(id.name.to_string());
                }
            }
        }
        if let Some(init) = &decl.init {
            self.visit_expression(init);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Regex-based class extractor (proven reliable, handles mixed JSX + templates)
// ─────────────────────────────────────────────────────────────────────────────

/// Regex patterns untuk semua cara kelas Tailwind bisa ditulis
static RE_TW_TEMPLATE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?s)\btw(?:\.server)?\.(?:\w+)`([^`]*)`").unwrap());
static RE_TW_WRAP: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)\btw\(\w+\)`([^`]*)`").unwrap());
static RE_BASE_FIELD: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"base\s*:\s*["'`]([^"'`]+)["'`]"#).unwrap());
static RE_VARIANTS_LEAF: Lazy<Regex> = Lazy::new(|| {
    // Match any key: "value" pattern in variant objects — filtered by is_tw_class downstream
    Regex::new(r#"\w+\s*:\s*["'`]([^"'`]+)["'`]"#).unwrap()
});
static RE_CLASSNAME: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"(?:className|class)=["']([^"']+)["']"#).unwrap());
// Tangkap SEMUA string literals di dalam cx/cn/clsx/twMerge call (multi-arg)
static RE_CX_CALL: Lazy<Regex> =
    Lazy::new(|| Regex::new(r#"\b(?:cx|cn|clsx|classnames|twMerge)\([^)]+\)"#).unwrap());
// Sub-pattern untuk ekstrak setiap string literal di dalam call args
static RE_STRING_ARG: Lazy<Regex> = Lazy::new(|| Regex::new(r#"["']([^"']+)["']"#).unwrap());

fn extract_classes_regex(source: &str) -> Vec<String> {
    let mut raw: Vec<String> = Vec::new();

    let push = |raw: &mut Vec<String>, s: &str| {
        for t in s.split_whitespace() {
            let t = t.trim();
            if !t.is_empty() && !t.ends_with('{') && t != "}" {
                raw.push(t.to_string());
            }
        }
    };

    // tw.div`classes` dan tw.server.div`classes`
    for cap in RE_TW_TEMPLATE.captures_iter(source) {
        let content = &cap[1];
        // Skip dynamic (${...})
        if !content.contains("${") {
            push(&mut raw, content);
        }
    }

    // tw(Component)`classes`
    for cap in RE_TW_WRAP.captures_iter(source) {
        let content = &cap[1];
        if !content.contains("${") {
            push(&mut raw, content);
        }
    }

    // base: "classes"
    for cap in RE_BASE_FIELD.captures_iter(source) {
        push(&mut raw, &cap[1]);
    }

    // variant leaf values (heuristic — ambil string pendek di dalam objek)
    for cap in RE_VARIANTS_LEAF.captures_iter(source) {
        let val = &cap[1];
        // Hanya ambil jika terlihat seperti kumpulan kelas Tailwind
        if val.len() < 200 && (val.contains('-') || val.contains(':')) {
            push(&mut raw, val);
        }
    }

    // className="classes" dan class="classes"
    for cap in RE_CLASSNAME.captures_iter(source) {
        push(&mut raw, &cap[1]);
    }

    // cx("a", "b") / cn("a", "b") / clsx("a", "b") / twMerge("a", "b")
    // RE_CX_CALL menangkap seluruh call, RE_STRING_ARG ekstrak tiap string arg
    for call_cap in RE_CX_CALL.captures_iter(source) {
        let call_text = &call_cap[0];
        for str_cap in RE_STRING_ARG.captures_iter(call_text) {
            push(&mut raw, &str_cap[1]);
        }
    }

    raw
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter Tailwind class
// ─────────────────────────────────────────────────────────────────────────────

fn is_tw_class(c: &str) -> bool {
    // Kelas dengan separator selalu Tailwind
    if c.contains('-') || c.contains(':') || c.contains('[') {
        return true;
    }
    // Single-word Tailwind utilities yang valid
    matches!(
        c,
        // Layout
        "flex" | "grid" | "block" | "inline" | "hidden" | "contents" | "table" |
        "static" | "fixed" | "absolute" | "relative" | "sticky" |
        "overflow" | "truncate" | "container" | "float" | "clear" |
        // Typography
        "italic" | "underline" | "uppercase" | "lowercase" | "capitalize" |
        "overline" | "antialiased" | "subpixel" | "ordinal" | "slashed" |
        // Visibility
        "visible" | "invisible" | "collapse" | "prose" |
        // Flexbox / Grid
        "grow" | "shrink" | "wrap" | "nowrap" |
        // Borders
        "rounded" | "border" | "outline" | "ring" | "shadow" | "divide" |
        // Interactivity
        "cursor" | "pointer" | "select" | "resize" |
        // Spacing
        "space" |
        // Colors (single word used as modifier)
        "transparent" | "current" | "inherit" |
        // Misc
        "transform" | "transition" | "animate" | "appearance" | "placeholder" |
        "sr" | "not" | "peer" | "group" | "dark" | "motion"
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// AST pass (struktural info saja, TSX mode)
// ─────────────────────────────────────────────────────────────────────────────

fn run_structural_pass(source: &str) -> (Vec<String>, bool, Vec<String>) {
    // Strip standalone JSX elements (top-level JSX menyebabkan parse error di Oxc 0.1.3)
    // Regex ini menghapus baris yang HANYA berisi JSX element (<Tag ...>...</Tag>)
    static RE_JSX_LINE: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"(?m)^[ \t]*<[A-Za-z][^>]*>.*</[A-Za-z]+>[ \t]*$").unwrap());
    static RE_JSX_SELF: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"(?m)^[ \t]*<[A-Za-z][^>]*/?>[ \t]*$").unwrap());

    let cleaned = RE_JSX_LINE.replace_all(source, "");
    let cleaned = RE_JSX_SELF.replace_all(&cleaned, "");

    let allocator = Allocator::default();
    let st = SourceType::from_path(Path::new("file.tsx"))
        .unwrap_or_default()
        .with_module(true);
    let ret = Parser::new(&allocator, &cleaned, st).parse();

    let mut v = StructuralVisitor::new();
    // SAFETY: All data extracted by the visitor is owned String,
    // no references to the AST escape this function.
    // The allocator lives alongside ret, so the borrow is valid for the function scope.
    let prog: &Program = unsafe { &*(&ret.program as *const Program) };
    v.visit_program(prog);
    drop(ret);

    (v.component_names, v.has_use_client, v.imports)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

pub fn extract_classes_oxc(source: &str, _filename: &str) -> OxcExtractResult {
    // Pass 1: AST struktural (Oxc TSX) — nama komponen, imports, "use client"
    let (component_names, has_use_client, imports) = run_structural_pass(source);

    // Pass 2: Regex class extraction — proven, handles mixed JSX + templates
    let raw_classes = extract_classes_regex(source);

    // Text-level has_tw_usage detection
    let has_tw_usage = source.contains("tw.")
        || source.contains("from \"tailwind-styled")
        || source.contains("from 'tailwind-styled");

    // Dedup + filter
    let mut seen = std::collections::HashSet::new();
    let mut classes: Vec<String> = raw_classes
        .into_iter()
        .filter(|c| is_tw_class(c) && seen.insert(c.clone()))
        .collect();
    classes.sort();

    OxcExtractResult {
        classes,
        component_names,
        has_tw_usage,
        has_use_client,
        imports,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tagged_template() {
        let r = extract_classes_oxc(
            "const Button = tw.button`bg-blue-500 text-white px-4`",
            "Button.tsx",
        );
        assert!(
            r.classes.contains(&"bg-blue-500".to_string()),
            "{:?}",
            r.classes
        );
        assert!(r.classes.contains(&"px-4".to_string()));
        assert!(r.has_tw_usage);
        assert!(r.component_names.contains(&"Button".to_string()));
    }

    #[test]
    fn object_config() {
        let r = extract_classes_oxc(
            r#"const C = tw.div({ base: "rounded-lg p-4", variants: { s: { sm: "text-sm" } } })"#,
            "C.tsx",
        );
        assert!(
            r.classes.contains(&"rounded-lg".to_string()),
            "{:?}",
            r.classes
        );
        assert!(r.classes.contains(&"text-sm".to_string()));
    }

    #[test]
    fn jsx_classname() {
        let r = extract_classes_oxc(
            r#"<div className="flex items-center hover:bg-gray-100">ok</div>"#,
            "x.tsx",
        );
        assert!(r.classes.contains(&"flex".to_string()), "{:?}", r.classes);
        assert!(r.classes.contains(&"hover:bg-gray-100".to_string()));
    }

    #[test]
    fn use_client() {
        let r = extract_classes_oxc("\"use client\"\nconst X = tw.div`p-4`", "c.tsx");
        assert!(r.has_use_client, "use client tidak terdeteksi");
        assert!(r.classes.contains(&"p-4".to_string()));
    }

    #[test]
    fn imports() {
        let r = extract_classes_oxc(r#"import { tw } from "tailwind-styled-v4""#, "x.ts");
        assert!(r.imports.contains(&"tailwind-styled-v4".to_string()));
    }

    #[test]
    fn mixed_template_and_jsx() {
        let src = [
            "\"use client\"",
            "import { tw } from \"tailwind-styled-v4\"",
            "import React from \"react\"",
            "const Button = tw.button`bg-blue-500 text-white px-4 hover:bg-blue-600`",
            "const Card = tw.div({ base: \"rounded-lg shadow-md\", variants: { s: { sm: \"text-sm\" } } })",
            "<div className=\"flex items-center gap-4\">ok</div>",
        ].join("\n");

        let r = extract_classes_oxc(&src, "x.tsx");

        assert!(
            r.classes.contains(&"bg-blue-500".to_string()),
            "template: {:?}",
            r.classes
        );
        assert!(
            r.classes.contains(&"hover:bg-blue-600".to_string()),
            "hover: {:?}",
            r.classes
        );
        assert!(
            r.classes.contains(&"rounded-lg".to_string()),
            "base: {:?}",
            r.classes
        );
        assert!(
            r.classes.contains(&"text-sm".to_string()),
            "variants: {:?}",
            r.classes
        );
        assert!(
            r.classes.contains(&"flex".to_string()),
            "jsx: {:?}",
            r.classes
        );
        assert!(
            r.classes.contains(&"items-center".to_string()),
            "jsx2: {:?}",
            r.classes
        );
        assert!(r.has_use_client, "use client");
        assert!(r.has_tw_usage, "has_tw_usage");
        assert!(
            r.component_names.contains(&"Button".to_string()),
            "names: {:?}",
            r.component_names
        );
        assert!(
            r.component_names.contains(&"Card".to_string()),
            "card: {:?}",
            r.component_names
        );
        assert!(
            r.imports.contains(&"tailwind-styled-v4".to_string()),
            "imports: {:?}",
            r.imports
        );
    }

    #[test]
    fn dynamic_template_no_panic() {
        let r = extract_classes_oxc("const X = tw.div`${cond} flex`", "x.tsx");
        assert!(r.has_tw_usage);
        // Dynamic template — flex tidak diextract (ada ${...})
        // Tapi tidak panic
    }

    #[test]
    fn tw_server_dot() {
        let r = extract_classes_oxc("const X = tw.server.div`bg-white text-gray-900`", "x.tsx");
        assert!(
            r.classes.contains(&"bg-white".to_string()),
            "{:?}",
            r.classes
        );
        assert!(r.classes.contains(&"text-gray-900".to_string()));
    }
}

#[test]
fn debug_mixed_output() {
    let src = [
        "\"use client\"",
        "import { tw } from \"tailwind-styled-v4\"",
        "import React from \"react\"",
        "const Button = tw.button`bg-blue-500 text-white px-4 hover:bg-blue-600`",
        "const Card = tw.div({ base: \"rounded-lg shadow-md\", variants: { s: { sm: \"text-sm\" } } })",
        "<div className=\"flex items-center gap-4\">ok</div>",
    ].join("\n");

    let r = extract_classes_oxc(&src, "x.tsx");
    println!("classes: {:?}", r.classes);
    println!("component_names: {:?}", r.component_names);
    println!("has_use_client: {}", r.has_use_client);
    println!("imports: {:?}", r.imports);

    // Tunjukkan raw regex output
    let raw = extract_classes_regex(&src);
    println!("raw regex classes: {:?}", raw);
}

#[test]
fn debug_structural_pass() {
    let src = [
        "\"use client\"",
        "import { tw } from \"tailwind-styled-v4\"",
        "import React from \"react\"",
        "const Button = tw.button`bg-blue-500`",
        "const Card = tw.div({ base: \"rounded-lg\" })",
        "<div className=\"flex\">ok</div>",
    ]
    .join("\n");

    use oxc_allocator::Allocator;
    use oxc_parser::Parser;
    use oxc_span::SourceType;
    use std::path::Path;

    let allocator = Allocator::default();
    let st = SourceType::from_path(Path::new("file.tsx"))
        .unwrap_or_default()
        .with_module(true);
    let ret = Parser::new(&allocator, &src, st).parse();
    println!("parse errors: {}", ret.errors.len());
    println!("stmts: {}", ret.program.body.len());
    println!("directives: {}", ret.program.directives.len());

    // Cek apakah file tsx bisa parse source ini
    let (names, use_client, imports) = run_structural_pass(&src);
    println!("names: {:?}", names);
    println!("use_client: {}", use_client);
    println!("imports: {:?}", imports);
}

#[test]
fn debug_parse_error_detail() {
    let src = [
        "\"use client\"",
        "import { tw } from \"tailwind-styled-v4\"",
        "const Button = tw.button`bg-blue-500`",
        "<div className=\"flex\">ok</div>",
    ]
    .join("\n");

    use oxc_allocator::Allocator;
    use oxc_parser::Parser;
    use oxc_span::SourceType;
    use std::path::Path;

    // TSX mode
    let alloc1 = Allocator::default();
    let st_tsx = SourceType::from_path(Path::new("file.tsx"))
        .unwrap()
        .with_module(true);
    let ret1 = Parser::new(&alloc1, &src, st_tsx).parse();
    println!(
        "TSX: errors={} stmts={}",
        ret1.errors.len(),
        ret1.program.body.len()
    );

    // Tanpa JSX di akhir
    let src_no_jsx = [
        "\"use client\"",
        "import { tw } from \"tailwind-styled-v4\"",
        "const Button = tw.button`bg-blue-500`",
    ]
    .join("\n");

    let alloc2 = Allocator::default();
    let ret2 = Parser::new(&alloc2, &src_no_jsx, st_tsx).parse();
    println!(
        "TSX no JSX: errors={} stmts={} directives={}",
        ret2.errors.len(),
        ret2.program.body.len(),
        ret2.program.directives.len()
    );

    // Dengan React import
    let src_with_react = [
        "\"use client\"",
        "import React from \"react\"",
        "import { tw } from \"tailwind-styled-v4\"",
        "const Button = tw.button`bg-blue-500`",
        "export default function App() { return <div className=\"flex\">ok</div> }",
    ]
    .join("\n");

    let alloc3 = Allocator::default();
    let ret3 = Parser::new(&alloc3, &src_with_react, st_tsx).parse();
    println!(
        "TSX with func: errors={} stmts={}",
        ret3.errors.len(),
        ret3.program.body.len()
    );
}

#[test]
fn twmerge_multi_arg() {
    let src = "import { twMerge } from 'tailwind-merge'\nexport const cls = twMerge('px-4 py-2', 'bg-blue-500')";
    let r = extract_classes_oxc(src, "x.tsx");
    assert!(
        r.classes.contains(&"px-4".to_string()),
        "px-4 missing: {:?}",
        r.classes
    );
    assert!(
        r.classes.contains(&"bg-blue-500".to_string()),
        "bg-blue-500 missing: {:?}",
        r.classes
    );
}

#[test]
fn cn_multi_arg() {
    let src = "const cls = cn('flex items-center', 'gap-2 p-4')";
    let r = extract_classes_oxc(src, "x.tsx");
    assert!(
        r.classes.contains(&"flex".to_string()),
        "flex missing: {:?}",
        r.classes
    );
    assert!(
        r.classes.contains(&"gap-2".to_string()),
        "gap-2 missing: {:?}",
        r.classes
    );
}
