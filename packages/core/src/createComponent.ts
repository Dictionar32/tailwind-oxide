import type { AnimateOptions } from "@tailwind-styled/animate"
import React from "react"

import { processContainer } from "./containerQuery"
import { twMerge } from "./merge"
import { processState } from "./stateEngine"
import type { ComponentConfig, TwStyledComponent } from "./types"

const ALWAYS_BLOCKED = new Set(["base", "_ref", "state", "container", "containerName"])

type RuntimeProps = Record<string, unknown> & { className?: string }
// biome-ignore lint: exported for external consumers
type RuntimeComponent = TwStyledComponent<RuntimeProps>

function normalizeClassName(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function makeFilterProps(variantKeys: Set<string>) {
  return function filterProps(props: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const key in props) {
      if (variantKeys.has(key)) continue
      if (key.startsWith("$")) continue
      if (ALWAYS_BLOCKED.has(key)) continue
      out[key] = props[key]
    }
    return out
  }
}

function resolveVariants(
  variants: Record<string, Record<string, string>>,
  props: Record<string, unknown>,
  defaults: Record<string, string>
): string {
  const classes: string[] = []
  for (const key in variants) {
    const value = props[key] ?? defaults[key]
    if (value !== undefined && variants[key][String(value)]) {
      classes.push(variants[key][String(value)])
    }
  }
  return classes.join(" ")
}

function resolveCompound(
  compounds: ReadonlyArray<{ readonly class: string; readonly [key: string]: unknown }>,
  props: Record<string, unknown>
): string {
  const classes: string[] = []
  for (const compound of compounds) {
    const { class: compoundClass, ...conditions } = compound as {
      class: string
      [key: string]: unknown
    }
    const matches = Object.entries(conditions).every(([key, value]) => props[key] === value)
    if (matches) {
      classes.push(compoundClass)
    }
  }
  return classes.join(" ")
}

function attachExtend<P extends object>(
  component: TwStyledComponent<P>,
  originalTag: React.ElementType,
  base: string,
  config: string | ComponentConfig
): TwStyledComponent<P> {
  component.extend = (strings: TemplateStringsArray) => {
    const extra = strings.raw.join("").trim().replace(/\s+/g, " ")
    const merged = twMerge(base, extra)
    const extended = createComponent<P>(
      originalTag,
      typeof config === "string" ? merged : { ...config, base: merged }
    )
    // Carry over subcomponents from original to extended
    for (const key of Object.keys(component)) {
      if (
        key !== "extend" &&
        key !== "withVariants" &&
        key !== "animate" &&
        key !== "displayName"
      ) {
        ;(extended as Record<string, unknown>)[key] = (
          component as Record<string, unknown>
        )[key]
      }
    }
    return extended
  }

  component.withVariants = (newConfig: Partial<ComponentConfig>) => {
    const existing = typeof config === "object" ? config : {}
    return createComponent<P>(originalTag, {
      ...existing,
      base,
      variants: { ...(existing.variants ?? {}), ...(newConfig.variants ?? {}) },
      compoundVariants: [
        ...(existing.compoundVariants ?? []),
        ...(newConfig.compoundVariants ?? []),
      ],
      defaultVariants: {
        ...(existing.defaultVariants ?? {}),
        ...(newConfig.defaultVariants ?? {}),
      },
    })
  }

  component.animate = async (opts: AnimateOptions) => {
    try {
      const { animate } =
        require("@tailwind-styled/animate") as typeof import("@tailwind-styled/animate")
      const animationClass = await animate(opts)
      const merged = twMerge(base, animationClass)
      return createComponent<P>(
        originalTag,
        typeof config === "string" ? merged : { ...config, base: merged }
      )
    } catch {
      console.warn("[tailwind-styled-v4] .animate() requires @tailwind-styled/animate")
      return component
    }
  }

  return component
}

export function createComponent<P extends object = Record<string, unknown>>(
  tag: React.ElementType,
  config: string | ComponentConfig
): TwStyledComponent<P> {
  const isStatic = typeof config === "string"
  const base = typeof config === "string" ? config : (config.base ?? "")
  const variants = typeof config === "string" ? {} : (config.variants ?? {})
  const compoundVariants = typeof config === "string" ? [] : (config.compoundVariants ?? [])
  const defaultVariants = typeof config === "string" ? {} : (config.defaultVariants ?? {})
  const stateConfig = typeof config === "string" ? undefined : config.state
  const containerConfig = typeof config === "string" ? undefined : config.container
  const containerName = typeof config === "string" ? undefined : config.containerName

  const stateResult = stateConfig
    ? processState(typeof tag === "string" ? tag : "component", stateConfig)
    : null
  const containerResult = containerConfig
    ? processContainer(typeof tag === "string" ? tag : "component", containerConfig, containerName)
    : null

  const engineClasses = [stateResult?.stateClass, containerResult?.containerClass]
    .filter(Boolean)
    .join(" ")

  const filterProps = makeFilterProps(new Set(Object.keys(variants)))
  const tagLabel =
    typeof tag === "string" ? tag : ((tag as { displayName?: string }).displayName ?? "Component")

  if (isStatic || Object.keys(variants).length === 0) {
    const baseComponent = React.forwardRef<unknown, RuntimeProps>((props, ref) => {
      const { className, ...rest } = props
      const runtimeClassName = normalizeClassName(className)
      return React.createElement(tag, {
        ref,
        ...filterProps(rest),
        className: twMerge(base, engineClasses, runtimeClassName),
      })
    })

    const component = baseComponent as TwStyledComponent<P>
    component.displayName = `tw.${tagLabel}`
    return attachExtend<P>(component, tag, base, config)
  }

  const baseComponent = React.forwardRef<unknown, RuntimeProps>((props, ref) => {
    const { className, ...rest } = props
    const runtimeClassName = normalizeClassName(className)
    const variantClasses = resolveVariants(variants, props, defaultVariants)
    const compoundClasses = resolveCompound(compoundVariants, props)

    return React.createElement(tag, {
      ref,
      ...filterProps(rest),
      className: twMerge(base, variantClasses, compoundClasses, engineClasses, runtimeClassName),
    })
  })

  const component = baseComponent as TwStyledComponent<P>
  component.displayName = `tw.${tagLabel}`
  return attachExtend<P>(component, tag, base, config)
}
