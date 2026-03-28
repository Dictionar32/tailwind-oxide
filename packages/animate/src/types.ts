export type CSSFillMode = "none" | "forwards" | "backwards" | "both"

export type CSSDirection = "normal" | "reverse" | "alternate" | "alternate-reverse"

export type CSSIterationCount = number | "infinite"

export type PresetEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "step-start"
  | "step-end"

export type CubicBezierEasing = `cubic-bezier(${string})`
export type StepsEasing = `steps(${string})`

export type CSSEasing = PresetEasing | CubicBezierEasing | StepsEasing

export interface AnimateOptions {
  from: string
  to: string
  duration?: number
  easing?: CSSEasing
  delay?: number
  fill?: CSSFillMode
  iterations?: CSSIterationCount
  direction?: CSSDirection
  name?: string
}

export interface KeyframesDefinition {
  [stop: string]: string
}

export interface CompiledAnimation {
  className: string
  keyframesCss: string
  animationCss: string
}

export interface AnimationRegistryOptions {
  cacheLimit?: number
}

export interface NativeCompiledAnimation {
  className: string
  keyframesCss: string
  animationCss: string
}

export interface NativeAnimateBinding {
  compileAnimation?: (
    from: string,
    to: string,
    name: string | null,
    durationMs: number | null,
    easing: string | null,
    delayMs: number | null,
    fill: string | null,
    iterations: string | null,
    direction: string | null
  ) => NativeCompiledAnimation | null
  compileKeyframes?: (name: string, stopsJson: string) => NativeCompiledAnimation | null
  compileCss?: (
    classes: string[],
    prefix: string | null
  ) => {
    css: string
    resolvedClasses: string[]
    unknownClasses: string[]
    sizeBytes: number
  } | null
}
