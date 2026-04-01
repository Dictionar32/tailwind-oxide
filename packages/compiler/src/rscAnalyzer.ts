/**
 * tailwind-styled-v4 — RSC Analyzer
 */

export type ComponentEnv = "server" | "client" | "auto"

export interface RscAnalysis {
  isServer: boolean
  needsClientDirective: boolean
  clientReasons: string[]
  interactiveClasses: string[]
  canStaticResolveVariants: boolean
}

export interface StaticVariantUsage {
  resolved: Record<string, string>
  dynamic: string[]
}

const CSS_INTERACTIVE_OK = [
  /^hover:/,
  /^focus:/,
  /^focus-within:/,
  /^focus-visible:/,
  /^active:/,
  /^group-hover:/,
  /^group-focus:/,
  /^peer-/,
  /^first:/,
  /^last:/,
  /^odd:/,
  /^even:/,
  /^disabled:/,
  /^placeholder:/,
  /^dark:/,
  /^print:/,
  /^md:|^sm:|^lg:|^xl:|^2xl:/,
]

const REQUIRES_JS_PATTERNS = [
  /\buseState\b/,
  /\buseEffect\b/,
  /\buseRef\b/,
  /\buseCallback\b/,
  /\buseMemo\b/,
  /\buseReducer\b/,
  /\buseContext\b/,
  /\bon[A-Z][a-zA-Z]+\s*[=:]/,
  /\bwindow\./,
  /\bdocument\./,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /import\s*\(/,
]

export const analyzeFile = (source: string, _filename = ""): RscAnalysis => {
  const clientReasons: string[] = []
  const interactiveClasses: string[] = []

  const hasClientDirective =
    source.trimStart().startsWith('"use client"') || source.trimStart().startsWith("'use client'")

  if (hasClientDirective) {
    clientReasons.push("explicit 'use client' directive")
  }

  for (const pattern of REQUIRES_JS_PATTERNS) {
    if (pattern.test(source)) {
      const match = source.match(pattern)
      if (match) clientReasons.push(`uses ${match[0].trim()}`)
    }
  }

  const hasServerMarker = source.includes("tw.server.")

  const templateRe = /\btw\.(?:server\.)?(\w+)`((?:[^`\\]|\\.)*)`/g
  const templateMatches = [...source.matchAll(templateRe)]

  for (const match of templateMatches) {
    const classes = match[2]
    const parts = classes.split(/\s+/).filter(Boolean)
    for (const cls of parts) {
      const isOk = CSS_INTERACTIVE_OK.some((re) => re.test(cls))
      if (!isOk && /^[a-z-]+:/.test(cls)) {
        interactiveClasses.push(cls)
        clientReasons.push(`uses JS-interactive class: ${cls}`)
      }
    }
  }

  const needsClientDirective = !hasServerMarker && (hasClientDirective || clientReasons.length > 0)
  const isServer = !needsClientDirective || hasServerMarker

  return {
    isServer,
    needsClientDirective,
    clientReasons: [...new Set(clientReasons)],
    interactiveClasses: [...new Set(interactiveClasses)],
    canStaticResolveVariants: isServer,
  }
}

export const analyzeVariantUsage = (
  source: string,
  componentName: string,
  variantKeys: string[]
): StaticVariantUsage => {
  const resolved: Record<string, string> = {}
  const dynamic: string[] = []

  for (const key of variantKeys) {
    const staticRe = new RegExp(`<${componentName}[^>]*\\b${key}=["']([^"']+)["'][^>]*>`, "g")
    const dynamicRe = new RegExp(`<${componentName}[^>]*\\b${key}=\\{[^"'][^}]*\\}[^>]*>`, "g")

    const staticMatch = source.match(staticRe)
    const dynamicMatch = source.match(dynamicRe)

    if (dynamicMatch) {
      dynamic.push(key)
    } else if (staticMatch) {
      const valMatch = staticMatch[0].match(new RegExp(`${key}=["']([^"']+)["']`))
      if (valMatch) resolved[key] = valMatch[1]
    }
  }

  return { resolved, dynamic }
}

export const resolveServerVariant = (
  base: string,
  table: Record<string, Record<string, string>>,
  defaults: Record<string, string>,
  resolved: Record<string, string>
): string => {
  const parts: string[] = [base]

  for (const key in table) {
    const val = resolved[key] ?? defaults[key]
    if (val && table[key][val]) {
      parts.push(table[key][val])
    }
  }

  const seen = new Map<string, string>()
  for (const part of parts) {
    for (const cls of part.split(/\s+/).filter(Boolean)) {
      const prefix = cls.replace(/^(?:[\w-]+:)*/, "").split("-")[0]
      seen.set(prefix, cls)
    }
  }

  return Array.from(seen.values()).join(" ")
}

export const injectClientDirective = (code: string): string => {
  if (code.startsWith('"use client"') || code.startsWith("'use client'")) {
    return code
  }
  return `"use client";\n${code}`
}

export const injectServerOnlyComment = (code: string): string => {
  return `/* @tw-server-only */\n${code}`
}

export const detectRSCBoundary = (code: string): boolean => {
  const analysis = analyzeFile(code)
  return analysis.needsClientDirective
}

export const autoInjectClientBoundary = (
  code: string,
  filepath = ""
): {
  code: string
  injected: boolean
  reasons: string[]
} => {
  const analysis = analyzeFile(code, filepath)
  if (analysis.needsClientDirective) {
    return {
      code: injectClientDirective(code),
      injected: true,
      reasons: analysis.clientReasons,
    }
  }
  return { code, injected: false, reasons: [] }
}
