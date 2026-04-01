declare module "@tailwind-styled/compiler" {
  export function shouldSkipFile(filepath: string): boolean

  export function runLoaderTransform(ctx: {
    filepath: string
    source: string
    options: Record<string, unknown>
  }): {
    code: string
    changed: boolean
    classes: string[]
  }
}
