import path from "node:path"

import { ensureFileSafe } from "./utils/fs"
import { createCliOutput } from "./utils/output"

export interface InitReport {
  created: string[]
  skipped: string[]
}

async function ensureFile(filePath: string, content: string, report: InitReport): Promise<void> {
  const status = await ensureFileSafe(filePath, content)
  if (status === "created") {
    report.created.push(filePath)
  } else {
    report.skipped.push(filePath)
  }
}

export async function runInitCli(rawArgs: string[]): Promise<void> {
  const asJson = rawArgs.includes("--json")
  const output = createCliOutput({
    json: asJson,
    debug: process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose: process.env.TWS_VERBOSE === "1" || process.env.VERBOSE === "1",
  })
  const target = rawArgs.find((arg) => !arg.startsWith("-")) ?? "."
  const root = path.resolve(process.cwd(), target)
  const report: InitReport = { created: [], skipped: [] }

  await ensureFile(
    path.join(root, "src", "tailwind.css"),
    '@import "tailwindcss";\n\n@theme {\n  --color-primary: #3b82f6;\n  --spacing-section: 3rem;\n}\n',
    report
  )

  await ensureFile(
    path.join(root, "tailwind-styled.config.json"),
    `${JSON.stringify(
      {
        version: 1,
        cssEntry: "src/tailwind.css",
      },
      null,
      2
    )}\n`,
    report
  )

  if (asJson) {
    output.jsonSuccess("init", report)
    return
  }

  output.writeText("\nInit complete")
  output.writeText(`Created: ${report.created.length}`)
  for (const filePath of report.created) {
    output.writeText(`  + ${path.relative(root, filePath)}`)
  }
  if (report.skipped.length > 0) {
    output.writeText(`Skipped: ${report.skipped.length}`)
    for (const filePath of report.skipped) {
      output.writeText(`  - ${path.relative(root, filePath)} (exists)`)
    }
  }
}
