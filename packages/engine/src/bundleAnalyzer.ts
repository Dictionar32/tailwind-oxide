import type { ScanWorkspaceResult } from "@tailwind-styled/scanner"
import type { SourceLocation } from "./ir"

export interface ClassBundleInfo {
  className: string
  usageCount: number
  usedInFiles: SourceLocation[]
  bundleSize: number
  componentsAffected: number
  variantChain: string[]
  isDeadCode: boolean
  dependencies: string[]
}

export interface BundleAnalysisResult {
  className: string
  totalUsage: number
  files: SourceLocation[]
  bundleSizeBytes: number
  variantChains: string[]
  isDeadCode: boolean
  dependencies: string[]
}

export class BundleAnalyzer {
  analyzeClass(
    className: string,
    scanResult: ScanWorkspaceResult,
    css: string
  ): BundleAnalysisResult {
    if (!className || className.trim() === "") {
      throw new Error("Class name cannot be empty")
    }

    if (!scanResult) {
      throw new Error("Scan result is required for analysis")
    }

    if (typeof css !== "string") {
      throw new Error("CSS string is required for analysis")
    }

    const normalizedClass = className.startsWith(".") ? className.slice(1) : className
    const usageCount = this.countClassUsage(normalizedClass, scanResult)
    const files = this.getFilesUsingClass(normalizedClass, scanResult)
    const bundleSize = this.calculateBundleContribution(normalizedClass, css)
    const variantChains = this.extractVariantChains(normalizedClass, css)
    const dependencies = this.extractDependencies(normalizedClass, css)
    const isDeadCode = this.checkIsDeadCode(normalizedClass, scanResult, css)

    return {
      className: normalizedClass,
      totalUsage: usageCount,
      files,
      bundleSizeBytes: bundleSize,
      variantChains,
      isDeadCode,
      dependencies,
    }
  }

  analyzeAll(scanResult: ScanWorkspaceResult, css: string): Map<string, BundleAnalysisResult> {
    if (!scanResult) {
      throw new Error("Scan result is required for analysis")
    }

    if (typeof css !== "string") {
      throw new Error("CSS string is required for analysis")
    }

    const results = new Map<string, BundleAnalysisResult>()
    const allClasses = new Set(scanResult.uniqueClasses)

    const cssClasses = this.extractClassesFromCss(css)
    for (const cssClass of cssClasses) {
      allClasses.add(cssClass)
    }

    for (const className of allClasses) {
      try {
        const result = this.analyzeClass(className, scanResult, css)
        results.set(className, result)
      } catch (error) {
        console.warn(`Failed to analyze class "${className}":`, error)
      }
    }

    return results
  }

  calculateBundleContribution(className: string, css: string): number {
    if (!className || className.trim() === "") {
      throw new Error("Class name cannot be empty")
    }

    if (typeof css !== "string") {
      throw new Error("CSS string is required")
    }

    const normalizedClass = className.startsWith(".") ? className.slice(1) : className
    const escapedClass = normalizedClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    const selectorPattern = new RegExp(`\\.${escapedClass}([\\s:{]|$)`, "g")
    const matches = css.match(selectorPattern)

    if (!matches) {
      return 0
    }

    const classSelector = `.${normalizedClass}`
    const lines = css.split("\n")
    const totalSize = lines
      .filter((line) => line.includes(classSelector))
      .reduce((sum, line) => {
        const declarationStart = line.indexOf("{")
        if (declarationStart !== -1) {
          return sum + line.substring(declarationStart).length + 1
        }
        return sum
      }, 0)

    return totalSize
  }

  detectDeadCode(scanResult: ScanWorkspaceResult, css: string): string[] {
    if (!scanResult) {
      throw new Error("Scan result is required for dead code detection")
    }

    if (typeof css !== "string") {
      throw new Error("CSS string is required for dead code detection")
    }

    const cssClasses = this.extractClassesFromCss(css)
    const usedClasses = new Set(scanResult.uniqueClasses)

    const deadCode: string[] = []
    for (const cssClass of cssClasses) {
      if (!usedClasses.has(cssClass)) {
        deadCode.push(cssClass)
      }
    }

    for (const file of scanResult.files) {
      for (const usedClass of file.classes) {
        if (!cssClasses.includes(usedClass)) {
          if (!usedClasses.has(usedClass)) {
            usedClasses.add(usedClass)
          }
        }
      }
    }

    return deadCode
  }

  private countClassUsage(className: string, scanResult: ScanWorkspaceResult): number {
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className
    const count = scanResult.files.reduce((sum, file) => {
      return (
        sum +
        file.classes.filter((fileClass) => {
          const normalizedFileClass = fileClass.startsWith(".") ? fileClass.slice(1) : fileClass
          return normalizedFileClass === normalizedClass
        }).length
      )
    }, 0)

    return count
  }

  private getFilesUsingClass(className: string, scanResult: ScanWorkspaceResult): SourceLocation[] {
    const files: SourceLocation[] = []
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className

    for (const file of scanResult.files) {
      for (const fileClass of file.classes) {
        const normalizedFileClass = fileClass.startsWith(".") ? fileClass.slice(1) : fileClass
        if (normalizedFileClass === normalizedClass) {
          files.push({
            file: file.file,
            line: 1,
            column: 1,
          })
          break
        }
      }
    }

    return files
  }

  private extractVariantChains(className: string, css: string): string[] {
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className
    const variantChains: string[] = []
    const escapedClass = normalizedClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    const variantPattern = new RegExp(`([\\w-]+:${escapedClass}|${escapedClass})`, "g")

    const lines = css.split("\n")
    for (const line of lines) {
      const matches = line.match(variantPattern)
      if (matches) {
        for (const match of matches) {
          if (match.includes(":")) {
            variantChains.push(match)
          }
        }
      }
    }

    return [...new Set(variantChains)]
  }

  private extractDependencies(className: string, _css: string): string[] {
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className
    const parts = normalizedClass.split(":")
    const dependencies = parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join(":"))
    return dependencies
  }

  private checkIsDeadCode(
    className: string,
    scanResult: ScanWorkspaceResult,
    css: string
  ): boolean {
    const normalizedClass = className.startsWith(".") ? className.slice(1) : className
    const cssClasses = this.extractClassesFromCss(css)

    if (!cssClasses.includes(normalizedClass)) {
      return true
    }

    const usageCount = this.countClassUsage(normalizedClass, scanResult)
    return usageCount === 0
  }

  private extractClassesFromCss(css: string): string[] {
    const classes: string[] = []
    const classPattern = /\.([a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)*)/g

    // Use for...of + matchAll instead of while loop with let match
    for (const match of css.matchAll(classPattern)) {
      const className = match[1]
      if (!classes.includes(className)) {
        classes.push(className)
      }
    }

    return classes
  }
}
