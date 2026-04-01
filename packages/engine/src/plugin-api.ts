import type { ScanWorkspaceResult } from "@tailwind-styled/scanner"
import type { BuildResult } from "./index"

export interface EnginePluginContext {
  root: string
  timestamp: number
}

export interface EngineWatchContext {
  root: string
  timestamp: number
}

export interface EnginePlugin {
  name: string
  beforeScan?(context: EnginePluginContext): void | Promise<void>
  afterScan?(
    scan: ScanWorkspaceResult,
    context: EnginePluginContext
  ): ScanWorkspaceResult | undefined | Promise<ScanWorkspaceResult | undefined>
  transformClasses?(
    classes: string[],
    context: EnginePluginContext
  ): string[] | undefined | Promise<string[] | undefined>
  beforeBuild?(scan: ScanWorkspaceResult, context: EnginePluginContext): void | Promise<void>
  afterBuild?(
    result: BuildResult,
    context: EnginePluginContext
  ): BuildResult | undefined | Promise<BuildResult | undefined>
  onError?(error: Error, context: EnginePluginContext): void | Promise<void>
  beforeWatch?(context: EngineWatchContext): void | Promise<void>
  afterWatch?(context: EngineWatchContext): void | Promise<void>
}

export async function runBeforeScan(
  plugins: EnginePlugin[],
  context: EnginePluginContext
): Promise<void> {
  for (const plugin of plugins) {
    await plugin.beforeScan?.(context)
  }
}

export async function runAfterScan(
  plugins: EnginePlugin[],
  scan: ScanWorkspaceResult,
  context: EnginePluginContext
): Promise<ScanWorkspaceResult> {
  return await plugins.reduce(async (currentPromise, plugin) => {
    const current = await currentPromise
    const next = await plugin.afterScan?.(current, context)
    return next ?? current
  }, Promise.resolve(scan))
}

export async function runTransformClasses(
  plugins: EnginePlugin[],
  classes: string[],
  context: EnginePluginContext
): Promise<string[]> {
  return await plugins.reduce(async (currentPromise, plugin) => {
    const current = await currentPromise
    const next = await plugin.transformClasses?.(current, context)
    return next ?? current
  }, Promise.resolve(classes))
}

export async function runBeforeBuild(
  plugins: EnginePlugin[],
  scan: ScanWorkspaceResult,
  context: EnginePluginContext
): Promise<void> {
  for (const plugin of plugins) {
    await plugin.beforeBuild?.(scan, context)
  }
}

export async function runAfterBuild(
  plugins: EnginePlugin[],
  result: BuildResult,
  context: EnginePluginContext
): Promise<BuildResult> {
  return plugins.reduce(async (acc, plugin) => {
    const current = await acc
    const next = await plugin.afterBuild?.(current, context)
    return next !== undefined ? next : current
  }, Promise.resolve(result))
}

export async function runOnError(
  plugins: EnginePlugin[],
  error: Error,
  context: EnginePluginContext
): Promise<void> {
  for (const plugin of plugins) {
    await plugin.onError?.(error, context)
  }
}

export async function runBeforeWatch(
  plugins: EnginePlugin[],
  context: EngineWatchContext
): Promise<void> {
  for (const plugin of plugins) {
    await plugin.beforeWatch?.(context)
  }
}

export async function runAfterWatch(
  plugins: EnginePlugin[],
  context: EngineWatchContext
): Promise<void> {
  for (const plugin of plugins) {
    await plugin.afterWatch?.(context)
  }
}
