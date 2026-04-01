import { parsePluginManifest, parseTokenRegistration, TransformRegistrationSchema } from "./schemas"
import type { CompoundCondition, TokenMap } from "@tailwind-styled/shared"

export interface TwClassResult {
  css: string
  classes: string[]
}

export interface DesignTokens {
  [key: string]: string | number | DesignTokens
}

export interface TwPluginOptions {
  classProcessor?: (classes: string[]) => TwClassResult
  tokens?: DesignTokens
  debug?: boolean
  minify?: boolean
}

export type VariantResolver = (selector: string) => string

export interface UtilityDefinition {
  [property: string]: string
}

export type { CompoundCondition, TokenMap }

export interface ComponentConfig {
  base: string
  variants: Record<string, Record<string, string>>
  compoundVariants: Array<{ class: string } & CompoundCondition>
  defaultVariants: Record<string, string>
}

export interface TransformMeta {
  componentName: string
  tag: string
}

export type TransformFn = (config: ComponentConfig, meta: TransformMeta) => ComponentConfig

export type CssHook = (css: string) => string

export interface TwContext {
  addVariant(name: string, resolver: VariantResolver): void
  addUtility(name: string, styles: UtilityDefinition): void
  addToken(name: string, value: string): void
  addTransform(fn: TransformFn): void
  onGenerateCSS(hook: CssHook): void
  onBuildEnd(hook: () => void | Promise<void>): void
  getToken(name: string): string | undefined
  subscribeTokens(callback: (tokens: TokenMap) => void): () => void
  readonly config: Record<string, unknown>
}

export interface TwPlugin {
  name: string
  setup(ctx: TwContext): void
}

export interface PluginRegistry {
  variants: Map<string, VariantResolver>
  utilities: Map<string, UtilityDefinition>
  tokens: Map<string, string>
  transforms: TransformFn[]
  cssHooks: CssHook[]
  buildHooks: Array<() => void | Promise<void>>
  plugins: Set<string>
}

export interface TokenEngineAPI {
  getToken?: (name: string) => string | undefined
  getTokens?: () => Record<string, string> | undefined
  subscribeTokens?: (callback: (tokens: Record<string, string>) => void) => () => void
  subscribe?: (callback: (tokens: Record<string, string>) => void) => () => void
}

const TOKEN_ENGINE_KEY = "__TW_TOKEN_ENGINE__"

export function resolveTokenEngine(): TokenEngineAPI | undefined {
  const engine = (globalThis as Record<string, unknown>)[TOKEN_ENGINE_KEY]
  if (engine && typeof engine === "object") {
    return engine as TokenEngineAPI
  }
  return undefined
}

export function readToken(engine: TokenEngineAPI | undefined, name: string): string | undefined {
  if (!engine) return undefined
  if (typeof engine.getToken === "function") return engine.getToken(name)
  if (typeof engine.getTokens === "function") {
    const tokens = engine.getTokens()
    return tokens?.[name]
  }
  return undefined
}

export interface TransformContext {
  filename?: string
  componentName?: string
  tag?: string
}

export interface TwGlobalRegistry {
  transforms: Array<(config: ComponentConfig, ctx: TransformContext) => ComponentConfig>
  tokens: Record<string, string>
}

const transformRegistry: TwGlobalRegistry = {
  transforms: [],
  tokens: {},
}

const normalizeTokenName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()

export function getGlobalRegistry(): TwGlobalRegistry {
  return transformRegistry
}

export function registerTransform(
  transform: (config: ComponentConfig, ctx: TransformContext) => ComponentConfig
): void {
  TransformRegistrationSchema.parse(transform)
  transformRegistry.transforms.push(transform)
}

export function registerToken(name: string, value: string): void {
  const parsed = parseTokenRegistration({ name, value })
  transformRegistry.tokens[parsed.name] = parsed.value
}

export function createPluginRegistry(): PluginRegistry {
  return {
    variants: new Map(),
    utilities: new Map(),
    tokens: new Map(),
    transforms: [],
    cssHooks: [],
    buildHooks: [],
    plugins: new Set(),
  }
}

const legacyState = { globalRegistry: createPluginRegistry() }

export function resetGlobalRegistry(): void {
  transformRegistry.transforms.length = 0
  for (const key of Object.keys(transformRegistry.tokens)) {
    delete transformRegistry.tokens[key]
  }
  legacyState.globalRegistry = createPluginRegistry()
}

export function createPluginContext(
  registry: PluginRegistry,
  config: Record<string, unknown> = {}
): TwContext {
  const isLegacyRegistry = registry === legacyState.globalRegistry

  return {
    config,
    addVariant(name, resolver) {
      registry.variants.set(name, resolver)
    },
    addUtility(name, styles) {
      registry.utilities.set(name, styles)
    },
    addToken(name, value) {
      const parsed = parseTokenRegistration({ name, value })
      const normalized = normalizeTokenName(parsed.name)
      registry.tokens.set(normalized, parsed.value)
      if (isLegacyRegistry) {
        transformRegistry.tokens[normalized] = parsed.value
      }
    },
    addTransform(fn) {
      TransformRegistrationSchema.parse(fn)
      registry.transforms.push(fn)
      if (isLegacyRegistry) {
        transformRegistry.transforms.push((config, ctx) =>
          fn(config, {
            componentName: ctx.componentName ?? "",
            tag: ctx.tag ?? "",
          })
        )
      }
    },
    onGenerateCSS(hook) {
      registry.cssHooks.push(hook)
    },
    onBuildEnd(hook) {
      registry.buildHooks.push(hook)
    },
    getToken(name) {
      return readToken(resolveTokenEngine(), name)
    },
    subscribeTokens(callback) {
      const engine = resolveTokenEngine()
      if (!engine) return () => {}
      if (typeof engine.subscribeTokens === "function") return engine.subscribeTokens(callback)
      if (typeof engine.subscribe === "function") return engine.subscribe(callback)
      return () => {}
    },
  }
}

export function createTw(config: Record<string, unknown> = {}): TwContext & {
  registry: {
    plugins: Set<string>
    variants: Map<string, VariantResolver>
    utilities: Map<string, UtilityDefinition>
    tokens: Map<string, string>
  }
  use: (plugin: TwPlugin) => void
} {
  const registry = createPluginRegistry()
  const ctx = createPluginContext(registry, config)

  const result = ctx as TwContext & {
    registry: {
      plugins: Set<string>
      variants: Map<string, VariantResolver>
      utilities: Map<string, UtilityDefinition>
      tokens: Map<string, string>
    }
    use: (plugin: TwPlugin) => void
  }

  result.registry = {
    plugins: registry.plugins,
    variants: registry.variants,
    utilities: registry.utilities,
    tokens: registry.tokens,
  }

  result.use = (plugin: TwPlugin) => {
    const manifest = parsePluginManifest(plugin)
    manifest.setup(ctx)
    registry.plugins.add(manifest.name)
  }

  if (config.plugins && Array.isArray(config.plugins)) {
    for (const plugin of config.plugins) {
      result.use(parsePluginManifest(plugin))
    }
  }

  return result
}

export function use(plugin: TwPlugin): void {
  const ctx = createPluginContext(legacyState.globalRegistry)
  parsePluginManifest(plugin).setup(ctx)
}

export function presetTokens(tokens: Record<string, string>): TwPlugin {
  return {
    name: "preset-tokens",
    setup(ctx) {
      for (const [name, value] of Object.entries(tokens)) {
        ctx.addToken(name, value)
      }
    },
  }
}

export function presetVariants(variants: Record<string, VariantResolver>): TwPlugin {
  return {
    name: "preset-variants",
    setup(ctx) {
      for (const [name, resolver] of Object.entries(variants)) {
        ctx.addVariant(name, resolver)
      }
    },
  }
}

export function presetScrollbar(): TwPlugin {
  return {
    name: "preset-scrollbar",
    setup(ctx) {
      ctx.addVariant("scrollbar-thin", () => "::-webkit-scrollbar{width:8px;height:8px}")
      ctx.addVariant("scrollbar-none", () => "::-webkit-scrollbar{display:none}")
      ctx.addUtility("scrollbar-hide", { "-ms-overflow-style": "none", "scrollbar-width": "none" })
    },
  }
}

// Re-export schemas
export {
  type PluginManifestInput,
  PluginManifestSchema,
  parsePluginManifest,
  parseTokenRegistration,
  parseTwPluginOptions,
  type TokenRegistrationInput,
  TokenRegistrationSchema,
  TransformRegistrationSchema,
  type TwPluginOptionsInput,
  TwPluginOptionsSchema,
} from "./schemas"
