/**
 * tailwind-styled-v4 — Rspack Example
 *
 * Contoh penggunaan Node.js/Rspack (non-React):
 *  1. tw class extraction dari string
 *  2. compileCssFromClasses via Rust engine
 *  3. scanSource untuk deteksi kelas di source code
 */
import { tw } from "tailwind-styled-v4"
import { compileCssFromClasses } from "@tailwind-styled/compiler"
import { scanSource } from "@tailwind-styled/scanner"

// ── 1. tw template literal ────────────────────────────────────────────────────
//    tw di sini dipakai untuk generate class string yang konsisten
const buttonClasses = tw`
  inline-flex items-center gap-2 rounded-lg px-4 py-2
  bg-blue-600 text-white font-medium transition
  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
`

const cardClasses = tw`
  rounded-xl border border-gray-200 bg-white p-6 shadow-sm
`

console.log("button classes:", buttonClasses)
console.log("card classes  :", cardClasses)

// ── 2. compileCssFromClasses via Rust ─────────────────────────────────────────
const { css, engine, resolvedClasses } = compileCssFromClasses([
  "flex", "items-center", "gap-4",
  "rounded-xl", "bg-white", "p-6",
  "hover:shadow-md", "dark:bg-gray-800",
])

console.log(`\nCompiled CSS (engine: ${engine}):`)
console.log(css.slice(0, 200) + "...")
console.log(`Resolved: ${resolvedClasses.length} classes`)

// ── 3. scanSource ─────────────────────────────────────────────────────────────
const sampleSource = `
  import { tw } from "tailwind-styled-v4"
  const Button = tw.button\`bg-blue-500 text-white px-4 py-2 hover:bg-blue-600\`
  const Card = tw.div\`rounded-xl shadow-md p-6\`
  const title = <h1 className="text-2xl font-bold text-gray-900">Hello</h1>
`

const found = scanSource(sampleSource)
console.log("\nClasses found in source:")
console.log(found)
