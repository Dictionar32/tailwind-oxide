/**
 * tailwind-styled-v4 — twDetector
 *
 * Regex-based detector untuk semua syntax tw yang valid.
 * Dipakai sebelum transform — jika tidak ada tw usage, skip file.
 *
 * FIXED: trailing space bug di TEMPLATE_RE (#02)
 */

import { getNativeBridge } from "./nativeBridge"

/** tw.div`...` — FIX: removed trailing space before /g */
export const TEMPLATE_RE = /\btw\.(server\.)?(\w+)`((?:[^`\\]|\\.)*)`/g

/** tw.div({ base: "...", variants: {...} }) */
export const OBJECT_RE = /\btw\.(server\.)?(\w+)\(\s*(\{[\s\S]*?\})\s*\)/g

/** tw(Component)`...` */
export const WRAP_RE = /\btw\((\w+)\)`((?:[^`\\]|\\.)*)`/g

/** Card.extend`...` */
export const EXTEND_RE = /(\w+)\.extend`((?:[^`\\]|\\.)*)`/g

/** Transform already-applied marker — idempotency guard (#08) */
export const TRANSFORM_MARKER = "/* @tw-transformed */"

export function hasTwUsage(source: string): boolean {
  const native = getNativeBridge()
  if (!native?.hasTwUsageNative) {
    throw new Error("Native binding 'hasTwUsageNative' is required but not available.")
  }
  return native.hasTwUsageNative(source)
}

/** Check if file was already transformed — prevents double processing (#08) */
export function isAlreadyTransformed(source: string): boolean {
  const native = getNativeBridge()
  if (!native?.isAlreadyTransformedNative) {
    throw new Error("Native binding 'isAlreadyTransformedNative' is required but not available.")
  }
  return native.isAlreadyTransformedNative(source)
}

export function isTwTemplateLiteral(source: string, index: number): boolean {
  const before = source.slice(Math.max(0, index - 20), index)
  return /\btw\.\w+$/.test(before) || /\btw\(\w+\)$/.test(before)
}

export function isDynamic(content: string): boolean {
  return content.includes("${")
}

export function isServerComponent(source: string): boolean {
  return !source.includes('"use client"') && !source.includes("'use client'")
}

export function hasInteractiveFeatures(content: string): boolean {
  return /\b(hover:|focus:|active:|group-hover:|peer-|on[A-Z]|useState|useEffect|useRef)\b/.test(
    content
  )
}
