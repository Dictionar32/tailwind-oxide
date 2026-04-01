import { initAnimate as initAnimateBackend } from "./binding"
import { createAnimationPresets } from "./preset"
import { type AnimationRegistry, createAnimationRegistry } from "./registry"
import type { AnimateOptions, CompiledAnimation, KeyframesDefinition } from "./types"

export type {
  AnimateOptions,
  AnimationRegistryOptions,
  CompiledAnimation,
  CSSDirection,
  CSSEasing,
  CSSFillMode,
  CSSIterationCount,
  CubicBezierEasing,
  KeyframesDefinition,
  PresetEasing,
  StepsEasing,
} from "./types"

const defaultRegistry = createAnimationRegistry()

export async function initAnimate(): Promise<void> {
  await initAnimateBackend()
}

export function getDefaultAnimationRegistry(): AnimationRegistry {
  return defaultRegistry
}

export async function compileAnimation(
  opts: AnimateOptions,
  registry: AnimationRegistry = defaultRegistry
): Promise<CompiledAnimation> {
  return registry.compileAnimation(opts)
}

export async function compileKeyframes(
  name: string,
  stops: KeyframesDefinition,
  registry: AnimationRegistry = defaultRegistry
): Promise<CompiledAnimation> {
  return registry.compileKeyframes(name, stops)
}

export async function animate(
  opts: AnimateOptions,
  registry: AnimationRegistry = defaultRegistry
): Promise<string> {
  return (await registry.compileAnimation(opts)).className
}

export async function keyframes(
  name: string,
  stops: KeyframesDefinition,
  registry: AnimationRegistry = defaultRegistry
): Promise<string> {
  return (await registry.compileKeyframes(name, stops)).className
}

export function extractAnimationCss(registry: AnimationRegistry = defaultRegistry): string {
  return registry.extractCss()
}

export function resetAnimationRegistry(registry: AnimationRegistry = defaultRegistry): void {
  registry.reset()
}

export interface InjectAnimationCssOptions {
  document?: Document
  styleId?: string
  silent?: boolean
}

export function injectAnimationCss(
  registry: AnimationRegistry = defaultRegistry,
  options: InjectAnimationCssOptions = {}
): void {
  const targetDocument =
    options.document ?? (typeof document !== "undefined" ? document : undefined)

  if (!targetDocument) {
    if (options.silent) return
    throw new Error("injectAnimationCss requires a browser Document.")
  }

  const styleId = options.styleId ?? "__tw_animate_styles__"

  // Check if style element already exists
  const existingStyleEl = targetDocument.getElementById(styleId) as HTMLStyleElement | null

  // Use existing or create new
  const styleEl = (() => {
    if (existingStyleEl) return existingStyleEl

    if (!targetDocument.head) {
      if (options.silent) return null
      throw new Error("injectAnimationCss requires document.head to exist.")
    }

    const newStyleEl = targetDocument.createElement("style")
    newStyleEl.id = styleId
    targetDocument.head.appendChild(newStyleEl)
    return newStyleEl
  })()

  if (!styleEl) return

  styleEl.textContent = registry.extractCss()
}

export { AnimationRegistry, createAnimationRegistry } from "./registry"

export const animations = createAnimationPresets(defaultRegistry)
