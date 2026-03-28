import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

interface NativeSyntaxBridge {
  extractClassesFromSourceNative?: (source: string) => string[] | null
}

const VALID_CLASS_RE = /^[-a-z0-9:/[\]!.()+%]+$/

function getRuntimeDir(): string {
  if (typeof __dirname !== "undefined") return __dirname
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

function tryRequire(id: string): NativeSyntaxBridge | null {
  try {
    const runtimeDir = getRuntimeDir()
    const requireFromRuntime =
      typeof module !== "undefined" && typeof module.require === "function"
        ? module.require.bind(module)
        : createRequire(path.join(runtimeDir, "noop.cjs"))
    const loaded = requireFromRuntime(id) as NativeSyntaxBridge
    return loaded ?? null
  } catch {
    return null
  }
}

const bridgeState = { current: undefined as NativeSyntaxBridge | null | undefined }

function getNativeBridge(): NativeSyntaxBridge {
  if (bridgeState.current !== undefined) {
    if (bridgeState.current === null) {
      throw new Error(
        "[tailwind-styled/syntax] Native syntax binding is required but not available."
      )
    }
    return bridgeState.current
  }

  const runtimeDir = getRuntimeDir()
  const candidates = [
    "@tailwind-styled/native",
    path.resolve(process.cwd(), "native", "index.mjs"),
    path.resolve(runtimeDir, "..", "..", "..", "native", "index.mjs"),
    path.resolve(runtimeDir, "..", "..", "..", "..", "native", "index.mjs"),
    path.resolve(process.cwd(), "native", "index.node"),
    path.resolve(runtimeDir, "..", "..", "..", "native", "index.node"),
    path.resolve(runtimeDir, "..", "..", "..", "..", "native", "index.node"),
  ]

  for (const candidate of candidates) {
    const loaded = tryRequire(candidate)
    if (loaded?.extractClassesFromSourceNative) {
      bridgeState.current = loaded
      return bridgeState.current
    }
  }

  bridgeState.current = null
  throw new Error(
    "[tailwind-styled/syntax] Native syntax binding not found. Run `npm run build:rust` first."
  )
}

export function extractAllClasses(source: string): string[] {
  const result = getNativeBridge().extractClassesFromSourceNative?.(source)
  if (result === null || result === undefined) {
    throw new Error("[tailwind-styled/syntax] Native extractClassesFromSource returned null.")
  }
  return result.sort()
}

export function parseClasses(raw: string): string[] {
  const parsed: string[] = []

  for (const token of raw.split(/[\n\s]+/)) {
    if (!token) continue
    const normalized = token.trim()
    if (!normalized || !VALID_CLASS_RE.test(normalized)) continue
    parsed.push(normalized)
  }

  return parsed
}
