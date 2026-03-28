import fs from 'node:fs'
import path from 'node:path'

function arg(name, fallback) {
  const found = process.argv.find((value) => value.startsWith(`${name}=`))
  if (!found) return fallback
  return found.split('=').slice(1).join('=')
}

const inputDir = arg('--input', 'artifacts/benchmark')
const outputFile = arg('--out', 'docs/benchmark/cross-platform.json')

if (!fs.existsSync(inputDir)) {
  throw new Error(`Input directory not found: ${inputDir}`)
}

const collected = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      collected.push(fullPath)
    }
  }
}

walk(inputDir)

const aggregate = {
  generatedAt: new Date().toISOString(),
  inputDir,
  files: {},
}

for (const filePath of collected) {
  const key = path.basename(filePath, '.json')
  const raw = fs.readFileSync(filePath, 'utf8')
  aggregate.files[key] = JSON.parse(raw)
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true })
fs.writeFileSync(outputFile, `${JSON.stringify(aggregate, null, 2)}\n`)

console.log(`[aggregate] files=${collected.length} out=${outputFile}`)
