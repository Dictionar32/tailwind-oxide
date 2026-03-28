import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const shouldRunBench = process.argv.includes("--with-bench")
const outPath = path.resolve("artifacts/demo/v41-cli-demo.txt")

function section(title) {
  return `\n=== ${title} ===\n`
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  } catch (error) {
    return `${String(error.stdout ?? "")}${String(error.stderr ?? "")}`
  }
}

let log = "tailwind-styled-v4.1 demo transcript\n"
log += `generatedAt: ${new Date().toISOString()}\n`

log += section("Health summary")
log += runCommand("npm run health:summary")

log += section("Repo health (PR5 gaps)")
log += runCommand("npm run validate:pr5:gaps")

log += section("Public benchmark snapshot")
const benchmarkFile = path.resolve("docs/benchmark/public-benchmark-snapshot.json")
if (fs.existsSync(benchmarkFile)) {
  const snapshot = JSON.parse(fs.readFileSync(benchmarkFile, "utf8"))
  log += JSON.stringify(snapshot, null, 2) + "\n"
} else {
  log += "Snapshot file not found.\n"
}

if (shouldRunBench) {
  log += section("Fresh massive benchmark")
  log += runCommand(
    "npm run bench:massive -- --root=test/fixtures/large-project --out=artifacts/scale/massive-demo.json"
  )
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, log)
console.log(`Demo transcript saved to ${outPath}`)
