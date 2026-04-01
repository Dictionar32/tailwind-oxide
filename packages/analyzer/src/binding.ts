import {
  loadNativeBinding,
  resolveNativeBindingCandidates,
  resolveRuntimeDir,
} from "@tailwind-styled/shared"

import type { NativeAnalyzerBinding, NativeCssCompilerBinding } from "./types"
import { debugLog } from "./utils"

const isAnalyzerModule = (module: unknown): module is NativeAnalyzerBinding => {
  const candidate = module as Partial<NativeAnalyzerBinding> | null | undefined
  return typeof candidate?.analyzeClasses === "function"
}

// ─────────────────────────────────────────────────────────────────────────
// Native Analyzer Binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const createAnalyzerBindingLoader = () => {
  const _state = { bindingPromise: null as Promise<NativeAnalyzerBinding | null> | null }

  const getBindingPromise = (): Promise<NativeAnalyzerBinding | null> => {
    if (_state.bindingPromise) return _state.bindingPromise

    _state.bindingPromise = (async (): Promise<NativeAnalyzerBinding | null> => {
      const runtimeDir = resolveRuntimeDir(
        typeof __dirname === "string" ? __dirname : undefined,
        import.meta.url
      )
      const candidates = resolveNativeBindingCandidates({
        runtimeDir,
        envVarNames: ["TWS_NATIVE_PATH"],
      })

      const { binding, loadErrors, loadedPath } = await loadNativeBinding<NativeAnalyzerBinding>({
        runtimeDir,
        candidates,
        isValid: isAnalyzerModule,
        invalidExportMessage: "Module loaded but missing `analyzeClasses` export.",
      })

      if (binding) {
        debugLog(`native binding loaded from: ${loadedPath}`)
        return binding
      }

      if (loadErrors.length > 0) {
        debugLog(
          `native binding load failed for ${loadErrors.length} candidate(s): ${loadErrors
            .map((entry) => `${entry.path} (${entry.message})`)
            .join("; ")}`
        )
      } else {
        debugLog("native binding not found in any candidate path")
      }

      return null
    })()

    return _state.bindingPromise
  }

  return {
    get: getBindingPromise,
    reset: (): void => {
      _state.bindingPromise = null
    },
  }
}

const analyzerBindingLoader = createAnalyzerBindingLoader()

export async function getNativeBinding(): Promise<NativeAnalyzerBinding | null> {
  return analyzerBindingLoader.get()
}

export async function requireNativeBinding(): Promise<NativeAnalyzerBinding> {
  const binding = await analyzerBindingLoader.get()
  if (binding?.analyzeClasses) return binding

  // Untuk error reporting, kita perlu akses ke candidates dan loadErrors
  // Tapi karena async, kita perlu load ulang atau simpan state
  const runtimeDir = resolveRuntimeDir(
    typeof __dirname === "string" ? __dirname : undefined,
    import.meta.url
  )
  const candidates = resolveNativeBindingCandidates({
    runtimeDir,
    envVarNames: ["TWS_NATIVE_PATH"],
  })

  const { loadErrors } = await loadNativeBinding<NativeAnalyzerBinding>({
    runtimeDir,
    candidates,
    isValid: isAnalyzerModule,
    invalidExportMessage: "Module loaded but missing `analyzeClasses` export.",
  })

  const lines = [
    "Native analyzer binding not found. Ensure `tailwind_styled_parser.node` is built.",
  ]

  lines.push("Checked paths:")
  for (const candidate of candidates) lines.push(`- ${candidate}`)
  if (loadErrors.length > 0) {
    lines.push("Load errors:")
    for (const failure of loadErrors) {
      lines.push(`- ${failure.path}: ${failure.message}`)
    }
  }

  throw new Error(lines.join("\n"))
}

export async function requireNativeCssCompiler(): Promise<NativeCssCompilerBinding> {
  const binding = await requireNativeBinding()
  if (typeof binding.compileCss === "function") return binding as NativeCssCompilerBinding

  throw new Error(`Native analyzer compileCss binding is missing.`)
}
