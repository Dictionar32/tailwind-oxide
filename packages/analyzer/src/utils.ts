import fs from "node:fs"
import { createDebugLogger } from "@tailwind-styled/shared"

export const DEFAULT_TOP_LIMIT = 10
export const DEFAULT_FREQUENT_THRESHOLD = 2
export const DEBUG_NAMESPACE = "tailwind-styled:analyzer"

export function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

export const debugLog = createDebugLogger(DEBUG_NAMESPACE, "tailwind-styled/analyzer")

export function sanitizeTopLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_TOP_LIMIT
  return Math.max(1, Math.trunc(value as number))
}

export function sanitizeFrequentThreshold(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_FREQUENT_THRESHOLD
  return Math.max(1, Math.trunc(value as number))
}
