import fs from "node:fs"
import path from "node:path"

import { createEngine } from "@tailwind-styled/engine"

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value] = entry.replace(/^--/, "").split("=")
    return [key, value ?? "true"]
  })
)

const root = path.resolve(args.get("root") ?? "test/fixtures/massive")
const durationMinutes = Number(args.get("minutes") ?? 60)
const touchEverySeconds = Number(args.get("touchEvery") ?? 60)
const reportEverySeconds = Number(args.get("reportEvery") ?? 300)
const outFile = args.get("out")
const probeFile = path.join(root, "chunk-0", "Comp0.tsx")

let events = 0
let errors = 0
let rescans = 0

const reports = []

const engine = await createEngine({ root, compileCss: false })
const watcher = await engine.watch((event) => {
  if (event.type === "error") {
    errors += 1
    return
  }

  events += 1
  if (event.type === "full-rescan") rescans += 1
})

const started = Date.now()
const endAt = started + durationMinutes * 60 * 1000

const toucher = setInterval(() => {
  if (!fs.existsSync(probeFile)) return
  fs.appendFileSync(probeFile, "\n")
}, touchEverySeconds * 1000)

const reporter = setInterval(() => {
  const memory = process.memoryUsage()
  const report = {
    uptimeMinutes: Math.round((Date.now() - started) / 1000 / 60),
    events,
    errors,
    rescans,
    rssMb: Math.round(memory.rss / 1024 / 1024),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
  }
  reports.push(report)
  console.log(JSON.stringify(report, null, 2))
}, reportEverySeconds * 1000)

while (Date.now() < endAt) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
}

clearInterval(toucher)
clearInterval(reporter)
watcher.close()

const summary = { status: "completed", durationMinutes, events, errors, rescans, reports }

if (outFile) {
  const resolvedOut = path.resolve(outFile)
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
  fs.writeFileSync(resolvedOut, `${JSON.stringify(summary, null, 2)}\n`)
}

console.log(JSON.stringify(summary, null, 2))
