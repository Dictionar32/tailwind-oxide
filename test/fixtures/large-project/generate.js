const fs = require("node:fs")
const path = require("node:path")

const root = __dirname
const outDir = path.join(root, "generated")
const argCount = process.argv.find((arg) => arg.startsWith("--files="))
const total = Number(argCount ? argCount.split("=")[1] : process.env.FIXTURE_FILE_COUNT ?? 10000)

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

for (let i = 0; i < total; i += 1) {
  const group = path.join(outDir, `chunk-${Math.floor(i / 250)}`)
  fs.mkdirSync(group, { recursive: true })
  fs.writeFileSync(
    path.join(group, `Comp${i}.tsx`),
    `export const Comp${i}=({active,color})=> <div className={active ? \"bg-blue-500 text-white\" : ` +
      "`bg-${color}-500 text-black`" +
      `}>${i}</div>;`,
    "utf8",
  )
}

console.log(`Generated ${total} files at ${outDir}`)
