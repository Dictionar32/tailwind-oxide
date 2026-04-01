import fs from "node:fs"
import path from "node:path"

import { compileCssFromClasses } from "@tailwind-styled/compiler/internal"
import {
  DEFAULT_EXTENSIONS,
  DEFAULT_IGNORES,
  isScannableFile,
  scanSource,
  scanWorkspace,
} from "@tailwind-styled/scanner"

export interface TraceImport {
  source: string
  kind: "static" | "dynamic" | "require"
}

export interface TraceTargetFileSummary {
  file: string
  classCount: number
  importCount: number
  classes: string[]
}

export interface TraceTargetResult {
  mode: "target"
  target: string
  targetType: "file" | "directory"
  root: string
  filesScanned: number
  classes: string[]
  classCount: number
  imports: TraceImport[]
  cssBytes: number
  resolvedClassCount: number
  unknownClasses: string[]
  compilerAvailable: boolean
  compilerError?: string
  files: TraceTargetFileSummary[]
  generatedAt: string
}

export interface TraceTargetOptions {
  root?: string
}

function toRelativePath(root: string, value: string): string {
  const relative = path.relative(root, value)
  return relative.length > 0 ? relative : "."
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}

function extractImports(source: string): TraceImport[] {
  const imports: TraceImport[] = []
  const seen = new Set<string>()

  const addImport = (kind: TraceImport["kind"], specifier: string) => {
    const normalized = specifier.trim()
    if (!normalized) return
    const key = `${kind}:${normalized}`
    if (seen.has(key)) return
    seen.add(key)
    imports.push({ kind, source: normalized })
  }

  for (const match of source.matchAll(/\bimport\s+(?:[^"'()]+?\s+from\s+)?["']([^"']+)["']/g)) {
    if (match[1]) addImport("static", match[1])
  }

  for (const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    if (match[1]) addImport("dynamic", match[1])
  }

  for (const match of source.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    if (match[1]) addImport("require", match[1])
  }

  return imports
}

function summarizeFile(
  filePath: string,
  root: string,
  classes: string[],
  imports: TraceImport[]
): TraceTargetFileSummary {
  return {
    file: toRelativePath(root, filePath),
    classCount: classes.length,
    importCount: imports.length,
    classes,
  }
}

function tryCompileClasses(classes: string[]) {
  if (classes.length === 0) {
    return {
      cssBytes: 0,
      resolvedClassCount: 0,
      unknownClasses: [] as string[],
      compilerAvailable: true,
      compilerError: undefined as string | undefined,
    }
  }

  try {
    const compiled = compileCssFromClasses(classes, {})
    return {
      cssBytes: compiled.sizeBytes,
      resolvedClassCount: compiled.resolvedClasses.length,
      unknownClasses: compiled.unknownClasses,
      compilerAvailable: true,
      compilerError: undefined as string | undefined,
    }
  } catch (error) {
    return {
      cssBytes: 0,
      resolvedClassCount: 0,
      unknownClasses: classes,
      compilerAvailable: false,
      compilerError: error instanceof Error ? error.message : String(error),
    }
  }
}

function traceSingleFile(filePath: string, root: string): TraceTargetResult {
  const source = fs.readFileSync(filePath, "utf8")
  const classes = uniqueSorted(scanSource(source))
  const imports = extractImports(source)
  const compiled = tryCompileClasses(classes)

  return {
    mode: "target",
    target: toRelativePath(root, filePath),
    targetType: "file",
    root,
    filesScanned: 1,
    classes,
    classCount: classes.length,
    imports,
    cssBytes: compiled.cssBytes,
    resolvedClassCount: compiled.resolvedClassCount,
    unknownClasses: compiled.unknownClasses,
    compilerAvailable: compiled.compilerAvailable,
    compilerError: compiled.compilerError,
    files: [summarizeFile(filePath, root, classes, imports)],
    generatedAt: new Date().toISOString(),
  }
}

function traceDirectory(targetDir: string, root: string): TraceTargetResult {
  const scanResult = scanWorkspace(targetDir, {
    includeExtensions: DEFAULT_EXTENSIONS,
    ignoreDirectories: DEFAULT_IGNORES,
    useCache: false,
  })

  const imports: TraceImport[] = []
  const importKeys = new Set<string>()
  const files = scanResult.files
    .filter((entry) => isScannableFile(entry.file, DEFAULT_EXTENSIONS))
    .map((entry) => {
      const source = fs.readFileSync(entry.file, "utf8")
      const fileImports = extractImports(source)
      for (const fileImport of fileImports) {
        const key = `${fileImport.kind}:${fileImport.source}`
        if (importKeys.has(key)) continue
        importKeys.add(key)
        imports.push(fileImport)
      }
      return summarizeFile(entry.file, root, uniqueSorted(entry.classes), fileImports)
    })
    .sort((left, right) => left.file.localeCompare(right.file))

  const classes = uniqueSorted(scanResult.uniqueClasses)
  const compiled = tryCompileClasses(classes)

  return {
    mode: "target",
    target: toRelativePath(root, targetDir),
    targetType: "directory",
    root,
    filesScanned: files.length,
    classes,
    classCount: classes.length,
    imports: imports.sort((left, right) => left.source.localeCompare(right.source)),
    cssBytes: compiled.cssBytes,
    resolvedClassCount: compiled.resolvedClassCount,
    unknownClasses: compiled.unknownClasses,
    compilerAvailable: compiled.compilerAvailable,
    compilerError: compiled.compilerError,
    files,
    generatedAt: new Date().toISOString(),
  }
}

export async function traceTarget(
  target: string,
  options: TraceTargetOptions = {}
): Promise<TraceTargetResult> {
  const root = path.resolve(options.root ?? process.cwd())
  const resolvedTarget = path.resolve(root, target)

  if (!fs.existsSync(resolvedTarget)) {
    throw new Error(`Trace target not found: ${resolvedTarget}`)
  }

  const stat = fs.statSync(resolvedTarget)
  if (stat.isDirectory()) {
    return traceDirectory(resolvedTarget, root)
  }
  if (stat.isFile()) {
    return traceSingleFile(resolvedTarget, root)
  }

  throw new Error(`Trace target must be a file or directory: ${resolvedTarget}`)
}
