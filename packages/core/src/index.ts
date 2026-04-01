/**
 * tailwind-styled-v4 v3 — Public API
 *
 * New in v3:
 *   - Reactive State Engine: tw.button({ state: { active: "..." } })
 *   - Container Query Engine: tw.div({ container: { md: "flex-row" } })
 *   - Live Token Engine: liveToken({ primary: "#3b82f6" })
 */

export type { ContainerEntry } from "./containerQuery"
// ── Container Query Engine ────────────────────────────────────────────────────
export {
  generateContainerCss,
  getContainerRegistry,
  processContainer,
} from "./containerQuery"
export { createComponent } from "./createComponent"
export { cv } from "./cv"
export { cn, cx, cxm } from "./cx"
export type { LiveTokenSet, TokenMap, TokenSubscriber } from "./liveTokenEngine"
// ── Live Token Engine ─────────────────────────────────────────────────────────
export {
  applyTokenSet,
  createUseTokens,
  generateTokenCssString,
  getToken,
  getTokens,
  liveToken,
  setToken,
  setTokens,
  subscribeTokens,
  tokenRef,
  tokenRef as containerRef,
  tokenVar,
} from "./liveTokenEngine"
export type { MergeOptions } from "./merge"
export { createTwMerge, mergeWithRules, twMerge } from "./merge"
export type { ParsedClass, ParsedClassModifier } from "./parser"
// ── Tailwind v4 class parser ────────────────────────────────────────────────
export { parseClassToken, parseTailwindClasses, splitClassList } from "./parser"
export type { SubComponentEntry, SubComponentProps } from "./registry"
// ── Sub-Component Registry ───────────────────────────────────────────────────
export {
  getAllSubComponents,
  getSubComponent,
  registerSubComponent,
  withSubComponents,
} from "./registry"
export type { StateComponentEntry } from "./stateEngine"
// ── Reactive State Engine ─────────────────────────────────────────────────────
export {
  generateStateCss,
  getStateRegistry,
  processState,
} from "./stateEngine"
export type { StyledOptions, StyledProps } from "./styled"
export { resolveStyledClassName, styled } from "./styled"
export type {
  StyledSystemConfig,
  StyledSystemInstance,
  SystemComponentConfig,
  SystemComponentFactory,
  SystemTokenMap,
} from "./styledSystem"
// ── Design System Factory ─────────────────────────────────────────────────────
export { createStyledSystem } from "./styledSystem"
export type { ThemeConfig } from "./themeReader"
// ── CSS-first theme reader ──────────────────────────────────────────────────
export {
  clearThemeReaderCache,
  extractThemeFromCSS,
  generateTypeDefinitions,
  resolveThemeValue,
} from "./themeReader"
// ── Core ──────────────────────────────────────────────────────────────────────
export { server, tw } from "./twProxy"
export type { ResolvedThemeTokens, ThemeTokenMap } from "./twTheme"
// ── Tailwind v4 CSS Variables ─────────────────────────────────────────────────
export { createTheme, cssVar, t, twVar, v4Tokens } from "./twTheme"
// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  ComponentConfig,
  ContainerConfig,
  CvFn,
  HtmlTagName,
  InferVariantProps,
  StateConfig,
  StyledComponentProps,
  SubComponentMap,
  TwComponentFactory,
  TwObject,
  TwStyledComponent,
  TwSubComponent,
  TwTagFactory,
  TwTagFactoryAny,
  VariantLiterals,
} from "./types"
