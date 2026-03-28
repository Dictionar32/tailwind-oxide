import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const reportPath = path.join(root, "artifacts", "validation-report.json")
const summaryPath = path.join(root, "artifacts", "health-summary.json")

if (!fs.existsSync(reportPath)) {
  console.error("validation-report.json not found. Run `npm run validate:final` first.")
  process.exit(1)
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"))
const failed = Number(report?.summary?.failed ?? 0)
const passed = Number(report?.summary?.passed ?? 0)

const health = {
  generatedAt: new Date().toISOString(),
  status: failed === 0 ? "PASS" : "FAIL",
  totals: { passed, failed },
  parserBenchmark: report?.benchmark ?? null,
  recommendation:
    failed === 0
      ? "Release candidate gate passed. Safe to continue."
      : "Fix failing checks before release candidate.",
}

fs.mkdirSync(path.dirname(summaryPath), { recursive: true })
fs.writeFileSync(summaryPath, JSON.stringify(health, null, 2) + "\n")
console.log(`Health summary written: ${path.relative(root, summaryPath)}`)

if (failed > 0) process.exitCode = 1
