import fs from "node:fs/promises"
import path from "node:path"

import { runMigrationWizard } from "./migrateWizard"
import { firstPositional, hasFlag } from "./utils/args"
import { pathExists, writeFileSafe } from "./utils/fs"
import { createCliOutput } from "./utils/output"

interface MigrateOptions {
  includeImports: boolean
  includeClasses: boolean
}

export interface MigrateReport {
  scannedFiles: number
  updatedFiles: number
  classRenames: number
  importRenames: number
  configWrites: number
  dryRun: boolean
}

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"])
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".next", "out", ".turbo"])
const DEFAULT_TAILWIND_CSS = `@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --spacing-section: 3rem;
}
`

async function findSourceFiles(dir: string): Promise<string[]> {
  const out: string[] = []

  async function walk(currentDir: string): Promise<void> {
    if (!(await pathExists(currentDir))) return
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        await walk(fullPath)
        continue
      }
      if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        out.push(fullPath)
      }
    }
  }

  await walk(dir)
  return out
}

function migrateSource(source: string, options: MigrateOptions) {
  // Use functional approach - count matches with match() instead of callback reassign
  const importRenames = options.includeImports
    ? (source.match(/tailwind-styled-components/g) || []).length
    : 0

  const output = options.includeImports
    ? source.replace(/tailwind-styled-components/g, "tailwind-styled-v4")
    : source

  if (options.includeClasses) {
    const flexGrowMatches = source.match(/\bflex-grow\b/g) || []
    const flexShrinkMatches = source.match(/\bflex-shrink\b/g) || []
    const classRenames = flexGrowMatches.length + flexShrinkMatches.length

    const replacedOutput = output
      .replace(/\bflex-grow\b/g, "grow")
      .replace(/\bflex-shrink\b/g, "shrink")

    return { output: replacedOutput, classRenames, importRenames }
  }

  return { output, classRenames: 0, importRenames }
}

async function migrateConfig(root: string, dryRun: boolean): Promise<number> {
  const cssPath = path.join(root, "src", "tailwind.css")
  if (await pathExists(cssPath)) return 0
  await writeFileSafe(cssPath, DEFAULT_TAILWIND_CSS, { dryRun })
  return 1
}

export async function runMigrateCli(rawArgs: string[]): Promise<void> {
  const asJson = hasFlag("json", rawArgs)
  const output = createCliOutput({
    json: asJson,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1",
  })
  const target = firstPositional(rawArgs) ?? "."
  const root = path.resolve(process.cwd(), target)

  const dryRunFlag = hasFlag("dry-run", rawArgs)
  const wizardOptions = hasFlag("wizard", rawArgs) ? await runMigrationWizard() : null

  // Handle wizard mode
  const { dryRun, includeConfig, includeClasses, includeImports } = wizardOptions
    ? {
        dryRun: wizardOptions.dryRun,
        includeConfig: wizardOptions.includeConfig,
        includeClasses: wizardOptions.includeClasses,
        includeImports: wizardOptions.includeImports,
      }
    : { dryRun: dryRunFlag, includeConfig: true, includeClasses: true, includeImports: true }

  const spinner = output.spinner()
  spinner.start(`Scanning source files in ${root}`)
  const files = await findSourceFiles(root)
  const report: MigrateReport = {
    scannedFiles: files.length,
    updatedFiles: 0,
    classRenames: 0,
    importRenames: 0,
    configWrites: 0,
    dryRun,
  }

  if (includeConfig) {
    report.configWrites += await migrateConfig(root, dryRun)
  }

  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8")
    const migrated = migrateSource(source, { includeImports, includeClasses })
    if (migrated.output !== source) {
      report.updatedFiles++
      if (!dryRun) {
        await fs.writeFile(filePath, migrated.output, "utf8")
      }
    }
    report.classRenames += migrated.classRenames
    report.importRenames += migrated.importRenames
  }
  spinner.stop(`Migration scan complete: ${report.scannedFiles} file(s)`)

  if (asJson) {
    output.jsonSuccess("migrate", report)
    return
  }

  output.writeText("\nMigration report")
  output.writeText(`Scanned files : ${report.scannedFiles}`)
  output.writeText(`Updated files : ${report.updatedFiles}${dryRun ? " (dry-run)" : ""}`)
  output.writeText(`Class renames : ${report.classRenames}`)
  output.writeText(`Import renames: ${report.importRenames}`)
  output.writeText(`Config writes : ${report.configWrites}${dryRun ? " (dry-run)" : ""}`)
}
