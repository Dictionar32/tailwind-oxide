/**
 * Theme — Rust native bridge
 *
 * Uses @tailwind-styled/shared for native binding resolution.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  createDebugLogger,
  loadNativeBinding,
  resolveNativeBindingCandidates,
} from "@tailwind-styled/shared"

const log = createDebugLogger("theme:native")

function getDirname(): string {
  if (typeof __dirname !== "undefined") return __dirname
  if (typeof import.meta !== "undefined" && import.meta.url) {
    return path.dirname(fileURLToPath(import.meta.url))
  }
  return process.cwd()
}

interface NativeThemeBinding {
  compileTheme?: (
    tokensJson: string,
    themeName: string,
    prefix: string
  ) => {
    name: string
    selector: string
    css: string
    tokens: Array<{ key: string; cssVar: string; value: string }>
  } | null
  extractCssVars?: (source: string) => string[] | null
}

const isValidThemeBinding = (module: unknown): module is NativeThemeBinding => {
  const candidate = module as Partial<NativeThemeBinding> | null | undefined
  return !!(candidate && typeof candidate.compileTheme === "function")
}

// ─────────────────────────────────────────────────────────────────────────
// Native Theme Binding - Factory Pattern
// ─────────────────────────────────────────────────────────────────────────

const createThemeBindingLoader = () => {
  const _state = { binding: undefined as NativeThemeBinding | null | undefined }

  const getBinding = (): NativeThemeBinding | null => {
    if (_state.binding !== undefined) return _state.binding

    const runtimeDir = getDirname()
    const candidates = resolveNativeBindingCandidates({
      runtimeDir,
      includeDefaultCandidates: true,
    })

    const { binding } = loadNativeBinding<NativeThemeBinding>({
      runtimeDir,
      candidates,
      isValid: isValidThemeBinding,
      invalidExportMessage: "Module loaded but missing expected theme binding functions",
    })

    if (binding) {
      log(`theme native binding loaded successfully`)
      return (_state.binding = binding)
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

const themeBindingLoader = createThemeBindingLoader()

export function getNativeThemeBinding(): NativeThemeBinding | null {
  return themeBindingLoader.get()
}
