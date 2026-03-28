import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value] = entry.replace(/^--/, "").split("=")
    return [key, value ?? "true"]
  })
)

const workflow = args.get("workflow") ?? "scale-benchmark.yml"
const repo = args.get("repo")
const outDir = path.resolve(args.get("out") ?? "artifacts/scale-download")
let runId = args.get("runId")

fs.mkdirSync(outDir, { recursive: true })

const baseExtraArgs = []
if (repo) {
  baseExtraArgs.push("--repo", repo)
}

function runGh(commandArgs) {
  return spawnSync("gh", [...commandArgs, ...baseExtraArgs], {
    encoding: "utf8",
    shell: process.platform === "win32",
  })
}

if (!runId) {
  const listResult = runGh([
    "run",
    "list",
    "--workflow",
    workflow,
    "--status",
    "success",
    "--limit",
    "1",
    "--json",
    "databaseId",
  ])

  if (listResult.status !== 0) {
    const err = listResult.stderr?.trim() || "unknown error"
    throw new Error(`Failed to list runs via gh CLI: ${err}`)
  }

  const rows = JSON.parse(listResult.stdout || "[]")
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No successful runs found for workflow: ${workflow}`)
  }

  runId = String(rows[0].databaseId)
}

const downloadResult = runGh(["run", "download", runId, "--dir", outDir])
if (downloadResult.status !== 0) {
  const err = downloadResult.stderr?.trim() || "unknown error"
  throw new Error(`Failed to download artifacts for run ${runId}: ${err}`)
}

console.log(`Downloaded scale benchmark artifacts for run ${runId} to ${outDir}`)
