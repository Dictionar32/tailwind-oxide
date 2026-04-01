import type { TwPluginOptions } from "@tailwind-styled/plugin-api"

import { parseTwPluginOptions, readToken, resolveTokenEngine } from "@tailwind-styled/plugin-api"
import type { LoadResult, PartialResolvedId, PluginContext, TransformResult } from "rollup"

export * from "@tailwind-styled/plugin-api"

export interface TwVitePlugin {
  resolveId(
    this: PluginContext,
    source: string,
    importer: string
  ): Promise<PartialResolvedId | null>
  load(this: PluginContext, id: string): Promise<LoadResult | null>
  transform(this: PluginContext, code: string, id: string): Promise<TransformResult | null>
  getToken(name: string): string | undefined
  subscribeTokens(callback: (tokens: Record<string, string>) => void): () => void
}

export function createTwPlugin(options: TwPluginOptions = {}): TwVitePlugin {
  parseTwPluginOptions(options)

  return {
    async resolveId(source, importer) {
      if (!source.startsWith("tw.") && !source.startsWith("tw:")) return null
      const importPath = source.replace(/^tw[.:]/, "")
      const resolved = await this.resolve(importPath, importer, { skipSelf: true })
      if (resolved) return { id: resolved.id }
      return null
    },
    async load(_id) {
      return null
    },
    async transform(_code, _id) {
      return null
    },
    getToken(name) {
      const engine = resolveTokenEngine()
      return readToken(engine, name)
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
