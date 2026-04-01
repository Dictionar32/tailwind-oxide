/**
 * tailwind-styled-v4 — Class parser
 *
 * Tries the Rust native binding first (parse_classes via napi),
 * falls back to the JS implementation when the binding is unavailable.
 *
 * Public API is unchanged — same types and functions as before.
 */

// Lazy load Node built-ins — browser safe (never called in browser context)
type NodeBuiltinLoader = typeof process & {
  getBuiltinModule?: (id: string) => unknown
}

const getBuiltinModule = <T>(id: string): T | null => {
  if (typeof process === "undefined") return null
  const loader = process as NodeBuiltinLoader
  if (typeof loader.getBuiltinModule !== "function") return null
  try {
    return loader.getBuiltinModule(id) as T
  } catch {
    return null
  }
}

const _getNodePath = () =>
  getBuiltinModule<{
    join: (...parts: string[]) => string
    resolve: (...parts: string[]) => string
  }>("path")
const _getCreateRequire = () =>
  getBuiltinModule<{
    createRequire?: (filename: string) => (id: string) => unknown
  }>("module")?.createRequire ?? null

// ── Types (re-exported so consumers don't need to change imports) ─────────────

export interface ParsedClassModifier {
  type: "opacity" | "arbitrary"
  value: string
}

export interface ParsedClass {
  raw: string
  base: string
  variants: string[]
  modifier?: ParsedClassModifier
}

// ── Rust native binding ───────────────────────────────────────────────────────

interface NativeParserBinding {
  parseClasses?: (input: string) => Array<{
    raw: string
    base: string
    variants: string[]
    modifierType?: string | null
    modifierValue?: string | null
  }>
}

// ─────────────────────────────────────────────────────────────────────────
// Rust native binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const createParserBindingLoader = () => {
  const _state = { binding: undefined as NativeParserBinding | null | undefined }

  const getBinding = (): NativeParserBinding | null => {
    if (_state.binding !== undefined) return _state.binding
    // Guard: skip entirely in browser environment
    if (typeof process === "undefined" || typeof process.cwd !== "function") {
      return (_state.binding = null)
    }

    const runtimeDir = typeof __dirname === "string" ? __dirname : process.cwd()

    // Lazy-load Node built-ins — safe in browser (never reached due to guard above)

    const nodePath = _getNodePath()
    const nodeCreateRequire = _getCreateRequire()
    if (!nodePath) return (_state.binding = null)

    const req = nodeCreateRequire ? nodeCreateRequire(nodePath.join(runtimeDir, "noop.cjs")) : null

    if (!req) return (_state.binding = null)

    const candidates = [
      nodePath.resolve(process.cwd(), "native", "tailwind_styled_parser.node"),
      nodePath.resolve(runtimeDir, "..", "..", "..", "native", "tailwind_styled_parser.node"),
      nodePath.resolve(runtimeDir, "..", "..", "..", "..", "native", "tailwind_styled_parser.node"),
    ]

    for (const c of candidates) {
      try {
        const mod = req(c) as NativeParserBinding
        if (mod?.parseClasses) return (_state.binding = mod)
      } catch {
        /* try next */
      }
    }

    return (_state.binding = null)
  }

  return {
    get: getBinding,
    reset: (): void => {
      _state.binding = undefined
    },
  }
}

const parserBindingLoader = createParserBindingLoader()
const getBinding = parserBindingLoader.get

// ── JS fallback implementations ───────────────────────────────────────────────

function splitClassListJS(input: string): string[] {
  const out: string[] = []
  const s = { token: "", square: 0, round: 0, escaped: false }

  for (const ch of input) {
    if (s.escaped) {
      s.token += ch
      s.escaped = false
      continue
    }
    if (ch === "\\") {
      s.token += ch
      s.escaped = true
      continue
    }
    if (ch === "[") s.square++
    else if (ch === "]") s.square = Math.max(0, s.square - 1)
    else if (ch === "(") s.round++
    else if (ch === ")") s.round = Math.max(0, s.round - 1)
    const isSpace = /\s/.test(ch)
    if (isSpace && s.square === 0 && s.round === 0) {
      if (s.token.trim().length > 0) out.push(s.token.trim())
      s.token = ""
      continue
    }
    s.token += ch
  }
  if (s.token.trim().length > 0) out.push(s.token.trim())
  return out
}

function parseClassTokenJS(rawToken: string): ParsedClass {
  const parts: string[] = []
  const s = { current: "", square: 0, round: 0, escaped: false }

  for (const ch of rawToken) {
    if (s.escaped) {
      s.current += ch
      s.escaped = false
      continue
    }
    if (ch === "\\") {
      s.current += ch
      s.escaped = true
      continue
    }
    if (ch === "[") s.square++
    else if (ch === "]") s.square = Math.max(0, s.square - 1)
    else if (ch === "(") s.round++
    else if (ch === ")") s.round = Math.max(0, s.round - 1)
    if (ch === ":" && s.square === 0 && s.round === 0) {
      parts.push(s.current)
      s.current = ""
      continue
    }
    s.current += ch
  }
  parts.push(s.current)

  const variants = parts.slice(0, -1).filter(Boolean)
  const baseToken = parts[parts.length - 1] ?? ""
  const parsed: ParsedClass = { raw: rawToken, base: baseToken, variants }

  const opacityMatch = baseToken.match(/^(.*)\/(\d{1,3})$/)
  if (opacityMatch && opacityMatch[1].length > 0) {
    parsed.base = opacityMatch[1]
    parsed.modifier = { type: "opacity", value: opacityMatch[2] }
    return parsed
  }

  const arbitraryMatch = baseToken.match(/\((--[a-zA-Z0-9_-]+)\)/)
  if (arbitraryMatch) {
    parsed.modifier = { type: "arbitrary", value: arbitraryMatch[1] }
  }

  return parsed
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Split a Tailwind class string, preserving bracket/parenthesis expressions.
 * Uses Rust napi when available, JS fallback otherwise.
 */
export function splitClassList(input: string): string[] {
  const binding = getBinding()
  if (binding?.parseClasses) {
    try {
      return binding.parseClasses(input).map((p) => p.raw)
    } catch {
      /* fall through */
    }
  }
  return splitClassListJS(input)
}

/**
 * Parse a single Tailwind class token into variants + base + modifier metadata.
 * Uses Rust napi when available, JS fallback otherwise.
 */
export function parseClassToken(rawToken: string): ParsedClass {
  const binding = getBinding()
  if (binding?.parseClasses) {
    try {
      const results = binding.parseClasses(rawToken)
      if (results.length === 1) {
        const r = results[0]
        const parsed: ParsedClass = {
          raw: r.raw,
          base: r.base,
          variants: r.variants,
        }
        if (r.modifierType && r.modifierValue) {
          parsed.modifier = {
            type: r.modifierType as "opacity" | "arbitrary",
            value: r.modifierValue,
          }
        }
        return parsed
      }
    } catch {
      /* fall through */
    }
  }
  return parseClassTokenJS(rawToken)
}

/**
 * Parse all Tailwind classes in a space-separated string.
 * Uses Rust napi for bulk parsing when available.
 */
export function parseTailwindClasses(input: string): ParsedClass[] {
  const binding = getBinding()
  if (binding?.parseClasses) {
    try {
      return binding.parseClasses(input).map((r) => {
        const parsed: ParsedClass = { raw: r.raw, base: r.base, variants: r.variants }
        if (r.modifierType && r.modifierValue) {
          parsed.modifier = {
            type: r.modifierType as "opacity" | "arbitrary",
            value: r.modifierValue,
          }
        }
        return parsed
      })
    } catch {
      /* fall through */
    }
  }
  return splitClassListJS(input).map(parseClassTokenJS)
}
