/**
 * tailwind-styled-v4 — Vue Adapter
 *
 * Pola seperti `createComponent` di React tapi untuk Vue 3 Composition API.
 * Mendukung: base, variants, defaultVariants, compoundVariants.
 *
 * @example
 * import { tw } from '@tailwind-styled/vue'
 *
 * const Button = tw('button', {
 *   base: 'px-4 py-2 rounded font-medium',
 *   variants: {
 *     intent: {
 *       primary: 'bg-blue-500 text-white hover:bg-blue-600',
 *       danger: 'bg-red-500 text-white hover:bg-red-600',
 *     },
 *     size: { sm: 'h-8 text-sm', md: 'h-10 text-base', lg: 'h-12 text-lg' },
 *   },
 *   defaultVariants: { intent: 'primary', size: 'md' },
 * })
 *
 * // In template:
 * // <Button intent="danger" size="lg">Delete</Button>
 */

import { twMerge } from "tailwind-merge"
import { type App, type Component, computed, type DefineComponent, defineComponent, h } from "vue"

import type { VariantValue, VariantProps as Props, HtmlTagName as HtmlTag } from '@tailwind-styled/shared'


const isVariantValue = (value: unknown): value is VariantValue =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value === undefined

const toVariantProps = (input: Record<string, unknown>): Props => {
  const props: Props = {}
  for (const [key, value] of Object.entries(input)) {
    if (isVariantValue(value)) {
      props[key] = value
    }
  }
  return props
}

const toClassName = (value: VariantValue): string | undefined => {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VueComponentConfig {
  base?: string
  variants?: Record<string, Record<string, string>>
  compoundVariants?: Array<{ class: string; [key: string]: VariantValue }>
  defaultVariants?: Record<string, string>
}

export type HtmlTagName = HtmlTag

// ─────────────────────────────────────────────────────────────────────────────
// Variant resolver (sama dengan React adapter)
// ─────────────────────────────────────────────────────────────────────────────

function resolveVariants(
  variants: Record<string, Record<string, string>>,
  props: Props,
  defaults: Record<string, string> = {}
): string {
  const classes: string[] = []
  for (const key in variants) {
    const val = props[key] ?? defaults[key]
    if (val !== undefined && variants[key][String(val)]) {
      classes.push(variants[key][String(val)])
    }
  }
  return classes.join(" ")
}

function resolveCompound(
  compounds: Array<{ class: string; [key: string]: VariantValue }>,
  props: Props
): string {
  return compounds
    .filter((c) => {
      const { class: _cls, ...conditions } = c
      return Object.entries(conditions).every(([k, v]) => props[k] === v)
    })
    .map((c) => c.class)
    .join(" ")
}

// ─────────────────────────────────────────────────────────────────────────────
// Core factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Buat Vue component dengan Tailwind class yang terstruktur.
 *
 * @param tag - HTML tag atau Vue component
 * @param config - Konfigurasi base, variants, defaultVariants
 */
export function tw<Tag extends HtmlTag>(
  tag: Tag,
  config: VueComponentConfig = {}
): DefineComponent<Record<string, unknown>> {
  const { base = "", variants = {}, compoundVariants = [], defaultVariants = {} } = config

  const variantKeys = new Set(Object.keys(variants))

  // Props definition untuk Vue — semua variant key jadi optional prop
  const propsDefinition: Record<string, { type: null; default: undefined }> = {}
  for (const key of variantKeys) {
    propsDefinition[key] = { type: null, default: undefined }
  }
  propsDefinition.class = { type: null, default: undefined }

  return defineComponent({
    name: `TwStyled${String(tag).charAt(0).toUpperCase() + String(tag).slice(1)}`,
    inheritAttrs: false,
    props: propsDefinition,
    setup(props, { attrs, slots }) {
      const className = computed(() => {
        const variantProps = toVariantProps(props as Record<string, unknown>)
        const attrProps = toVariantProps(attrs as Record<string, unknown>)
        const mergedProps = { ...defaultVariants, ...variantProps, ...attrProps }
        const variantClasses = resolveVariants(variants, mergedProps, defaultVariants)
        const compoundClasses = resolveCompound(compoundVariants, mergedProps)
        return twMerge(
          base,
          variantClasses,
          compoundClasses,
          toClassName(variantProps.class),
          toClassName(attrProps.class)
        )
      })

      return () => {
        // Filter out variant props — jangan diteruskan ke HTML element
        const filteredAttrs: Record<string, unknown> = {}
        for (const key in attrs) {
          if (!variantKeys.has(key)) {
            filteredAttrs[key] = attrs[key]
          }
        }

        return h(tag as string, { ...filteredAttrs, class: className.value }, slots.default?.())
      }
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// cv() — class variant helper (framework-agnostic, sama dengan React)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Class variant function — returns a class string resolver.
 * Framework-agnostic, bisa dipakai di mana saja.
 *
 * @example
 * const buttonCv = cv({
 *   base: 'px-4 py-2 rounded',
 *   variants: { size: { sm: 'h-8', lg: 'h-12' } },
 *   defaultVariants: { size: 'sm' },
 * })
 *
 * buttonCv({ size: 'lg' }) // 'px-4 py-2 rounded h-12'
 */
export function cv(config: VueComponentConfig) {
  return (props: Props = {}) => {
    const { base = "", variants = {}, compoundVariants = [], defaultVariants = {} } = config
    const merged = { ...defaultVariants, ...props }
    const variantClasses = resolveVariants(variants, merged, defaultVariants)
    const compoundClasses = resolveCompound(compoundVariants, merged)
    return twMerge(base, variantClasses, compoundClasses, toClassName(props.class))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extend — tambahkan class ke komponen yang sudah ada
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extend komponen Vue yang sudah ada dengan class tambahan.
 *
 * @example
 * const PrimaryButton = extend(Button, 'bg-blue-500 text-white')
 */
export function extend(
  component: Component,
  extraClasses: string
): DefineComponent<Record<string, unknown>> {
  return defineComponent({
    name: `Extended${("name" in component ? component.name : undefined) ?? "Component"}`,
    inheritAttrs: false,
    props: { class: { type: null, default: undefined } },
    setup(props, { attrs, slots }) {
      return () =>
        h(
          component,
          {
            ...attrs,
            class: twMerge(extraClasses, props.class as string, attrs.class as string),
          },
          slots.default?.()
        )
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Vue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vue plugin — daftarkan `tw` sebagai global composable.
 *
 * @example
 * // main.ts
 * import { createApp } from 'vue'
 * import { TailwindStyledPlugin } from '@tailwind-styled/vue'
 * import App from './App.vue'
 *
 * createApp(App).use(TailwindStyledPlugin).mount('#app')
 */
export const TailwindStyledPlugin = {
  install(app: App) {
    app.config.globalProperties.$tw = tw
    app.config.globalProperties.$cv = cv
    app.provide("tw", tw)
    app.provide("cv", cv)
  },
}
