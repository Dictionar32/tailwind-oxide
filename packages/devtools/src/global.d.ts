declare global {
  interface Window {
    __TW_REGISTRY__?: Record<string, string>
    __TW_STATE_REGISTRY__?: Map<string, unknown>
    __TW_CONTAINER_REGISTRY__?: Map<string, unknown>
    __TW_TOKEN_ENGINE__?: {
      getToken(name: string): string | undefined
      getTokens(): Record<string, string>
      setToken(name: string, value: string): void
      subscribeTokens(fn: (tokens: Record<string, string>) => void): () => void
      subscribe?(fn: (tokens: Record<string, string>) => void): () => void
    }
  }
}

export {}
