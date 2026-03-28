/**
 * tailwind-styled-v4 — Route CSS Collector
 */

export interface RouteClassMap {
  files: Map<string, Set<string>>
  routes: Map<string, Set<string>>
  global: Set<string>
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Class Collector - Factory Pattern (no let!)
// ─────────────────────────────────────────────────────────────────────────────

const createEmptyCollector = (): RouteClassMap => ({
  files: new Map(),
  routes: new Map(),
  global: new Set(),
})

const createRouteClassCollector = () => {
  const collectorState: { current: RouteClassMap } = {
    current: createEmptyCollector(),
  }

  return {
    get: (): RouteClassMap => collectorState.current,
    registerFile: (filepath: string, classes: string[]): void => {
      if (!collectorState.current.files.has(filepath)) {
        collectorState.current.files.set(filepath, new Set())
      }
      const fileSet = collectorState.current.files.get(filepath)!
      classes.forEach((c) => fileSet.add(c))

      const route = fileToRoute(filepath)
      if (route) {
        if (!collectorState.current.routes.has(route)) {
          collectorState.current.routes.set(route, new Set())
        }
        collectorState.current.routes.get(route)!.add(filepath)
      }
    },
    registerGlobal: (classes: string[]): void => {
      classes.forEach((c) => collectorState.current.global.add(c))
    },
    getRouteClasses: (route: string): Set<string> => {
      const result = new Set<string>(collectorState.current.global)
      const routeFiles = collectorState.current.routes.get(route) ?? new Set()
      for (const filepath of routeFiles) {
        const fileClasses = collectorState.current.files.get(filepath) ?? new Set()
        fileClasses.forEach((c) => result.add(c))
      }
      return result
    },
    getAllRoutes: (): string[] => {
      return Array.from(collectorState.current.routes.keys()).sort()
    },
    reset: (): void => {
      collectorState.current = createEmptyCollector()
    },
  }
}

const collector = createRouteClassCollector()

export const registerFileClasses = collector.registerFile
export const registerGlobalClasses = collector.registerGlobal
export const getRouteClasses = collector.getRouteClasses
export const getAllRoutes = collector.getAllRoutes

export const getCollector = (): RouteClassMap => collector.get()

export const resetCollector = (): void => collector.reset()

export const fileToRoute = (filepath: string): string | null => {
  const normalized = filepath.replace(/\\/g, "/")

  if (
    normalized.includes("/layout.") ||
    normalized.includes("/loading.") ||
    normalized.includes("/error.")
  ) {
    return "__global"
  }

  const pageMatch = normalized.match(/\/app\/(.+?)\/page\.[tj]sx?$/)
  if (pageMatch) return `/${pageMatch[1]}`

  const rootPage = normalized.match(/\/app\/page\.[tj]sx?$/)
  if (rootPage) return "/"

  const pagesMatch = normalized.match(/\/pages\/(.+?)\.[tj]sx?$/)
  if (pagesMatch) {
    const route = pagesMatch[1].replace(/\/index$/, "")
    return `/${route}`
  }

  if (
    normalized.includes("/components/") ||
    normalized.includes("/ui/") ||
    normalized.includes("/shared/")
  ) {
    return "__global"
  }

  return null
}

export const getCollectorSummary = (): string => {
  const routes = getAllRoutes()
  const col = collector.get()
  const totalFiles = col.files.size
  const totalGlobal = col.global.size

  const lines = [
    `[tailwind-styled-v4] Route CSS Summary:`,
    `  Files processed: ${totalFiles}`,
    `  Global classes: ${totalGlobal}`,
    `  Routes found: ${routes.length}`,
    ...routes.map((r) => {
      const cls = getRouteClasses(r).size
      return `    ${r} → ${cls} classes`
    }),
  ]

  return lines.join("\n")
}
