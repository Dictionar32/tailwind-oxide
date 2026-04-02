import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, extname } from "node:path"
import { parseArgs as parseNodeArgs } from "node:util"
import { CliUsageError } from "../utils/errors"
import type { CliOutput } from "../utils/output"
import type { CommandContext, CommandDefinition } from "./types"

interface FileBoundary {
  file: string
  type: "server" | "client"
  reasons: string[]
}

function collectTsFiles(dir: string, extensions: Set<string>): string[] {
  const files: string[] = []
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".next") continue
      files.push(...collectTsFiles(full, extensions))
    } else if (extensions.has(extname(entry.name))) {
      files.push(full)
    }
  }
  return files
}

function analyzeRscBoundary(source: string): { isServer: boolean; reasons: string[] } {
  const reasons: string[] = []

  const hasUseClient = source.includes('"use client"') || source.includes("'use client'")
  if (hasUseClient) {
    return { isServer: false, reasons: ["explicit 'use client' directive"] }
  }

  if (/\buse(State|Effect|Context|Ref|Memo|Callback|Reducer)\b/.test(source)) {
    reasons.push("uses React hooks")
  }
  if (/\bon(Click|Change|Submit|Key|Mouse|Focus|Blur|Input)\s*=/.test(source)) {
    reasons.push("has event handlers")
  }
  if (/\b(window|document|navigator|localStorage|setTimeout|setInterval|fetch|requestAnimationFrame)\b/.test(source)) {
    reasons.push("uses browser APIs")
  }
  if (/\buseState\b/.test(source)) {
    reasons.push("uses useState")
  }
  if (/\buseEffect\b/.test(source)) {
    reasons.push("uses useEffect")
  }

  return { isServer: reasons.length === 0, reasons }
}

function printBoundaryReport(
  report: FileBoundary[],
  output: CliOutput
): void {
  const servers = report.filter((r) => r.type === "server")
  const clients = report.filter((r) => r.type === "client")

  output.writeText("")
  output.writeText("RSC Boundary Report")
  output.writeText(`  Total files: ${report.length}`)
  output.writeText(`  Server Components: ${servers.length}`)
  output.writeText(`  Client Components: ${clients.length}`)
  output.writeText(
    `  Server ratio: ${report.length > 0 ? ((servers.length / report.length) * 100).toFixed(1) : 0}%`
  )

  if (clients.length > 0) {
    output.writeText("")
    output.subHeader("Client Components")
    for (const c of clients) {
      output.listItem(`${c.file}`)
      for (const r of c.reasons) {
        output.listItem(`  ${r}`)
      }
    }
  }

  if (servers.length > 0 && servers.length <= 20) {
    output.writeText("")
    output.subHeader("Server Components")
    for (const s of servers) {
      output.listItem(s.file)
    }
  }
}

export async function runBoundaryCli(args: string[], context: CommandContext): Promise<void> {
  const parsed = parseNodeArgs({
    args,
    allowPositionals: true,
    strict: false,
    options: {
      cwd: { type: "string" },
      json: { type: "boolean" },
    },
  })

  const target = parsed.positionals[0] as string | undefined
  const root = typeof parsed.values.cwd === "string" ? parsed.values.cwd : (target ?? context.cwd)
  const json = context.json || parsed.values.json === true

  const extensions = new Set([".ts", ".tsx", ".js", ".jsx"])
  const files = collectTsFiles(root, extensions)

  const report: FileBoundary[] = []

  for (const file of files) {
    let source: string
    try {
      source = readFileSync(file, "utf8")
    } catch {
      continue
    }

    if (!source.includes("tw.") && !source.includes("from 'tailwind-styled") && !source.includes('from "tailwind-styled')) {
      continue
    }

    const analysis = analyzeRscBoundary(source)
    report.push({
      file: file.replace(root, "."),
      type: analysis.isServer ? "server" : "client",
      reasons: analysis.reasons,
    })
  }

  if (json) {
    const servers = report.filter((r) => r.type === "server")
    const clients = report.filter((r) => r.type === "client")
    context.output.jsonSuccess("boundary", {
      totalFiles: report.length,
      serverCount: servers.length,
      clientCount: clients.length,
      serverRatio: report.length > 0 ? Number(((servers.length / report.length) * 100).toFixed(1)) : 0,
      files: report,
    })
    return
  }

  printBoundaryReport(report, context.output)
}

export const boundaryCommand: CommandDefinition = {
  name: "boundary",
  aliases: ["b"],
  async run(args, context) {
    await runBoundaryCli(args, context)
  },
}
