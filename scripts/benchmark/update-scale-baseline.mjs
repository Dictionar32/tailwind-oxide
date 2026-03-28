import fs from "node:fs"
import path from "node:path"

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value] = entry.replace(/^--/, "").split("=")
    return [key, value ?? "true"]
  })
)

const source = path.resolve(args.get("source") ?? "artifacts/scale-summary.json")
const target = path.resolve(args.get("target") ?? "artifacts/scale-baseline.json")

if (!fs.existsSync(source)) {
  throw new Error(`Summary file not found: ${source}`)
}

const summary = JSON.parse(fs.readFileSync(source, "utf8"))
const baseline = {
  ...summary,
  baselineUpdatedAt: new Date().toISOString(),
}

fs.mkdirSync(path.dirname(target), { recursive: true })
fs.writeFileSync(target, `${JSON.stringify(baseline, null, 2)}\n`)

console.log(`Baseline updated: ${target}`)
