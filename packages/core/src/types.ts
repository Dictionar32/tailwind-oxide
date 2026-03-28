/**
 * tailwind-styled-v4 v3 — Public Types
 *
 * New in v3:
 *   - StateConfig: data-attr reactive states
 *   - ContainerConfig: @container query support
 *   - HtmlTagName: explicit union (fixes DTS bundler collapse issue)
 */

import type React from "react"
import type { JSX } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// ComponentConfig — tw.button({ base, variants, state, container, ... })
// ─────────────────────────────────────────────────────────────────────────────

/** Reactive state config — generates data-attr CSS selectors */
export type StateConfig = {
  readonly [stateName: string]: string
}

/** Container query breakpoints */
export type ContainerConfig = {
  /** @container (min-width: Xpx) */
  readonly [breakpoint: string]: string | { readonly minWidth?: string; readonly maxWidth?: string; readonly classes: string }
}

export type ComponentConfig = {
  readonly base?: string
  readonly variants?: Readonly<Record<string, Readonly<Record<string, string>>>>
  readonly compoundVariants?: ReadonlyArray<{ readonly class: string; readonly [key: string]: unknown }>
  readonly defaultVariants?: Readonly<Record<string, string>>
  /** Reactive state: { active: "bg-blue-500", disabled: "opacity-50" } */
  readonly state?: StateConfig
  /** Container query: { sm: "flex-col", md: "flex-row" } */
  readonly container?: ContainerConfig
  /** Named container for @container queries */
  readonly containerName?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// UPGRADE #3 — Precise variant type inference
// ─────────────────────────────────────────────────────────────────────────────

export type VariantLiterals<V extends Record<string, string>> = keyof V & string

export type InferVariantProps<C extends ComponentConfig> =
  C["variants"] extends Record<string, Record<string, string>>
    ? {
        [K in keyof C["variants"]]?: VariantLiterals<C["variants"][K]>
      }
    : // Record<string, never> kills all props on intersection — use empty object type
      Record<never, never>

export type StyledComponentProps<
  P extends object,
  C extends ComponentConfig = ComponentConfig,
> = P & InferVariantProps<C> & { className?: string }

// ─────────────────────────────────────────────────────────────────────────────
// SubComponent types
// ─────────────────────────────────────────────────────────────────────────────

/** Type for sub-components (e.g., Button.icon, Card.header) */
export type TwSubComponent<P extends object = Record<string, unknown>> =
  React.ForwardRefExoticComponent<P & React.RefAttributes<unknown>>

/** Map of sub-component names to their types */
export type SubComponentMap = Record<string, TwSubComponent>

// ─────────────────────────────────────────────────────────────────────────────
// TwStyledComponent
// ─────────────────────────────────────────────────────────────────────────────

export type TwStyledComponent<
  P extends object = Record<string, unknown>,
  S extends SubComponentMap = SubComponentMap,
> = React.ForwardRefExoticComponent<P & React.RefAttributes<unknown>> & {
  extend(strings: TemplateStringsArray, ...exprs: unknown[]): TwStyledComponent<P, S>
  withVariants(config: Partial<ComponentConfig>): TwStyledComponent<P, S>
  /** Attach a CSS animation. Requires @tailwind-styled/animate v5 async API. */
  animate(opts: import("@tailwind-styled/animate").AnimateOptions): Promise<TwStyledComponent<P, S>>
  /** Access sub-components (e.g., Button.icon, Card.header) - defined at runtime via template literal */
  <K extends string>(key: K): K extends keyof S ? S[K] : React.ReactElement
  /** Runtime sub-components - added by compiler */
  [key: string]: unknown
}

// ─────────────────────────────────────────────────────────────────────────────
// cv() return type
// ─────────────────────────────────────────────────────────────────────────────

export type CvFn<C extends ComponentConfig> = (
  props?: InferVariantProps<C> & { className?: string } & Readonly<Record<string, unknown>>
) => string

// ─────────────────────────────────────────────────────────────────────────────
// Tag factory types
// ─────────────────────────────────────────────────────────────────────────────

type Interpolation<P extends object> =
  | string
  | number
  | boolean
  | null
  | undefined
  | ((props: P) => string | number | boolean | null | undefined)

export type TwTagFactory<E extends keyof JSX.IntrinsicElements = "div", S extends SubComponentMap = SubComponentMap> = {
  (
    strings: TemplateStringsArray,
    ...exprs: Interpolation<JSX.IntrinsicElements[E]>[]
  ): TwStyledComponent<JSX.IntrinsicElements[E], S>
  <P extends object>(
    strings: TemplateStringsArray,
    ...exprs: Interpolation<JSX.IntrinsicElements[E] & P>[]
  ): TwStyledComponent<JSX.IntrinsicElements[E] & P, S>
  <C extends ComponentConfig>(
    config: C
  ): TwStyledComponent<JSX.IntrinsicElements[E] & InferVariantProps<C>, S>
  (config: ComponentConfig): TwStyledComponent<JSX.IntrinsicElements[E], S>
}

// Non-intrinsic tag factory for custom components (non-HTML elements)
export type TwTagFactoryAny = {
  (strings: TemplateStringsArray, ...exprs: Interpolation<Record<string, unknown>>[]): TwStyledComponent<Record<string, unknown>>
  <P extends object>(strings: TemplateStringsArray, ...exprs: Interpolation<P>[]): TwStyledComponent<P>
  <C extends ComponentConfig>(config: C): TwStyledComponent<Record<string, unknown>>
  (config: ComponentConfig): TwStyledComponent<Record<string, unknown>>
}

export type TwComponentFactory<C extends React.ComponentType<Record<string, unknown>>, S extends SubComponentMap = SubComponentMap> = {
  (
    strings: TemplateStringsArray,
    ...exprs: Interpolation<React.ComponentPropsWithRef<C>>[]
  ): TwStyledComponent<React.ComponentPropsWithRef<C>, S>
  <Config extends ComponentConfig>(
    config: Config
  ): TwStyledComponent<React.ComponentPropsWithRef<C> & InferVariantProps<Config>, S>
}

// ─────────────────────────────────────────────────────────────────────────────
// HtmlTagName — explicit union (fixes DTS bundler collapsing JSX.IntrinsicElements)
// ─────────────────────────────────────────────────────────────────────────────

export type HtmlTagName =
  | "div"
  | "section"
  | "article"
  | "aside"
  | "header"
  | "footer"
  | "main"
  | "nav"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "span"
  | "strong"
  | "em"
  | "b"
  | "i"
  | "s"
  | "u"
  | "small"
  | "mark"
  | "sub"
  | "sup"
  | "blockquote"
  | "q"
  | "cite"
  | "abbr"
  | "address"
  | "time"
  | "code"
  | "pre"
  | "kbd"
  | "samp"
  | "var"
  | "ul"
  | "ol"
  | "li"
  | "dl"
  | "dt"
  | "dd"
  | "figure"
  | "figcaption"
  | "details"
  | "summary"
  | "table"
  | "thead"
  | "tbody"
  | "tfoot"
  | "tr"
  | "th"
  | "td"
  | "caption"
  | "colgroup"
  | "col"
  | "img"
  | "picture"
  | "video"
  | "audio"
  | "source"
  | "track"
  | "canvas"
  | "svg"
  | "path"
  | "circle"
  | "rect"
  | "line"
  | "polyline"
  | "polygon"
  | "ellipse"
  | "g"
  | "defs"
  | "use"
  | "symbol"
  | "text"
  | "tspan"
  | "form"
  | "input"
  | "textarea"
  | "select"
  | "option"
  | "optgroup"
  | "button"
  | "label"
  | "fieldset"
  | "legend"
  | "output"
  | "progress"
  | "meter"
  | "datalist"
  | "a"
  | "area"
  | "map"
  | "iframe"
  | "embed"
  | "object"
  | "hr"
  | "br"
  | "wbr"
  | "dialog"
  | "menu"
  | "template"
  | "slot"

export type TwServerObject = {
  [K in HtmlTagName]: K extends keyof JSX.IntrinsicElements ? TwTagFactory<K> : TwTagFactory<"div">
}

export type TwObject = {
  [K in keyof JSX.IntrinsicElements]: TwTagFactory<K>
} & {
  <C extends React.ComponentType<Record<string, unknown>>>(component: C): TwComponentFactory<C>
  server: TwServerObject
}
