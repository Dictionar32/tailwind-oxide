import fs from "node:fs"
import path from "node:path"
import v8 from "node:v8"

import { scanWorkspace } from "@tailwind-styled/scanner"

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value] = entry.replace(/^--/, "").split("=")
    return [key, value ?? "true"]
  })
)

const root = path.resolve(args.get("root") ?? "test/fixtures/massive")
const outFile = args.get("out")

function heapStats(label) {
  const stats = v8.getHeapStatistics()
  const usage = process.memoryUsage()
  return {
    label,
    heapSizeLimitMb: Math.round(stats.heap_size_limit / 1024 / 1024),
    totalHeapSizeMb: Math.round(stats.total_heap_size / 1024 / 1024),
    usedHeapSizeMb: Math.round(stats.used_heap_size / 1024 / 1024),
    rssMb: Math.round(usage.rss / 1024 / 1024),
  }
}

const snapshots = []
snapshots.push(heapStats("before-scan"))

const scan = scanWorkspace(root)
snapshots.push({ ...heapStats("after-scan"), files: scan.totalFiles, uniqueClasses: scan.uniqueClasses.length })

if (typeof global.gc === "function") {
  global.gc()
  snapshots.push(heapStats("after-gc"))
} else {
  snapshots.push({ label: "after-gc", note: "Run with --expose-gc to collect post-GC stats" })
}

const output = { root, snapshots, generatedAt: new Date().toISOString() }

if (outFile) {
  const resolvedOut = path.resolve(outFile)
  fs.mkdirSync(path.dirname(resolvedOut), { recursive: true })
  fs.writeFileSync(resolvedOut, `${JSON.stringify(output, null, 2)}\n`)
}

console.log(JSON.stringify(output, null, 2))
