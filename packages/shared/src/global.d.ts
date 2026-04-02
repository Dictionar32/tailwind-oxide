/**
 * tailwind-styled-v4 — Shared Global Window Augmentations
 *
 * Centralized declarations for runtime globals set by core packages.
 * Each producer package (core, theme) augments these with concrete types
 * via their own local `declare global` blocks — TypeScript merges them.
 *
 * This file provides the base shape so consumers (devtools, CLI, etc.)
 * can access these globals without `as any` casts.
 */

declare global {
  interface Window {
    /** Atomic class registry — maps class names to their source metadata */
    __TW_REGISTRY__?: Record<string, string>
    /** State engine registry — tracks all state-enabled components */
    __TW_STATE_REGISTRY__?: Map<string, unknown>
    /** Container query registry — tracks all container query components */
    __TW_CONTAINER_REGISTRY__?: Map<string, unknown>
    /** Live token engine bridge — provides get/set/subscribe for design tokens */
    __TW_TOKEN_ENGINE__?: {
      getToken(name: string): string | undefined
      getTokens(): Record<string, string>
      setToken(name: string, value: string): void
      setTokens(tokens: Record<string, string>): void
      applyTokenSet(tokens: Record<string, string>): void
      subscribeTokens(fn: (tokens: Record<string, string>) => void): () => void
      subscribe?(fn: (tokens: Record<string, string>) => void): () => void
    }
  }
}

export {}
