/**
 * tailwind-styled-v4 — classExtractor
 *
 * FIX #02: Remove .slice(0, -1) workaround for broken TEMPLATE_RE.
 * TEMPLATE_RE trailing space is now fixed in twDetector.ts.
 *
 * Ekstrak semua Tailwind class dari source untuk safelist generation.
 */

import {
  extractAllClasses as extractClassesFromSyntax,
  parseClasses,
} from "@tailwind-styled/syntax"
import { parseComponentConfig } from "./astParser"
import { EXTEND_RE, OBJECT_RE, TEMPLATE_RE } from "./twDetector"

const _TEMPLATE_SCAN_RE = new RegExp(TEMPLATE_RE.source, "g")
const _OBJECT_SCAN_RE = new RegExp(OBJECT_RE.source, "g")
const _EXTEND_SCAN_RE = new RegExp(EXTEND_RE.source, "g")
const _CLASS_NAME_RE = /className\s*=\s*["']([^"']+)["']/g

function _resetRegex(regex: RegExp): void {
  regex.lastIndex = 0
}

/**
 * Extract all Tailwind classes from source code.
 *
 * v5 CHANGE: Now THROWS if native binding is unavailable.
 * Previously fell back to JS implementation.
 *
 * @param source - Source code to extract classes from
 * @returns Array of unique class names (sorted)
 * @throws Error if native binding is not available
 */
export function extractAllClasses(source: string): string[] {
  return extractClassesFromSyntax(source)
}

export { parseClasses }
// Re-export for backward compat — now use parseComponentConfig from astParser
export function extractBaseFromObject(objectStr: string): string {
  return parseComponentConfig(objectStr).base
}
export function extractVariantsFromObject(
  objectStr: string
): Record<string, Record<string, string>> {
  return parseComponentConfig(objectStr).variants
}
