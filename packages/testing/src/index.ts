/**
 * tailwind-styled-v4 — Testing Utilities
 *
 * Integrasi dengan Jest / Vitest untuk test komponen tw().
 *
 * @example
 * // vitest.config.ts
 * import { tailwindStyledSetup } from '@tailwind-styled/testing'
 * export default defineConfig({ test: { setupFiles: ['@tailwind-styled/testing/setup'] } })
 *
 * // Button.test.ts
 * import { render } from '@testing-library/react'
 * import { expectClasses, getVariantClass } from '@tailwind-styled/testing'
 *
 * test('Button renders primary variant', () => {
 *   const { container } = render(<Button intent="primary" />)
 *   expectClasses(container.firstChild, ['bg-blue-500', 'text-white'])
 * })
 */

// ─── Jest/Vitest custom matchers ─────────────────────────────────────────────

/**
 * Custom matcher: toHaveClass
 * Dipakai langsung atau via expect.extend(tailwindMatchers)
 *
 * @example
 * expect(element).toHaveClass('bg-blue-500')
 */
export function toHaveClass(className: string) {
  return (value: { classList?: { contains: (name: string) => boolean } }) => {
    const pass = Boolean(value?.classList?.contains(className))
    return {
      pass,
      message: () => `expected element ${pass ? "not " : ""}to contain class '${className}'`,
    }
  }
}

/**
 * Custom matcher: toHaveClasses
 * Cek beberapa class sekaligus
 *
 * @example
 * expect(element).toHaveClasses(['px-4', 'py-2', 'rounded'])
 */
export function toHaveClasses(classNames: string[]) {
  return (value: Element | null | undefined) => {
    if (!value) return { pass: false, message: () => "element is null or undefined" }
    const missing = classNames.filter((c) => !value.classList.contains(c))
    const pass = missing.length === 0
    return {
      pass,
      message: () =>
        pass
          ? `expected element not to have all classes: ${classNames.join(", ")}`
          : `expected element to have classes: ${missing.join(", ")}`,
    }
  }
}

/**
 * Custom matcher: toNotHaveClass
 *
 * @example
 * expect(element).toNotHaveClass('hidden')
 */
export function toNotHaveClass(className: string) {
  return (value: Element | null | undefined) => {
    if (!value) return { pass: false, message: () => "element is null or undefined" }
    const pass = !value.classList.contains(className)
    return {
      pass,
      message: () => `expected element ${pass ? "" : "not "}to have class '${className}'`,
    }
  }
}

/** Semua matchers — pakai dengan expect.extend(tailwindMatchers) */
export const tailwindMatchers = { toHaveClass, toHaveClasses, toNotHaveClass }

// ─── Helper utilities ────────────────────────────────────────────────────────

/**
 * Assert element punya semua class yang diharapkan.
 * Lebih ergonomis dari `expect(el).toHaveClasses([...])` untuk banyak class.
 *
 * @example
 * const { container } = render(<Button intent="primary" size="lg" />)
 * expectClasses(container.firstChild, ['bg-blue-500', 'text-white', 'h-12'])
 */
export function expectClasses(element: Element | null | undefined, classes: string[]): void {
  if (!element) throw new Error("expectClasses: element is null or undefined")
  const missing = classes.filter((c) => !element.classList.contains(c))
  if (missing.length > 0) {
    throw new Error(
      `Expected element to have classes: ${missing.join(", ")}\n` +
        `  Actual classes: ${element.className}`
    )
  }
}

/**
 * Assert element tidak punya class tertentu.
 *
 * @example
 * expectNoClasses(container.firstChild, ['opacity-50', 'cursor-not-allowed'])
 */
export function expectNoClasses(element: Element | null | undefined, classes: string[]): void {
  if (!element) throw new Error("expectNoClasses: element is null or undefined")
  const found = classes.filter((c) => element.classList.contains(c))
  if (found.length > 0) {
    throw new Error(
      `Expected element NOT to have classes: ${found.join(", ")}\n` +
        `  Actual classes: ${element.className}`
    )
  }
}

/**
 * Extract class list dari element sebagai sorted array.
 * Berguna untuk snapshot testing.
 *
 * @example
 * expect(getClassList(element)).toMatchSnapshot()
 */
export function getClassList(element: Element | null | undefined): string[] {
  if (!element) return []
  return Array.from(element.classList).sort()
}

// ─── Variant snapshot helpers ────────────────────────────────────────────────

/**
 * Buat snapshot dari semua kombinasi variant.
 * Berguna untuk regression testing pada styled components.
 *
 * @example
 * const buttonVariants = snapshotVariants(
 *   (props) => {
 *     const { container } = render(<Button {...props} />)
 *     return container.firstChild?.className ?? ''
 *   },
 *   [
 *     { intent: 'primary', size: 'sm' },
 *     { intent: 'primary', size: 'lg' },
 *     { intent: 'danger',  size: 'sm' },
 *   ]
 * )
 * expect(buttonVariants).toMatchSnapshot()
 */
export function snapshotVariants<T>(render: (variant: T) => string, variants: T[]) {
  return variants.map((variant) => ({
    variant,
    output: render(variant),
  }))
}

/**
 * Generate semua kombinasi dari variant matrix.
 *
 * @example
 * const combinations = expandVariantMatrix({
 *   intent: ['primary', 'danger'],
 *   size: ['sm', 'md', 'lg'],
 *   disabled: [true, false],
 * })
 * // → 2 × 3 × 2 = 12 kombinasi
 */
export function expandVariantMatrix(
  matrix: Record<string, Array<string | number | boolean>>
): Array<Record<string, string | number | boolean>> {
  const keys = Object.keys(matrix)
  if (keys.length === 0) return [{}]

  const result: Array<Record<string, string | number | boolean>> = []

  function walk(index: number, current: Record<string, string | number | boolean>) {
    if (index >= keys.length) {
      result.push({ ...current })
      return
    }
    const key = keys[index]!
    for (const value of matrix[key] ?? []) {
      current[key] = value
      walk(index + 1, current)
    }
  }

  walk(0, {})
  return result
}

/**
 * Test semua kombinasi variant sekaligus — no missing coverage.
 *
 * @example
 * testAllVariants(
 *   Button,
 *   { intent: ['primary','danger'], size: ['sm','lg'] },
 *   (el, variant) => {
 *     expect(el).not.toBeNull()
 *     if (variant.intent === 'primary') expectClasses(el, ['bg-blue-500'])
 *   }
 * )
 */
export function testAllVariants(
  matrix: Record<string, Array<string | number | boolean>>,
  testFn: (variant: Record<string, string | number | boolean>) => void
): void {
  const combinations = expandVariantMatrix(matrix)
  for (const variant of combinations) {
    testFn(variant)
  }
}

// ─── CSS-in-JS output assertions ─────────────────────────────────────────────

/**
 * Bandingkan dua class string secara semantik (urutan tidak penting).
 *
 * @example
 * expectClassesEqual('px-4 py-2 bg-blue-500', 'bg-blue-500 px-4 py-2') // pass
 */
export function expectClassesEqual(actual: string, expected: string): void {
  const actualSet = new Set(actual.trim().split(/\s+/).filter(Boolean))
  const expectedSet = new Set(expected.trim().split(/\s+/).filter(Boolean))

  const missing = [...expectedSet].filter((c) => !actualSet.has(c))
  const extra = [...actualSet].filter((c) => !expectedSet.has(c))

  if (missing.length > 0 || extra.length > 0) {
    const parts: string[] = []
    if (missing.length > 0) parts.push(`Missing: ${missing.join(", ")}`)
    if (extra.length > 0) parts.push(`Extra:   ${extra.join(", ")}`)
    throw new Error(`Class mismatch:\n  ${parts.join("\n  ")}`)
  }
}

// ─── Engine metrics matchers ──────────────────────────────────────────────────

export interface EngineMetricsSnapshot {
  totalFiles?: number
  uniqueClasses?: number
  buildTimeMs?: number
  cssBytes?: number
  cacheHits?: number
  cacheMisses?: number
  incrementalRuns?: number
  fullRescans?: number
}

/**
 * Assert engine metrics snapshot meets minimum thresholds.
 *
 * @example
 * const result = await engine.build()
 * expectEngineMetrics(metrics.snapshot(), {
 *   totalFiles: 10,
 *   buildTimeMs: 5000, // max
 * })
 */
export function expectEngineMetrics(
  metrics: EngineMetricsSnapshot,
  expectations: {
    minFiles?: number
    maxBuildTimeMs?: number
    minUniqueClasses?: number
    cacheHitRateMin?: number // 0–1
  }
): void {
  if (expectations.minFiles !== undefined) {
    const actual = metrics.totalFiles ?? 0
    if (actual < expectations.minFiles) {
      throw new Error(
        `Engine metrics: expected at least ${expectations.minFiles} files, got ${actual}`
      )
    }
  }

  if (expectations.maxBuildTimeMs !== undefined) {
    const actual = metrics.buildTimeMs ?? 0
    if (actual > expectations.maxBuildTimeMs) {
      throw new Error(
        `Engine metrics: build took ${actual}ms, expected ≤ ${expectations.maxBuildTimeMs}ms`
      )
    }
  }

  if (expectations.minUniqueClasses !== undefined) {
    const actual = metrics.uniqueClasses ?? 0
    if (actual < expectations.minUniqueClasses) {
      throw new Error(
        `Engine metrics: expected at least ${expectations.minUniqueClasses} unique classes, got ${actual}`
      )
    }
  }

  if (expectations.cacheHitRateMin !== undefined) {
    const hits = metrics.cacheHits ?? 0
    const total = hits + (metrics.cacheMisses ?? 0)
    const rate = total > 0 ? hits / total : 0
    if (rate < expectations.cacheHitRateMin) {
      throw new Error(
        `Engine metrics: cache hit rate ${(rate * 100).toFixed(1)}%, expected ≥ ${(expectations.cacheHitRateMin * 100).toFixed(1)}%`
      )
    }
  }
}

/**
 * Custom Jest/Vitest matcher: toHaveEngineMetrics
 *
 * @example
 * expect(metrics).toHaveEngineMetrics({ minFiles: 1 })
 */
export function toHaveEngineMetrics(expectations: Parameters<typeof expectEngineMetrics>[1]) {
  return (metrics: EngineMetricsSnapshot) => {
    try {
      expectEngineMetrics(metrics, expectations)
      return { pass: true, message: () => "engine metrics matched expectations" }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { pass: false, message: () => msg }
    }
  }
}

/** All matchers including engine metrics */
export const tailwindMatchersWithMetrics = {
  toHaveClass,
  toHaveClasses,
  toNotHaveClass,
  toHaveEngineMetrics,
}
