import { LRUCache } from "@tailwind-styled/shared"

import type { AnimationRegistry } from "./registry"

const DEFAULT_PRESET_CACHE_LIMIT = 32

export function createAnimationPresets(registry: AnimationRegistry) {
  const cache = new LRUCache<string, Promise<string>>(DEFAULT_PRESET_CACHE_LIMIT)

  const withCache =
    (cacheKey: string, factory: () => Promise<string>): (() => Promise<string>) =>
    async () => {
      const cached = cache.get(cacheKey)
      if (cached) {
        const className = await cached
        if (registry.has(className)) return className
        cache.delete(cacheKey)
      }

      const pending = factory()
      cache.set(cacheKey, pending)
      try {
        return await pending
      } catch (error) {
        cache.delete(cacheKey)
        throw error
      }
    }

  return {
    fadeIn: withCache(
      "fadeIn",
      async () =>
        (await registry.compileAnimation({ from: "opacity-0", to: "opacity-100", duration: 200 }))
          .className
    ),
    fadeOut: withCache(
      "fadeOut",
      async () =>
        (await registry.compileAnimation({ from: "opacity-100", to: "opacity-0", duration: 200 }))
          .className
    ),
    slideUp: withCache(
      "slideUp",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-0 translate-y-4",
            to: "opacity-100 translate-y-0",
            duration: 300,
          })
        ).className
    ),
    slideDown: withCache(
      "slideDown",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-0 -translate-y-4",
            to: "opacity-100 translate-y-0",
            duration: 300,
          })
        ).className
    ),
    slideLeft: withCache(
      "slideLeft",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-0 translate-x-4",
            to: "opacity-100 translate-x-0",
            duration: 300,
          })
        ).className
    ),
    slideRight: withCache(
      "slideRight",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-0 -translate-x-4",
            to: "opacity-100 translate-x-0",
            duration: 300,
          })
        ).className
    ),
    scaleIn: withCache(
      "scaleIn",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-0 scale-95",
            to: "opacity-100 scale-100",
            duration: 200,
            easing: "cubic-bezier(0.16,1,0.3,1)",
          })
        ).className
    ),
    scaleOut: withCache(
      "scaleOut",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-100 scale-100",
            to: "opacity-0 scale-95",
            duration: 150,
          })
        ).className
    ),
    blurIn: withCache(
      "blurIn",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-0 blur-sm",
            to: "opacity-100 blur-none",
            duration: 300,
          })
        ).className
    ),
    bounceIn: withCache(
      "bounceIn",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-0 scale-50",
            to: "opacity-100 scale-100",
            duration: 400,
            easing: "cubic-bezier(0.34,1.56,0.64,1)",
          })
        ).className
    ),
    spinIn: withCache(
      "spinIn",
      async () =>
        (
          await registry.compileAnimation({
            from: "opacity-0 rotate-180 scale-50",
            to: "opacity-100 rotate-0 scale-100",
            duration: 400,
            easing: "cubic-bezier(0.16,1,0.3,1)",
          })
        ).className
    ),
  } as const
}
