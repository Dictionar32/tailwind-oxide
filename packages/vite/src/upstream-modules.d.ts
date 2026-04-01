declare module "@tailwind-styled/compiler" {
  export function runLoaderTransform(ctx: {
    filepath: string
    source: string
    options: Record<string, unknown>
    isDev?: boolean
  }): {
    code: string
    changed: boolean
    classes: string[]
  }
}

declare module "@tailwind-styled/engine" {
  export function createEngine(options?: Record<string, unknown>): Promise<{
    scanWorkspace(): Promise<{
      files: Array<{ file: string; classes: string[] }>
      totalFiles: number
      uniqueClasses: string[]
    }>
    build(): Promise<unknown>
  }>
}
