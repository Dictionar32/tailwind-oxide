import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import {
  analyzeWorkspace as runWorkspaceAnalysis,
  type AnalyzerReport,
  type AnalyzerSemanticReport,
} from "@tailwind-styled/analyzer"
import { generateCssForClasses, mergeClassesStatic } from "@tailwind-styled/compiler"
import {
  type ScanWorkspaceOptions,
  type ScanWorkspaceResult,
  scanWorkspaceAsync,
} from "@tailwind-styled/scanner"
import { createLogger } from "@tailwind-styled/shared"

import { applyIncrementalChange } from "./incremental"
import { EngineMetricsCollector, type EngineMetricsSnapshot } from "./metrics"
import {
  type EnginePlugin,
  runAfterBuild,
  runAfterScan,
  runAfterWatch,
  runBeforeBuild,
  runBeforeScan,
  runBeforeWatch,
  runOnError,
  runTransformClasses,
} from "./plugin-api"
import { type WorkspaceWatcher, watchWorkspace } from "./watch"

const DEFAULT_LARGE_FILE_THRESHOLD_BYTES = 10 * 1024 * 1024
const DEFAULT_FLUSH_DEBOUNCE_MS = 100
const DEFAULT_MAX_EVENTS_PER_FLUSH = 100
const DEFAULT_WATCH_EVENT_TYPE: EngineBuildWatchEventType = "change"

const configState = {
  cachedTailwindConfig: undefined as Record<string, unknown> | undefined,
  tailwindConfigLoaded: false,
  setLoaded(config: Record<string, unknown> | undefined) {
    this.cachedTailwindConfig = config
    this.tailwindConfigLoaded = true
  },
  getConfig() {
    return this.cachedTailwindConfig
  },
  isLoaded() {
    return this.tailwindConfigLoaded
  },
}
const log = createLogger("engine")

export interface EngineOptions {
  root?: string
  scanner?: ScanWorkspaceOptions
  compileCss?: boolean
  tailwindConfigPath?: string
  plugins?: EnginePlugin[]
  /** Enable analyzer integration - provides semantic report (unused classes, conflicts). Default: false */
  analyze?: boolean
}

export interface EngineWatchOptions {
  debounceMs?: number
  maxEventsPerFlush?: number
  largeFileThreshold?: number
}

export interface BuildResult {
  scan: ScanWorkspaceResult
  mergedClassList: string
  css: string
  /** Analyzer semantic report - present when analyze: true in options */
  analysis?: {
    unusedClasses: string[]
    classConflicts: Array<{ className: string; files: string[]; classes?: string[]; message?: string }>
    classUsage: Record<string, number>
    semantic?: AnalyzerSemanticReport
    report: AnalyzerReport
  }
}

type EngineBuildWatchEventType = "initial" | "change" | "unlink" | "full-rescan"

export type EngineWatchEvent =
  | {
      type: EngineBuildWatchEventType
      filePath?: string
      result: BuildResult
      metrics?: EngineMetricsSnapshot
    }
  | {
      type: "error"
      filePath?: string
      error: string
      metrics?: EngineMetricsSnapshot
    }

export interface TailwindStyledEngine {
  scan(): Promise<ScanWorkspaceResult>
  scanWorkspace(): Promise<ScanWorkspaceResult>
  analyzeWorkspace(): Promise<Awaited<ReturnType<typeof runWorkspaceAnalysis>>>
  generateSafelist(): Promise<string[]>
  build(): Promise<BuildResult>
  watch(
    onEvent: (event: EngineWatchEvent) => void,
    options?: EngineWatchOptions
  ): Promise<{ close(): void }>
}

async function loadTailwindConfigFromPath(
  root: string,
  tailwindConfigPath?: string
): Promise<Record<string, unknown> | undefined> {
  if (!tailwindConfigPath) return undefined

  const configPath = path.resolve(root, tailwindConfigPath)
  if (!fs.existsSync(configPath)) {
    throw new Error(`tailwindConfigPath not found: ${configPath}`)
  }

  const imported = await import(pathToFileURL(configPath).href)
  const config = (imported.default ?? imported) as Record<string, unknown>
  return config
}

async function tryRunAnalyzer(root: string, options: EngineOptions) {
  try {
    const report = await runWorkspaceAnalysis(root, {
      scanner: options.scanner,
      semantic: true,
    })

    const classUsage: Record<string, number> = {}
    for (const usage of report.classStats.all) {
      classUsage[usage.name] = usage.count
    }

    const semantic = report.semantic
    return {
      unusedClasses: semantic?.unusedClasses.map((usage) => usage.name) ?? [],
      classConflicts:
        semantic?.conflicts.map((conflict) => ({
          className: conflict.className,
          files: [],
          classes: conflict.classes,
          message: conflict.message,
        })) ?? [],
      classUsage,
      semantic,
      report,
    }
  } catch (e) {
    log.warn("Analyzer not available:", String(e))
    return undefined
  }
}

async function buildFromScan(
  scan: ScanWorkspaceResult,
  root: string,
  options: EngineOptions,
  tailwindConfig?: Record<string, unknown>
): Promise<BuildResult> {
  const plugins = options.plugins ?? []
  const context = { root, timestamp: Date.now() }

  await runBeforeBuild(plugins, scan, context)
  const transformedClasses = await runTransformClasses(plugins, scan.uniqueClasses, context)
  const mergedClassList = mergeClassesStatic(transformedClasses.join(" "))

  const css = options.compileCss !== false && mergedClassList.length > 0
    ? await generateCssForClasses(
        mergedClassList.split(/\s+/).filter(Boolean),
        tailwindConfig,
        root
      )
    : ""

  const analysis = options.analyze ? await tryRunAnalyzer(root, options) : undefined

  const result: BuildResult = {
    scan,
    mergedClassList,
    css,
    analysis,
  }

  return runAfterBuild(plugins, result, context)
}

export async function createEngine(options: EngineOptions = {}): Promise<TailwindStyledEngine> {
  const root = options.root ?? process.cwd()
  const resolvedRoot = path.resolve(root)

  const plugins = options.plugins ?? []

  const getTailwindConfig = async (): Promise<Record<string, unknown> | undefined> => {
    if (configState.isLoaded()) return configState.getConfig()
    const config = await loadTailwindConfigFromPath(
      resolvedRoot,
      options.tailwindConfigPath
    )
    configState.setLoaded(config)
    return config
  }

  const reportEngineError = async (error: unknown): Promise<Error> => {
    const normalized = error instanceof Error ? error : new Error(String(error))
    const context = { root: resolvedRoot, timestamp: Date.now() }
    try {
      await runOnError(plugins, normalized, context)
    } catch (pluginError) {
      log.error(
        "plugin onError hook failed:",
        pluginError instanceof Error ? pluginError.message : String(pluginError)
      )
    }
    log.error(normalized.message)
    return normalized
  }

  const doScan = async (): Promise<ScanWorkspaceResult> => {
    try {
      const context = { root: resolvedRoot, timestamp: Date.now() }
      await runBeforeScan(plugins, context)
      const scan = await scanWorkspaceAsync(resolvedRoot, options.scanner)
      return await runAfterScan(plugins, scan, context)
    } catch (error) {
      throw await reportEngineError(error)
    }
  }

  const doAnalyze = async (): Promise<Awaited<ReturnType<typeof runWorkspaceAnalysis>>> => {
    try {
      return await runWorkspaceAnalysis(resolvedRoot, {
        scanner: options.scanner,
      })
    } catch (error) {
      throw await reportEngineError(error)
    }
  }

  const doGenerateSafelist = async (): Promise<string[]> => {
    const scan = await doScan()
    return [...scan.uniqueClasses]
  }

  return {
    scan: doScan,
    scanWorkspace: doScan,
    analyzeWorkspace: doAnalyze,
    generateSafelist: doGenerateSafelist,
    async build(): Promise<BuildResult> {
      const scan = await doScan()
      try {
        return await buildFromScan(scan, resolvedRoot, options, await getTailwindConfig())
      } catch (error) {
        throw await reportEngineError(error)
      }
    },
    async watch(
      onEvent: (event: EngineWatchEvent) => void,
      watchOptions: EngineWatchOptions = {}
    ): Promise<{ close(): void }> {
      const flushDebounceMs = watchOptions.debounceMs ?? DEFAULT_FLUSH_DEBOUNCE_MS
      const maxEventsPerFlush = watchOptions.maxEventsPerFlush ?? DEFAULT_MAX_EVENTS_PER_FLUSH
      const largeFileThreshold =
        watchOptions.largeFileThreshold ?? DEFAULT_LARGE_FILE_THRESHOLD_BYTES

      const tailwindConfig = await getTailwindConfig()
      const watchContext = { root: resolvedRoot, timestamp: Date.now() }
      await runBeforeWatch(plugins, watchContext)

      const watchState = {
        currentScan: await doScan(),
        timer: null as NodeJS.Timeout | null,
        setTimer(t: NodeJS.Timeout | null) {
          this.timer = t
        },
        clearTimer() {
          if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
          }
        },
      }

      try {
        onEvent({
          type: "initial",
          result: await buildFromScan(watchState.currentScan, resolvedRoot, options, tailwindConfig),
        })
      } catch (error) {
        const normalized = await reportEngineError(error)
        onEvent({ type: "error", error: normalized.message })
        throw normalized
      }

      const queue: Array<{ type: "change" | "unlink"; filePath: string }> = []
      const metrics = new EngineMetricsCollector()

      const scheduleFlush = (): void => {
        if (watchState.timer) return
        watchState.setTimer(setTimeout(() => {
          watchState.clearTimer()
          void flushBatch()
        }, flushDebounceMs))
      }

      const shouldForceFullRescan = (event: {
        type: "change" | "unlink"
        filePath: string
      }): boolean => {
        if (event.type === "unlink") return false
        try {
          const stat = fs.statSync(event.filePath)
          if (stat.size > largeFileThreshold) {
            metrics.markSkippedLargeFile()
            return true
          }
        } catch {
          return false
        }
        return false
      }

      const flushBatch = async (): Promise<void> => {
        if (queue.length === 0) return

        const batch = queue.splice(0, maxEventsPerFlush)
        metrics.markBatchProcessed(batch.length)

        const forceRescan = batch.some(event => shouldForceFullRescan(event))
        const lastEvent = batch[batch.length - 1]

        const eventTypeState = { emittedType: lastEvent.type as EngineBuildWatchEventType }

        try {
          if (forceRescan) {
            watchState.currentScan = await doScan()
            metrics.markFullRescan()
            eventTypeState.emittedType = "full-rescan"
          } else {
            for (const event of batch) {
              watchState.currentScan = applyIncrementalChange(
                watchState.currentScan,
                event.filePath,
                event.type,
                options.scanner
              )
              metrics.markIncremental()
            }
          }
        } catch (error) {
          const normalized = await reportEngineError(error)
          log.warn("incremental path failed, forcing full rescan:", normalized.message)
          watchState.currentScan = await doScan()
          metrics.markFullRescan()
          eventTypeState.emittedType = "full-rescan"
        }

        try {
          const started = Date.now()
          const result = await buildFromScan(watchState.currentScan, resolvedRoot, options, tailwindConfig)
          metrics.markBuildDuration(Date.now() - started)

          onEvent({
            type: eventTypeState.emittedType,
            filePath: lastEvent.filePath,
            result,
            metrics: metrics.snapshot(),
          })
        } catch (error) {
          const normalized = await reportEngineError(error)
          onEvent({
            type: "error",
            filePath: lastEvent.filePath,
            error: normalized.message,
            metrics: metrics.snapshot(),
          })
        }

        if (queue.length > 0) scheduleFlush()
      }

      const watcher: WorkspaceWatcher = watchWorkspace(
        resolvedRoot,
        (event) => {
          queue.push(event)
          metrics.markEventReceived(queue.length)
          scheduleFlush()
        },
        {
          ignoreDirectories: options.scanner?.ignoreDirectories,
          debounceMs: flushDebounceMs,
          onError: (error, directory) => {
            void reportEngineError(error)
            onEvent({
              type: "error",
              filePath: directory,
              error: error.message,
              metrics: metrics.snapshot(),
            })
          },
        }
      )

      return {
        async close() {
          watchState.clearTimer()
          watcher.close()
          await runAfterWatch(plugins, watchContext)
        },
      }
    },
  }
}

// Re-export schemas
export {
  EngineOptionsSchema,
  EngineWatchOptionsSchema,
  BuildResultSchema,
  parseEngineOptions,
  parseEngineWatchOptions,
  type EngineOptionsInput,
  type EngineWatchOptionsInput,
  type BuildResultInput,
} from "./schemas"

// Re-export internal API (including IR types)
export * from "./internal"
