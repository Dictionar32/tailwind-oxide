export function scanWorkspaceNative(rootDir: string, extensions?: string[]): { files: Array<{ file: string; classes: string[] }>; totalFiles: number; uniqueClasses: string[] } | null
export function extractClassesNative(source: string): string[] | null
export function hashContentNative(source: string): string | null
