import {
  createDebugLogger,
  loadNativeBinding,
  resolveNativeBindingCandidates,
  resolveRuntimeDir,
} from "@tailwind-styled/shared"

import type { NativeAnimateBinding } from "./types"

// ─────────────────────────────────────────────────────────────────────────
// Native Animate Binding - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────

const createAnimateBindingLoader = () => {
  const _state = { bindingPromise: null as Promise<NativeAnimateBinding> | null }

  const loadAnimateBinding = (): NativeAnimateBinding => {
    const runtimeDir = resolveRuntimeDir(
      typeof __dirname === "string" ? __dirname : undefined,
      import.meta.url
    )
    const candidates = resolveBindingCandidates(runtimeDir)
    const { binding, loadErrors, loadedPath } = loadNativeBinding<NativeAnimateBinding>({
      runtimeDir,
      candidates,
      isValid: isAnimateModule,
      invalidExportMessage: "Module loaded but missing compileAnimation/compileKeyframes exports.",
    })

    if (binding) {
      debugLog(`native animate binding loaded from: ${loadedPath}`)
      return binding
    }

    if (loadErrors.length > 0) {
      debugLog(
        `native animate binding load failed for ${loadErrors.length} candidate(s): ${loadErrors
          .map((entry) => `${entry.path} (${entry.message})`)
          .join("; ")}`
      )
    } else {
      debugLog("native animate binding not found in any candidate path")
    }

    const lines = [
      "Native animate backend not found. Ensure `tailwind_styled_parser.node` is built.",
      "Checked paths:",
      ...candidates.map((candidate) => `- ${candidate}`),
    ]
    if (loadErrors.length > 0) {
      lines.push("Load errors:")
      for (const error of loadErrors) lines.push(`- ${error.path}: ${error.message}`)
    }
    throw new Error(lines.join("\n"))
  }

  return {
    get: (): Promise<NativeAnimateBinding> => {
      if (!_state.bindingPromise) {
        _state.bindingPromise = Promise.resolve().then(loadAnimateBinding)
      }
      return _state.bindingPromise
    },
    reset: (): void => {
      _state.bindingPromise = null
    },
  }
}

const animateBindingLoader = createAnimateBindingLoader()

const DEBUG_NAMESPACE = "tailwind-styled:animate"
const debugLog = createDebugLogger(DEBUG_NAMESPACE, "tailwind-styled/animate")

function isAnimateModule(module: unknown): module is NativeAnimateBinding {
  const candidate = module as Partial<NativeAnimateBinding> | null | undefined
  return (
    typeof candidate?.compileAnimation === "function" &&
    typeof candidate?.compileKeyframes === "function"
  )
}

function resolveBindingCandidates(runtimeDir: string): string[] {
  return resolveNativeBindingCandidates({
    runtimeDir,
    envVarNames: ["TWS_ANIMATE_NATIVE_PATH", "TWS_NATIVE_PATH"],
    enforceNodeExtensionForEnvPath: true,
  })
}

export async function getAnimateBinding(): Promise<NativeAnimateBinding> {
  return animateBindingLoader.get()
}

export async function initAnimate(): Promise<void> {
  await getAnimateBinding()
}
