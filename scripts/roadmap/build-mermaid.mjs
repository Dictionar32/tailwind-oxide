import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const inputPath = path.join(root, "docs/roadmap/estimation.json")
const outputPath = path.join(root, "docs/roadmap/estimation-pie.mmd")

const raw = fs.readFileSync(inputPath, "utf8")
const config = JSON.parse(raw)

if (!Array.isArray(config.items) || config.items.length === 0) {
  throw new Error("docs/roadmap/estimation.json harus berisi items non-kosong")
}

const total = config.items.reduce((sum, item) => sum + Number(item.value || 0), 0)
if (total !== 100) {
  throw new Error(`Total persentase harus 100, saat ini: ${total}`)
}

const lines = [
  "pie title " + config.title,
  ...config.items.map((item) => `  \"${item.label}\" : ${item.value}`),
  "",
]

fs.writeFileSync(outputPath, lines.join("\n"), "utf8")
console.log(`Generated: ${path.relative(root, outputPath)}`)
