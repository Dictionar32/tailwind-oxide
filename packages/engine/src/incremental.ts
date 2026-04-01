import fs from "node:fs"
import path from "node:path"

import {
  isScannableFile,
  type ScanWorkspaceOptions,
  type ScanWorkspaceResult,
  scanFile,
} from "@tailwind-styled/scanner"
import { createLogger } from "@tailwind-styled/shared"

import { getNativeEngineBinding } from "./native-bridge"

const DEFAULT_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]
const log = createLogger("engine:incremental")

function rebuildWorkspaceResult(
  byFile: Map<string, ScanWorkspaceResult["files"][number]>
): ScanWorkspaceResult {
  const files = Array.from(byFile.values())
  const unique = new Set<string>()
  for (const file of files) {
    for (const cls of file.classes) unique.add(cls)
  }
  return {
    files,
    totalFiles: files.length,
    uniqueClasses: Array.from(unique).sort(),
  }
}

function applyClassDiff(existing: string[], added: string[], removed: string[]): string[] {
  const next = new Set(existing)
  for (const cls of added) next.add(cls)
  for (const cls of removed) next.delete(cls)
  return Array.from(next)
}

function areClassSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const bSet = new Set(b)
  for (const cls of a) {
    if (!bSet.has(cls)) return false
  }
  return true
}

/**
 * Apply an incremental file-change event to an existing scan result.
 *
 * Native-only: Rust processFileChange is required.
 * No JavaScript fallback — native Rust binding must be available.
 */
export function applyIncrementalChange(
  previous: ScanWorkspaceResult,
  filePath: string,
  type: "change" | "unlink",
  scanner?: ScanWorkspaceOptions
): ScanWorkspaceResult {
  const includeExtensions = scanner?.includeExtensions ?? DEFAULT_EXTENSIONS
  if (!isScannableFile(filePath, includeExtensions)) return previous

  const byFile = new Map(previous.files.map((f) => [path.resolve(f.file), f]))
  const normalizedPath = path.resolve(filePath)

  const native = getNativeEngineBinding()
  if (!native?.processFileChange) {
    throw new Error(
      "FATAL: Native binding 'processFileChange' is required but not available.\n" +
      "This package requires native Rust bindings.\n\n" +
      "Resolution steps:\n" +
      "1. Build the native Rust module: npm run build:rust"
    )
  }

  if (type === "unlink") {
    const existing = byFile.get(normalizedPath)
    log.debug(`native unlink ${normalizedPath}`)
    native.processFileChange(normalizedPath, existing?.classes ?? [], null)
    byFile.delete(normalizedPath)
    return rebuildWorkspaceResult(byFile)
  }

  log.debug(`native change ${normalizedPath}`)
  const scanned = scanFile(normalizedPath)
  const content = fs.readFileSync(normalizedPath, "utf8")
  const diff = native.processFileChange(normalizedPath, scanned.classes, content)
  const existing = byFile.get(normalizedPath)

  if (diff && existing) {
    log.debug(`native diff ${normalizedPath} +${diff.added.length} -${diff.removed.length}`)
    const diffApplied = applyClassDiff(existing.classes, diff.added, diff.removed)
    const classes = areClassSetsEqual(diffApplied, scanned.classes)
      ? diffApplied
      : scanned.classes
    byFile.set(normalizedPath, { file: normalizedPath, classes })
  } else {
    log.debug(`native diff cold-sync ${normalizedPath}`)
    byFile.set(normalizedPath, { file: normalizedPath, classes: scanned.classes })
  }

  return rebuildWorkspaceResult(byFile)
}
