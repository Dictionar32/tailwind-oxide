import fs from "node:fs"
import path from "node:path"

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value] = entry.replace(/^--/, "").split("=")
    return [key, value ?? "true"]
  })
)

const inputDir = path.resolve(args.get("input") ?? "artifacts/scale")
const outFile = args.get("out") ? path.resolve(args.get("out")) : null

if (!fs.existsSync(inputDir)) {
  throw new Error(`Input directory not found: ${inputDir}`)
}

const files = fs.readdirSync(inputDir).filter((name) => name.endsWith(".json"))
const massive = []
const memory = []
const watch = []

for (const file of files) {
  const full = path.join(inputDir, file)
  const data = JSON.parse(fs.readFileSync(full, "utf8"))
  if (file.startsWith("massive-")) massive.push({ file, data })
  else if (file.startsWith("memory-")) memory.push({ file, data })
  else if (file.startsWith("watch-")) watch.push({ file, data })
}

function average(values) {
  if (values.length === 0) return null
  return Math.round(values.reduce((acc, v) => acc + v, 0) / values.length)
}

const summary = {
  inputDir,
  counts: {
    massive: massive.length,
    memory: memory.length,
    watch: watch.length,
  },
  averages: {
    scanMs: average(massive.map((item) => item.data?.timingsMs?.scan).filter(Number.isFinite)),
    analyzeMs: average(massive.map((item) => item.data?.timingsMs?.analyze).filter(Number.isFinite)),
    engineBuildNoCssMs: average(massive.map((item) => item.data?.timingsMs?.engineBuildNoCss).filter(Number.isFinite)),
    rssMb: average(massive.map((item) => item.data?.memoryMb?.rss).filter(Number.isFinite)),
    afterGcMb: average(
      memory
        .map((item) => item.data?.snapshots?.find((snapshot) => snapshot.label === "after-gc")?.rssMb)
        .filter(Number.isFinite)
    ),
    watchErrors: average(watch.map((item) => item.data?.errors).filter(Number.isFinite)),
  },
  generatedAt: new Date().toISOString(),
}

if (outFile) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, `${JSON.stringify(summary, null, 2)}\n`)
}

console.log(JSON.stringify(summary, null, 2))
