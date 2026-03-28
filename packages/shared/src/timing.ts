/** Debounce: delay fn execution until after `ms` ms of inactivity */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  const debounceState = {
    timer: null as ReturnType<typeof setTimeout> | null,
    clear() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    },
  }
  return ((...args: unknown[]) => {
    debounceState.clear()
    debounceState.timer = setTimeout(() => {
      debounceState.clear()
      fn(...args)
    }, ms)
  }) as T
}

/** Throttle: execute fn at most once per `ms` ms */
export function throttle<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  const throttleState = {
    last: 0,
    update() {
      this.last = Date.now()
    },
  }
  return ((...args: unknown[]) => {
    const now = Date.now()
    if (now - throttleState.last >= ms) {
      throttleState.update()
      fn(...args)
    }
  }) as T
}
