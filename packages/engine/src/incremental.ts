import fs from "node:fs"
import path from "node:path"

import {
  type ScanWorkspaceOptions,
  type ScanWorkspaceResult,
  isScannableFile,
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
 * Tries Rust processFileChange first for per-file diffing;
 * falls back to the JS implementation when native is unavailable.
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

  // Rust fast-path: per-file diff + native registry update.
  const native = getNativeEngineBinding()
  if (native?.processFileChange) {
    try {
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
        // Registry can be cold on first update; trust a full scan when delta is inconsistent.
        const classes = areClassSetsEqual(diffApplied, scanned.classes)
          ? diffApplied
          : scanned.classes
        byFile.set(normalizedPath, { file: normalizedPath, classes })
      } else {
        log.debug(`native diff cold-sync ${normalizedPath}`)
        byFile.set(normalizedPath, { file: normalizedPath, classes: scanned.classes })
      }

      return rebuildWorkspaceResult(byFile)
    } catch (error) {
      log.warn(
        "native processFileChange failed, using JS fallback:",
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  // JS fallback.
  log.debug(`js fallback ${type} ${normalizedPath}`)
  if (type === "unlink") {
    byFile.delete(normalizedPath)
  } else {
    byFile.set(normalizedPath, scanFile(normalizedPath))
  }

  return rebuildWorkspaceResult(byFile)
}
