/**
 * tailwind-styled-v4 — Svelte Adapter
 *
 * Svelte 4+ adapter menggunakan action dan store pattern.
 * Kompatibel dengan Svelte 5 runes mode.
 *
 * Dua pola yang didukung:
 * 1. `tw()` — buat class string resolver untuk dipakai di template
 * 2. `createSvelteComponent()` — buat Svelte component via Svelte API
 *
 * @example
 * <!-- Pola 1: tw() sebagai class resolver -->
 * <script>
 *   import { cv } from '@tailwind-styled/svelte'
 *
 *   const buttonClass = cv({
 *     base: 'px-4 py-2 rounded font-medium',
 *     variants: {
 *       intent: { primary: 'bg-blue-500 text-white', danger: 'bg-red-500 text-white' },
 *       size: { sm: 'h-8 text-sm', lg: 'h-12 text-lg' },
 *     },
 *     defaultVariants: { intent: 'primary', size: 'sm' },
 *   })
 *
 *   export let intent = 'primary'
 *   export let size = 'sm'
 * </script>
 *
 * <button class={buttonClass({ intent, size })}>
 *   <slot />
 * </button>
 */

import { twMerge } from "tailwind-merge"

import type { VariantValue, VariantProps as Props } from '@tailwind-styled/shared'


const toClassName = (value: VariantValue): string | undefined => {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  return undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SvelteComponentConfig {
  base?: string
  variants?: Record<string, Record<string, string>>
  compoundVariants?: Array<{ class: string; [key: string]: VariantValue }>
  defaultVariants?: Record<string, string>
}

// ─────────────────────────────────────────────────────────────────────────────
// Variant resolvers (framework-agnostic core)
// ─────────────────────────────────────────────────────────────────────────────

function resolveVariants(
  variants: Record<string, Record<string, string>>,
  props: Props,
  defaults: Record<string, string> = {}
): string {
  const classes: string[] = []
  for (const key in variants) {
    const val = props[key] ?? defaults[key]
    if (val !== undefined && variants[key]?.[String(val)]) {
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
// cv() — Class Variant (utama untuk Svelte)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Class variant resolver — pola utama untuk Svelte.
 * Returns fungsi yang menerima props dan mengembalikan class string.
 *
 * Gunakan ini di `<script>` block, lalu panggil di template.
 *
 * @example
 * const button = cv({
 *   base: 'px-4 py-2 rounded',
 *   variants: { size: { sm: 'h-8', lg: 'h-12' } },
 * })
 *
 * // Di template: class={button({ size: 'lg' })}
 */
export function cv(config: SvelteComponentConfig) {
  return (props: Props = {}) => {
    const { base = "", variants = {}, compoundVariants = [], defaultVariants = {} } = config

    const merged = { ...defaultVariants, ...props }
    const variantClasses = resolveVariants(variants, merged, defaultVariants)
    const compoundClasses = resolveCompound(compoundVariants, merged)

    return twMerge(base, variantClasses, compoundClasses, toClassName(props.class))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// tw() — Simple class merger dengan template literal support
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple class merger — berguna untuk merge class dinamis.
 *
 * @example
 * import { tw } from '@tailwind-styled/svelte'
 *
 * // Merge class string
 * const cls = tw('px-4 py-2', isActive && 'bg-blue-500', className)
 */
export function tw(...classes: Array<string | boolean | null | undefined>): string {
  return twMerge(...(classes.filter(Boolean) as string[]))
}

// ─────────────────────────────────────────────────────────────────────────────
// Svelte action — use:styled
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Svelte action untuk menerapkan class dinamis.
 *
 * @example
 * <script>
 *   import { styled } from '@tailwind-styled/svelte'
 *   const buttonConfig = { base: 'px-4 py-2', variants: { size: { sm: 'h-8', lg: 'h-12' } } }
 * </script>
 *
 * <button use:styled={{ config: buttonConfig, props: { size: 'lg' } }}>
 *   Click me
 * </button>
 */
export function styled(
  node: HTMLElement,
  { config, props = {} }: { config: SvelteComponentConfig; props?: Props }
) {
  const _resolver = cv(config)

  function update({
    config: cfg,
    props: p = {},
  }: {
    config: SvelteComponentConfig
    props?: Props
  }) {
    const classes = cv(cfg)(p)
    // Hapus class lama yang dikelola action, tambah yang baru
    node.className = classes
  }

  // Apply initial classes
  update({ config, props })

  return {
    update,
    destroy() {
      // Cleanup tidak diperlukan
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createVariants() — Svelte 5 runes compatible
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Svelte 5 runes-compatible variant factory.
 * Mengembalikan reactive class string menggunakan $derived pattern.
 *
 * @example
 * // Dalam Svelte 5 component:
 * const { className, variantProps } = createVariants({
 *   base: 'px-4 py-2',
 *   variants: { size: { sm: 'h-8', lg: 'h-12' } },
 * }, () => ({ size: currentSize }))
 *
 * // className adalah fungsi yang return class string terkini
 */
export function createVariants(config: SvelteComponentConfig, getProps: () => Props) {
  const resolver = cv(config)

  return {
    className: () => resolver(getProps()),
    config,
  }
}
