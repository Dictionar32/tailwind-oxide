/**
 * tailwind-styled-v4 v2 — tw
 *
 * API:
 *   tw.div`p-4 bg-zinc-900`
 *   tw.button({ base: "px-4", variants: { size: { sm: "text-sm" } } })
 *   tw(Link)`underline text-blue-400`
 *   tw.server.div`p-4`   ← server-only, compiler enforced + runtime dev warning
 */

import type React from "react"
import { createComponent } from "./createComponent"
import type {
  ComponentConfig,
  TwComponentFactory,
  TwObject,
  TwServerObject,
  TwStyledComponent,
  TwTagFactory,
  TwTagFactoryAny,
} from "./types"

// types.ts is single source of truth — re-export for consumers
export type { TwComponentFactory, TwObject, TwServerObject, TwTagFactory }

// ─────────────────────────────────────────────────────────────────────────────
// Template parser
// ─────────────────────────────────────────────────────────────────────────────

function parseTemplate(strings: TemplateStringsArray, exprs: unknown[]): string {
  return strings.raw
    .reduce((acc, str, i) => {
      const expr = exprs[i]
      const exprStr = typeof expr === "function" ? "" : (expr ?? "")
      return acc + str + String(exprStr)
    }, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

type RuntimeTagFactory = ((
  stringsOrConfig: TemplateStringsArray | ComponentConfig,
  ...exprs: unknown[]
) => TwStyledComponent<Record<string, unknown>>) &
  TwTagFactoryAny

// ─────────────────────────────────────────────────────────────────────────────
// makeTag
// ─────────────────────────────────────────────────────────────────────────────

function makeTag(tag: React.ElementType): RuntimeTagFactory {
  return ((
    stringsOrConfig: TemplateStringsArray | ComponentConfig,
    ...exprs: unknown[]
  ): TwStyledComponent<Record<string, unknown>> => {
    if (
      !Array.isArray(stringsOrConfig) &&
      typeof stringsOrConfig === "object" &&
      stringsOrConfig !== null &&
      !("raw" in stringsOrConfig)
    ) {
      return createComponent(tag, stringsOrConfig as ComponentConfig)
    }
    const classes = parseTemplate(stringsOrConfig as TemplateStringsArray, exprs)
    return createComponent(tag, classes)
  }) as RuntimeTagFactory
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML tag list
// ─────────────────────────────────────────────────────────────────────────────

const HTML_TAGS = [
  "div",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "main",
  "nav",
  "figure",
  "figcaption",
  "details",
  "summary",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "s",
  "u",
  "small",
  "mark",
  "abbr",
  "cite",
  "code",
  "kbd",
  "samp",
  "var",
  "time",
  "address",
  "blockquote",
  "q",
  "del",
  "ins",
  "sub",
  "sup",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "img",
  "picture",
  "video",
  "audio",
  "source",
  "track",
  "canvas",
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "g",
  "defs",
  "use",
  "symbol",
  "form",
  "input",
  "textarea",
  "select",
  "option",
  "optgroup",
  "button",
  "label",
  "fieldset",
  "legend",
  "output",
  "progress",
  "meter",
  "datalist",
  "a",
  "area",
  "map",
  "iframe",
  "embed",
  "object",
  "pre",
  "hr",
  "br",
  "wbr",
  "dialog",
  "menu",
  "template",
  "slot",
] as const

// ─────────────────────────────────────────────────────────────────────────────
// tw.server — server-only namespace with dev warning
// ─────────────────────────────────────────────────────────────────────────────

function makeServerTag(tag: React.ElementType): RuntimeTagFactory {
  const baseFactory = makeTag(tag)
  if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
    return ((
      stringsOrConfig: TemplateStringsArray | ComponentConfig,
      ...exprs: unknown[]
    ): TwStyledComponent<Record<string, unknown>> => {
      const tagName =
        typeof tag === "string"
          ? tag
          : ((tag as { displayName?: string }).displayName ?? "Component")
      console.warn(
        `[tailwind-styled-v4] tw.server.${tagName} rendered in browser. ` +
          `Ensure withTailwindStyled or Vite plugin is configured.`
      )
      return baseFactory(stringsOrConfig, ...exprs)
    }) as RuntimeTagFactory
  }
  return baseFactory
}

// Build server namespace — explicit type annotation so DTS bundler doesn't
// flatten it to Readonly<{}> (which happens with Object.freeze)
const serverFactories: Record<string, RuntimeTagFactory> = {}
for (const tag of HTML_TAGS) {
  serverFactories[tag] = makeServerTag(tag as React.ElementType)
}

export const server: TwServerObject = serverFactories as TwServerObject

// ─────────────────────────────────────────────────────────────────────────────
// tw — main export
// ─────────────────────────────────────────────────────────────────────────────

const tagFactories: Record<string, RuntimeTagFactory> = {}
for (const tag of HTML_TAGS) {
  tagFactories[tag] = makeTag(tag as React.ElementType)
}

function twCallable<C extends React.ComponentType<unknown>>(component: C): TwComponentFactory<C> {
  return makeTag(component) as TwComponentFactory<C>
}

// Explicit type annotation — TypeScript uses TwObject, DTS bundler inlines it correctly
export const tw: TwObject = Object.assign(twCallable, tagFactories, {
  server,
}) as unknown as TwObject
