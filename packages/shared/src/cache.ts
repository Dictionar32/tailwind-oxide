/**
 * LRUCache — Least Recently Used cache with optional TTL
 * Centralized from packages/compiler/src/incrementalEngine.ts
 */
export class LRUCache<K, V> {
  private readonly max: number
  private readonly ttlMs: number | null
  private readonly map = new Map<K, { value: V; ts: number }>()

  constructor(max = 256, ttlMs: number | null = null) {
    this.max = max
    this.ttlMs = ttlMs
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key)
    if (!entry) return undefined
    if (this.ttlMs !== null && Date.now() - entry.ts > this.ttlMs) {
      this.map.delete(key)
      return undefined
    }
    // Move to end (most recently used)
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key)
    else if (this.map.size >= this.max) {
      // Evict least recently used (first entry)
      this.map.delete(this.map.keys().next().value!)
    }
    this.map.set(key, { value, ts: Date.now() })
  }

  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  delete(key: K): void {
    this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }

  keys(): IterableIterator<K> {
    return this.map.keys()
  }

  *values(): IterableIterator<V> {
    for (const entry of this.map.values()) {
      yield entry.value
    }
  }

  *entries(): IterableIterator<[K, V]> {
    for (const [key, entry] of this.map.entries()) {
      yield [key, entry.value]
    }
  }
}
