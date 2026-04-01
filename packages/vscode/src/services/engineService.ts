import * as fs from "node:fs"
import * as path from "node:path"
import type { ScanWorkspaceResult } from "@tailwind-styled/scanner"

export interface ScanResult extends ScanWorkspaceResult {
  classNames?: ScanClassName[]
}

export interface ScanClassName {
  name: string
  definedAt?: { file: string; line: number; column: number }
  variants?: string[]
  rules?: ScanRule[]
  finalStyle?: ScanStyle[]
  conflicts?: ScanConflict[]
  usedIn?: string[]
  bundleContribution?: number
  risk?: string
  componentsAffected?: string[]
}

export interface ScanRule {
  property: string
  value: string
  applied?: boolean
}

export interface ScanStyle {
  file?: string
  line?: number
  column?: number
  property: string
  value: string
}

export interface ScanConflict {
  selector1?: string
  selector2?: string
  property?: string
  winner?: string
  loser?: string
}

export interface TraceHoverResult {
  className: string
  definedAt?: { file: string; line: number; column: number }
  variants?: string[]
  rules: Array<{
    property: string
    value: string
    applied: boolean
  }>
  finalStyle: Array<{ property: string; value: string }>
  conflicts?: Array<{
    property: string
    winner: string
    loser: string
  }>
}

export interface WhyResult {
  className: string
  bundleContribution: string
  usedIn: Array<{ file: string; line: number }>
  impact: {
    risk: string
    componentsAffected: number
  }
}

export interface DoctorResult {
  issues: Array<{
    severity: string
    message: string
    location?: string
    suggestion?: string
  }>
  summary: { errors: number; warnings: number; info: number }
}

interface ScanCache {
  classNames: Map<string, ScanClassName>
  lastScan: number
}

export class EngineService {
  private rootPath: string
  private cache: ScanCache | null = null
  private scanCacheExpiry = 5 * 60 * 1000

  constructor(rootPath: string) {
    this.rootPath = rootPath
  }

  private get scanCachePath(): string {
    return path.join(this.rootPath, ".tailwind-styled", "scan-cache.json")
  }

  private async ensureScanCache(): Promise<ScanCache | null> {
    if (this.cache && Date.now() - this.cache.lastScan < this.scanCacheExpiry) {
      return this.cache
    }

    try {
      if (!fs.existsSync(this.scanCachePath)) {
        return null
      }

      const content = fs.readFileSync(this.scanCachePath, "utf-8")
      const scanData: ScanResult = JSON.parse(content)

      const classNames = new Map<string, ScanClassName>()
      for (const className of scanData.classNames || []) {
        classNames.set(className.name, className)
      }

      this.cache = {
        classNames,
        lastScan: Date.now(),
      }

      return this.cache
    } catch (error) {
      console.error("[EngineService] Error loading scan cache:", error)
      return null
    }
  }

  async trace(className: string): Promise<TraceHoverResult | null> {
    try {
      const scanCache = await this.ensureScanCache()
      if (!scanCache) {
        return null
      }

      const classData = scanCache.classNames.get(className)
      if (!classData) {
        return null
      }

      const definedAt = classData.definedAt
        ? {
            file: classData.definedAt.file,
            line: classData.definedAt.line,
            column: classData.definedAt.column,
          }
        : undefined

      const variants =
        classData.variants && classData.variants.length > 0 ? classData.variants : undefined

      const rules: TraceHoverResult["rules"] = (classData.rules || []).map((rule: ScanRule) => ({
        property: rule.property,
        value: rule.value,
        applied: rule.applied ?? true,
      }))

      const finalStyle: TraceHoverResult["finalStyle"] = (classData.finalStyle || []).map(
        (style: ScanStyle) => ({
          property: style.property,
          value: style.value,
        })
      )

      const conflicts: TraceHoverResult["conflicts"] = classData.conflicts
        ? classData.conflicts.map((conflict: ScanConflict) => ({
            property: conflict.property ?? "",
            winner: conflict.winner ?? "",
            loser: conflict.loser ?? "",
          }))
        : undefined

      return {
        className,
        definedAt,
        variants,
        rules,
        finalStyle,
        conflicts,
      }
    } catch (error) {
      console.error("[EngineService] Error tracing class:", error)
      return null
    }
  }

  async why(className: string): Promise<WhyResult | null> {
    try {
      const scanCache = await this.ensureScanCache()
      if (!scanCache) {
        return null
      }

      const classData = scanCache.classNames.get(className)
      if (!classData) {
        return null
      }

      const usedIn: WhyResult["usedIn"] = (classData.usedIn || []).map((usage: string) => ({
        file: usage,
        line: 0,
      }))

      return {
        className,
        bundleContribution: String(classData.bundleContribution || "Unknown"),
        usedIn,
        impact: {
          risk: classData.risk || "low",
          componentsAffected: (classData.componentsAffected || []).length,
        },
      }
    } catch (error) {
      console.error("[EngineService] Error getting why info:", error)
      return null
    }
  }

  async doctor(): Promise<DoctorResult> {
    const result: DoctorResult = {
      issues: [],
      summary: { errors: 0, warnings: 0, info: 0 },
    }

    try {
      const configPath = path.join(this.rootPath, "tailwind-styled.config.js")
      if (!fs.existsSync(configPath)) {
        result.issues.push({
          severity: "error",
          message: "tailwind-styled.config.js not found",
          suggestion: "Run npx tailwind-styled init to create a config file",
        })
        result.summary.errors++
      }

      const cssPath = path.join(this.rootPath, "src", "styles.css")
      if (!fs.existsSync(cssPath)) {
        result.issues.push({
          severity: "warning",
          message: "Styles file not found",
          location: cssPath,
          suggestion: "Create a styles.css file or update config",
        })
        result.summary.warnings++
      }

      const scanCache = await this.ensureScanCache()
      if (!scanCache) {
        result.issues.push({
          severity: "warning",
          message: "No scan cache found",
          suggestion: "Run npx tailwind-styled scan to generate the cache",
        })
        result.summary.warnings++
      } else {
        result.issues.push({
          severity: "info",
          message: `Found ${scanCache.classNames.size} class names in cache`,
        })
        result.summary.info++
      }
    } catch (error) {
      console.error("[EngineService] Error running doctor:", error)
      result.issues.push({
        severity: "error",
        message: `Error during diagnosis: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
      result.summary.errors++
    }

    return result
  }

  async getCompletions(prefix: string): Promise<string[]> {
    try {
      const scanCache = await this.ensureScanCache()
      if (!scanCache) {
        return []
      }

      const completions: string[] = []
      const lowerPrefix = prefix.toLowerCase()

      for (const [className] of scanCache.classNames) {
        if (className.toLowerCase().startsWith(lowerPrefix)) {
          completions.push(className)
        }
      }

      return completions.slice(0, 100)
    } catch (error) {
      console.error("[EngineService] Error getting completions:", error)
      return []
    }
  }
}
