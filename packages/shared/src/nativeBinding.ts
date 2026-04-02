import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

export type PlatformExtension = ".node" | ".dll" | ".dylib" | ".so"

export function getPlatformExtension(): PlatformExtension {
  const platform = os.platform()
  switch (platform) {
    case "win32":
      return ".node"
    case "darwin":
      return ".dylib"
    case "linux":
      return ".so"
    default:
      return ".node"
  }
}

export interface NativeBindingLoadError {
  path: string
  message: string
}

export interface ResolveNativeBindingCandidatesOptions {
  runtimeDir: string
  envVarNames?: string[]
  enforceNodeExtensionForEnvPath?: boolean
  includeDefaultCandidates?: boolean
  platformExtension?: PlatformExtension
}

export interface LoadNativeBindingOptions<T> {
  runtimeDir: string
  candidates: string[]
  isValid: (module: unknown) => module is T
  invalidExportMessage: string
}

export interface LoadNativeBindingResult<T> {
  binding: T | null
  loadedPath: string | null
  loadErrors: NativeBindingLoadError[]
}

export function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function resolveRuntimeDir(
  dirnameValue: string | undefined,
  moduleImportUrl: string
): string {
  if (typeof dirnameValue === "string" && dirnameValue.length > 0) return dirnameValue
  return path.dirname(fileURLToPath(moduleImportUrl))
}

export function resolveNativeBindingCandidates(
  options: ResolveNativeBindingCandidatesOptions
): string[] {
  const out: string[] = []
  const envVarNames = options.envVarNames ?? ["TWS_NATIVE_PATH"]

  for (const envVarName of envVarNames) {
    const raw = process.env[envVarName]?.trim()
    if (!raw) continue
    const resolved = path.resolve(raw)

    if (options.enforceNodeExtensionForEnvPath) {
      if (path.extname(resolved).toLowerCase() !== ".node") {
        throw new Error(
          `Invalid native binding path from ${envVarName}="${raw}". Expected a .node file.`
        )
      }
    }

    out.push(resolved)
  }

  if (options.includeDefaultCandidates !== false) {
    const ext = options.platformExtension ?? getPlatformExtension()
    const defaultBindingName = `tailwind_styled_parser${ext}`

    out.push(path.resolve(process.cwd(), "native", defaultBindingName))
    out.push(path.resolve(options.runtimeDir, "..", "..", "..", "native", defaultBindingName))
    out.push(path.resolve(options.runtimeDir, "..", "..", "..", "..", "native", defaultBindingName))
  }

  return Array.from(new Set(out))
}

function parseDebugToken(namespace: string, token: string): boolean {
  if (token === "*" || token === namespace || token === "tailwind-styled:*") return true
  return token.endsWith("*") && namespace.startsWith(token.slice(0, -1))
}

export function isDebugNamespaceEnabled(namespace: string): boolean {
  if (process.env.TWS_DEBUG === "1" || process.env.TAILWIND_STYLED_DEBUG === "1") return true
  const raw = process.env.DEBUG
  if (!raw) return false

  return raw
    .split(",")
    .map((token) => token.trim())
    .some((token) => parseDebugToken(namespace, token))
}

export function createDebugLogger(namespace: string, label = namespace): (message: string) => void {
  const debugEnabled = isDebugNamespaceEnabled(namespace)
  return (message: string) => {
    if (!debugEnabled) return
    console.debug(`[${label}] ${message}`)
  }
}

export function loadNativeBinding<T>(
  options: LoadNativeBindingOptions<T>
): LoadNativeBindingResult<T> {
  const req = createRequire(path.join(options.runtimeDir, "noop.cjs"))
  const loadErrors: NativeBindingLoadError[] = []

  for (const candidate of options.candidates) {
    if (!fs.existsSync(candidate)) continue
    try {
      const mod = req(candidate)
      if (options.isValid(mod)) {
        return {
          binding: mod,
          loadedPath: candidate,
          loadErrors,
        }
      }
      loadErrors.push({
        path: candidate,
        message: options.invalidExportMessage,
      })
    } catch (error) {
      loadErrors.push({
        path: candidate,
        message: formatErrorMessage(error),
      })
    }
  }

  return {
    binding: null,
    loadedPath: null,
    loadErrors,
  }
}

export function loadNativeBindingOrThrow<T>(
  options: LoadNativeBindingOptions<T> & { bindingName: string }
): T {
  const { bindingName, ...loadOptions } = options
  const { binding, loadErrors } = loadNativeBinding<T>(loadOptions)

  if (binding) {
    return binding
  }

  const lines = [
    `FATAL: Native binding '${bindingName}' not found.`,
    "",
    "This package requires native Rust bindings. There is no JavaScript fallback.",
    "The binding was not found in any of these paths:",
    ...loadOptions.candidates.map((p) => `  - ${p}`),
    "",
  ]

  if (loadErrors.length > 0) {
    lines.push("Load errors:")
    for (const error of loadErrors) {
      lines.push(`  - ${error.path}: ${error.message}`)
    }
    lines.push("")
  }

  lines.push(
    "Resolution steps:",
    "",
    "1. Build the native Rust module:",
    "   npm run build:rust",
    "",
    "2. Or install pre-built binaries:",
    "   npm install",
    "",
    "3. Override with environment variable:",
    "   TWS_NATIVE_PATH=/path/to/tailwind_styled_parser.node",
    "",
    "For CI/CD environments, ensure Rust toolchain is installed and",
    "'npm run build:rust' is executed before running tests or building."
  )

  throw new Error(lines.join("\n"))
}
