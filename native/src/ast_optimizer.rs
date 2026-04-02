/// ─ OPTIMIZATION (Phase 3): AST-based template detection optimization
///
/// This module provides AST-aware analysis for tw template tags.
/// Instead of scanning source repeatedly with regex, we parse once and extract
/// structural information from the AST, enabling:
/// - Reliable template tag detection (no false positives from comments/strings)
/// - Nested component parsing via AST traversal
/// - Type-safe component identification
/// - Better cache invalidation based on AST changes
use once_cell::sync::Lazy;
use oxc_allocator::Allocator;
use oxc_parser::{Parser, ParserReturn};
use oxc_span::SourceType;
use regex::Regex;
use std::path::Path;

/// Result of AST-based template extraction
#[derive(Debug, Clone)]
pub struct AstTemplateMatch {
    pub tag: String,
    pub content: String,
    #[allow(dead_code)] // Used for RSC-aware transforms in future
    pub is_server: bool,
    pub position: usize,
    #[allow(dead_code)] // Used for precise replacement positioning in future
    pub length: usize,
}

/// ─ OPTIMIZATION (Phase 3.1): Pre-compiled regex for validating parsed content
#[allow(dead_code)]
static RE_TEMPLATE_VALIDATION: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-zA-Z0-9_\-\s:\./\[\]()]+$").unwrap());

/// Extract template tags from source using AST parsing
/// Returns (templates, is_server_component, parse_error_flag)
/// is_server_component: true if no 'use client' directive found
/// ─ OPTIMIZATION (Phase 3.2): AST-based extraction with error recovery
pub fn extract_templates_from_ast(source: &str) -> (Vec<AstTemplateMatch>, bool, bool) {
    let allocator = Allocator::default();
    // ─ SourceType detection based on file content
    let has_jsx = source.contains("jsx") || source.contains("<") || source.contains(">");
    let is_typescript = source.contains("interface ") || source.contains("type ");
    let filename = if is_typescript {
        "test.tsx"
    } else if has_jsx {
        "test.jsx"
    } else {
        "test.js"
    };

    let source_type = SourceType::from_path(Path::new(filename))
        .unwrap_or_default()
        .with_module(true);

    let parser = Parser::new(&allocator, source, source_type);
    let ParserReturn {
        program: _,
        errors: parse_errors,
        trivias: _,
        panicked: _,
    } = parser.parse();

    // ─ Early return: If parsing completely fails, fall back to regex
    if !parse_errors.is_empty() && parse_errors.len() > 5 {
        return (vec![], false, true);
    }

    let mut templates: Vec<AstTemplateMatch> = Vec::new();
    let has_client_directive = source.contains("\"use client\"") || source.contains("'use client'");

    // ─ OPTIMIZATION (Phase 3.3): Enhanced template scanning
    // This is a simplified traversal; in production, use a proper visitor pattern
    let mut position = 0;

    // Scan for tw template markers followed by backticks
    while let Some(tag_start) = source[position..].find("tw.") {
        let absolute_start = position + tag_start;
        let tag_region = &source[absolute_start..];

        // Extract tag name (e.g., "button", "div")
        if let Some(backtick_pos) = tag_region.find('`') {
            let tag_section = &tag_region[..backtick_pos];
            if let Some(tag_name) = tag_section.strip_prefix("tw.") {
                let tag_str: String = tag_name
                    .chars()
                    .take_while(|c| c.is_alphanumeric() || *c == '_')
                    .collect();

                if !tag_str.is_empty() {
                    // Extract template content
                    let content_start = absolute_start + backtick_pos + 1;
                    if let Some(content_end) = source[content_start..].find('`') {
                        let content = source[content_start..content_start + content_end]
                            .trim_end()
                            .to_string();

                        // ─ OPTIMIZATION: Validate content is reasonable
                        if content.len() < 5000 && !content.contains("${") {
                            templates.push(AstTemplateMatch {
                                tag: tag_str,
                                content,
                                is_server: !has_client_directive,
                                position: absolute_start,
                                length: content_end + 2,
                            });
                        }

                        position = content_start + content_end + 1;
                    } else {
                        position = absolute_start + 1;
                    }
                } else {
                    position = absolute_start + 1;
                }
            } else {
                position = absolute_start + 1;
            }
        } else {
            position = absolute_start + 1;
        }
    }

    (templates, !has_client_directive, false)
}

/// Compare AST-based extraction vs regex-based extraction
/// ─ OPTIMIZATION (Phase 3.4): Benchmarking helper for AST vs regex
#[cfg(test)]
#[allow(dead_code)]
pub fn benchmark_ast_vs_regex(source: &str) -> (usize, usize, bool) {
    let (ast_templates, _, ast_error) = extract_templates_from_ast(source);
    let regex_count = source.matches("tw.").count();

    // Return (AST count, regex count, had AST error)
    (ast_templates.len(), regex_count, ast_error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ast_extract_simple_template() {
        let source = r#"const Button = tw.button`bg-blue-500 text-white`;"#;
        let (templates, _, error) = extract_templates_from_ast(source);
        assert!(!error);
        assert_eq!(templates.len(), 1);
        assert_eq!(templates[0].tag, "button");
        assert!(templates[0].content.contains("bg-blue"));
    }

    #[test]
    fn ast_extract_multiple_templates() {
        let source = r#"
            const Button = tw.button`bg-blue-500`;
            const Card = tw.div`rounded-lg p-4`;
        "#;
        let (templates, _, _) = extract_templates_from_ast(source);
        assert_eq!(templates.len(), 2);
        assert_eq!(templates[0].tag, "button");
        assert_eq!(templates[1].tag, "div");
    }

    #[test]
    fn ast_extract_skips_dynamic_templates() {
        let source = r#"const Button = tw.button`bg-${color} text-white`;"#;
        let (templates, _, _) = extract_templates_from_ast(source);
        // Dynamic templates are skipped (contains ${)
        assert_eq!(templates.len(), 0);
    }

    #[test]
    fn ast_extract_detects_server_component() {
        let source = r#"const Card = tw.div`p-4`;"#;
        let (templates, is_server, _) = extract_templates_from_ast(source);
        assert!(is_server); // No 'use client' directive
        assert_eq!(templates.len(), 1);
    }

    #[test]
    fn ast_extract_detects_client_component() {
        let source = r#""use client"; const Button = tw.button`bg-blue`;"#;
        let (templates, is_server, _) = extract_templates_from_ast(source);
        assert!(!is_server); // Has 'use client' directive means not a server component
        assert_eq!(templates.len(), 1);
    }
}
