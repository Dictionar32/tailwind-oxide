import React from "react"

import type { TokenMap } from '@tailwind-styled/shared'
export type { TokenMap }

export type TokenSubscriber = (tokens: TokenMap) => void

export interface LiveTokenSet {
  vars: Record<string, string>
  get(name: string): string | undefined
  set(name: string, value: string): void
  setAll(tokens: TokenMap): void
  snapshot(): TokenMap
}

export interface LiveTokenEngineBridge {
  getToken(name: string): string | undefined
  getTokens(): TokenMap
  setToken(name: string, value: string): void
  setTokens(tokens: TokenMap): void
  applyTokenSet(tokens: TokenMap): void
  subscribeTokens(fn: TokenSubscriber): () => void
  subscribe?(fn: TokenSubscriber): () => void
}

interface LiveTokenEngineRuntime {
  liveToken(tokens: TokenMap): LiveTokenSet
  getToken(name: string): string | undefined
  getTokens(): TokenMap
  setToken(name: string, value: string): void
  setTokens(tokens: TokenMap): void
  applyTokenSet(tokens: TokenMap): void
  generateTokenCssString(): string
  subscribe(fn: TokenSubscriber): () => void
}

const TOKEN_ENGINE_KEY = "__TW_TOKEN_ENGINE__"

export function tokenVar(name: string): string {
  const normalized = name.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()
  return `--tw-token-${normalized}`
}

export function tokenRef(name: string): string {
  return `var(${tokenVar(name)})`
}

const buildRootCss = (tokens: TokenMap): string => {
  const vars = Object.entries(tokens)
    .map(([name, value]) => `  ${tokenVar(name)}: ${value};`)
    .join("\n")
  return `:root {\n${vars}\n}`
}

const createLiveTokenEngine = (): LiveTokenEngineRuntime => {
  const state = {
    currentTokens: {} as TokenMap,
    styleEl: null as HTMLStyleElement | null,
  }
  const subscribers = new Set<TokenSubscriber>()

  const syncStyleEl = (): void => {
    if (typeof document === "undefined") return

    if (!state.styleEl) {
      const styleEl = document.createElement("style")
      styleEl.id = "tw-live-tokens"
      styleEl.setAttribute("data-tw-tokens", "true")
      document.head.appendChild(styleEl)
      state.styleEl = styleEl
    }

    state.styleEl.textContent = buildRootCss(state.currentTokens)
  }

  const notifySubscribers = (): void => {
    const snapshot = { ...state.currentTokens }
    for (const subscriber of subscribers) {
      try {
        subscriber(snapshot)
      } catch {
        // Intentionally ignore subscriber errors.
      }
    }
  }

  const setToken = (name: string, value: string): void => {
    state.currentTokens = { ...state.currentTokens, [name]: value }
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(tokenVar(name), value)
    }
    syncStyleEl()
    notifySubscribers()
  }

  const setTokens = (tokens: TokenMap): void => {
    state.currentTokens = { ...state.currentTokens, ...tokens }
    if (typeof document !== "undefined") {
      const root = document.documentElement
      for (const [name, value] of Object.entries(tokens)) {
        root.style.setProperty(tokenVar(name), value)
      }
    }
    syncStyleEl()
    notifySubscribers()
  }

  const applyTokenSet = (tokens: TokenMap): void => {
    if (typeof document !== "undefined") {
      const root = document.documentElement
      for (const name of Object.keys(state.currentTokens)) {
        if (!(name in tokens)) {
          root.style.removeProperty(tokenVar(name))
        }
      }
      for (const [name, value] of Object.entries(tokens)) {
        root.style.setProperty(tokenVar(name), value)
      }
    }

    state.currentTokens = { ...tokens }
    syncStyleEl()
    notifySubscribers()
  }

  return {
    liveToken(tokens: TokenMap): LiveTokenSet {
      setTokens(tokens)

      const vars: Record<string, string> = {}
      for (const name of Object.keys(tokens)) {
        vars[name] = tokenRef(name)
      }

      return {
        vars,
        get(name: string) {
          return state.currentTokens[name]
        },
        set(name: string, value: string) {
          setToken(name, value)
        },
        setAll(nextTokens: TokenMap) {
          setTokens(nextTokens)
        },
        snapshot() {
          return { ...state.currentTokens }
        },
      }
    },
    getToken(name: string): string | undefined {
      return state.currentTokens[name]
    },
    getTokens(): TokenMap {
      return { ...state.currentTokens }
    },
    setToken,
    setTokens,
    applyTokenSet,
    generateTokenCssString(): string {
      return buildRootCss(state.currentTokens)
    },
    subscribe(fn: TokenSubscriber): () => void {
      subscribers.add(fn)
      return () => {
        subscribers.delete(fn)
      }
    },
  }
}

const engine = createLiveTokenEngine()

export function liveToken(tokens: TokenMap): LiveTokenSet {
  return engine.liveToken(tokens)
}

export function setToken(name: string, value: string): void {
  engine.setToken(name, value)
}

export function setTokens(tokens: TokenMap): void {
  engine.setTokens(tokens)
}

export function applyTokenSet(tokens: TokenMap): void {
  engine.applyTokenSet(tokens)
}

export function getToken(name: string): string | undefined {
  return engine.getToken(name)
}

export function getTokens(): TokenMap {
  return engine.getTokens()
}

export function subscribeTokens(fn: TokenSubscriber): () => void {
  return engine.subscribe(fn)
}

export function generateTokenCssString(): string {
  return engine.generateTokenCssString()
}

export function createUseTokens() {
  return function useTokens(): TokenMap {
    const [tokens, setTokensState] = React.useState<TokenMap>(engine.getTokens())

    React.useEffect(() => {
      setTokensState(engine.getTokens())
      return engine.subscribe((nextTokens) => setTokensState(nextTokens))
    }, [])

    return tokens
  }
}

export const liveTokenEngine: LiveTokenEngineBridge = {
  getToken: engine.getToken,
  getTokens: engine.getTokens,
  setToken: engine.setToken,
  setTokens: engine.setTokens,
  applyTokenSet: engine.applyTokenSet,
  subscribeTokens: engine.subscribe,
  subscribe: engine.subscribe,
}

declare global {
  interface Window {
    __TW_TOKEN_ENGINE__?: LiveTokenEngineBridge
  }
}

const globalTokenEngine = globalThis as typeof globalThis & {
  [TOKEN_ENGINE_KEY]?: LiveTokenEngineBridge
}

globalTokenEngine[TOKEN_ENGINE_KEY] = liveTokenEngine
if (typeof window !== "undefined") {
  window.__TW_TOKEN_ENGINE__ = liveTokenEngine
}
