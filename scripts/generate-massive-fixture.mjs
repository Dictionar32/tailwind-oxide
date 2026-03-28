import fs from "node:fs"
import path from "node:path"

const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, value] = entry.replace(/^--/, "").split("=")
    return [key, value ?? "true"]
  })
)

const totalFiles = Number(args.get("files") ?? 100000)
const outputDir = path.resolve(args.get("out") ?? "test/fixtures/massive")
const chunkSize = Number(args.get("chunk") ?? 1000)

if (!Number.isFinite(totalFiles) || totalFiles <= 0) {
  throw new Error(`Invalid --files value: ${totalFiles}`)
}

fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(outputDir, { recursive: true })

const classPool = [
  "bg-blue-500",
  "text-white",
  "px-4",
  "py-2",
  "rounded",
  "shadow",
  "hover:bg-blue-600",
  "focus:outline-none",
  "focus:ring-2",
  "focus:ring-blue-400",
  "dark:bg-slate-800",
  "dark:text-slate-100",
]

const randomClass = () => classPool[Math.floor(Math.random() * classPool.length)]

console.log(`[fixture] generating ${totalFiles} files in ${outputDir}`)

for (let i = 0; i < totalFiles; i += 1) {
  const bucket = path.join(outputDir, `chunk-${Math.floor(i / chunkSize)}`)
  fs.mkdirSync(bucket, { recursive: true })

  const classes = Array.from({ length: 8 }, randomClass).join(" ")
  const content = `import { tw } from "tailwind-styled-v4"\n\nexport const Comp${i} = tw.div\`${classes}\`\n`
  fs.writeFileSync(path.join(bucket, `Comp${i}.tsx`), content)

  if (i % 5000 === 0) {
    console.log(`[fixture] progress ${i}/${totalFiles}`)
  }
}

console.log(`[fixture] done: ${totalFiles} files`) 
