/**
 * Unit tests — tw parse (v4.6)
 * Test semua tiga strategy: oxc → babel → regex
 * Menggunakan Node.js built-in test runner (no external deps)
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const PARSE_SCRIPT = fileURLToPath(new URL("../../../scripts/v46/parse.mjs", import.meta.url))

// ─── Helpers ────────────────────────────────────────────────────────────────

function writeTempFile(content, ext = ".tsx") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-parse-test-"))
  const file = path.join(dir, `test${ext}`)
  fs.writeFileSync(file, content)
  return { file, dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) }
}

function runParse(file) {
  const result = spawnSync(process.execPath, [PARSE_SCRIPT, file], {
    encoding: "utf8",
    timeout: 10_000,
  })
  if (result.error) throw result.error
  return { stdout: result.stdout, stderr: result.stderr, status: result.status }
}

function parseOutput(stdout) {
  return JSON.parse(stdout)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("tw parse — file validation", () => {
  test("exits non-zero when no file given", () => {
    const result = spawnSync(process.execPath, [PARSE_SCRIPT], { encoding: "utf8" })
    assert.notEqual(result.status, 0)
  })

  test("exits non-zero for missing file", () => {
    const result = spawnSync(process.execPath, [PARSE_SCRIPT, "/nonexistent/file.tsx"], {
      encoding: "utf8",
    })
    assert.notEqual(result.status, 0)
  })
})

describe("tw parse — JSX className extraction", () => {
  test("extracts classes from JSX className string literal", () => {
    const { file, cleanup } = writeTempFile(
      `export function Btn() { return <button className="px-4 py-2 bg-blue-500 text-white rounded">Click</button> }`
    )
    try {
      const { stdout, status } = runParse(file)
      assert.equal(status, 0)
      const out = parseOutput(stdout)
      assert.ok(out.classes.includes("px-4"), `expected px-4 in ${JSON.stringify(out.classes)}`)
      assert.ok(out.classes.includes("bg-blue-500"))
      assert.ok(out.classes.includes("text-white"))
      assert.ok(out.classes.includes("rounded"))
      assert.equal(out.classCount, out.classes.length)
    } finally {
      cleanup()
    }
  })

  test("extracts multiple elements", () => {
    const { file, cleanup } = writeTempFile(`
      export function Card() {
        return (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-900">Title</h2>
            <p className="text-sm text-gray-500">Body</p>
          </div>
        )
      }
    `)
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      assert.ok(out.classes.includes("flex"))
      assert.ok(out.classes.includes("text-xl"))
      assert.ok(out.classes.includes("font-bold"))
      assert.ok(out.classes.includes("text-sm"))
      assert.ok(out.classCount >= 7)
    } finally {
      cleanup()
    }
  })

  test("handles variant classes (hover:, dark:, md:)", () => {
    const { file, cleanup } = writeTempFile(
      `export const A = () => <div className="hover:opacity-75 dark:bg-gray-900 md:flex-row" />`
    )
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      assert.ok(out.classes.includes("hover:opacity-75"))
      assert.ok(out.classes.includes("dark:bg-gray-900"))
      assert.ok(out.classes.includes("md:flex-row"))
    } finally {
      cleanup()
    }
  })
})

describe("tw parse — twMerge / cx / clsx extraction", () => {
  test("extracts classes from twMerge() call", () => {
    const { file, cleanup } = writeTempFile(`
      import { twMerge } from 'tailwind-merge'
      export const cls = twMerge('px-4 py-2', 'bg-blue-500')
    `)
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      assert.ok(out.classes.includes("px-4"))
      assert.ok(out.classes.includes("bg-blue-500"))
    } finally {
      cleanup()
    }
  })

  test("extracts classes from cn() call", () => {
    const { file, cleanup } = writeTempFile(`
      export const cls = cn('flex items-center', 'gap-2 text-sm')
    `)
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      assert.ok(out.classes.includes("flex"))
      assert.ok(out.classes.includes("items-center"))
      assert.ok(out.classes.includes("gap-2"))
    } finally {
      cleanup()
    }
  })
})

describe("tw parse — output shape", () => {
  test("output includes required fields", () => {
    const { file, cleanup } = writeTempFile(
      `export const A = () => <div className="p-4" />`
    )
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      assert.ok("file" in out, "missing field: file")
      assert.ok("mode" in out, "missing field: mode")
      assert.ok("classCount" in out, "missing field: classCount")
      assert.ok("classes" in out, "missing field: classes")
      assert.ok("parseMs" in out, "missing field: parseMs")
      assert.ok(Array.isArray(out.classes))
      assert.ok(typeof out.parseMs === "number")
    } finally {
      cleanup()
    }
  })

  test("mode is one of known strategies", () => {
    const { file, cleanup } = writeTempFile(`export const A = () => <div className="p-4" />`)
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      const valid = ["oxc-parser", "babel-parser", "regex-fallback"]
      assert.ok(valid.includes(out.mode), `unexpected mode: ${out.mode}`)
    } finally {
      cleanup()
    }
  })

  test("parseMs is non-negative", () => {
    const { file, cleanup } = writeTempFile(`export const A = () => <div className="p-4" />`)
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      assert.ok(out.parseMs >= 0)
    } finally {
      cleanup()
    }
  })
})

describe("tw parse — empty and edge cases", () => {
  test("empty file returns zero classes", () => {
    const { file, cleanup } = writeTempFile(``)
    try {
      const { stdout, status } = runParse(file)
      assert.equal(status, 0)
      const out = parseOutput(stdout)
      assert.equal(out.classCount, 0)
      assert.deepEqual(out.classes, [])
    } finally {
      cleanup()
    }
  })

  test("no className attributes returns zero classes", () => {
    const { file, cleanup } = writeTempFile(`
      export function NoStyles() {
        return <div><span>Hello world</span></div>
      }
    `)
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      assert.equal(out.classCount, 0)
    } finally {
      cleanup()
    }
  })

  test("classes are deduplicated", () => {
    const { file, cleanup } = writeTempFile(
      `export const A = () => <><div className="px-4 py-2" /><span className="px-4 gap-2" /></>`
    )
    try {
      const { stdout } = runParse(file)
      const out = parseOutput(stdout)
      const px4Count = out.classes.filter((c) => c === "px-4").length
      assert.equal(px4Count, 1, "px-4 should be deduplicated")
    } finally {
      cleanup()
    }
  })

  test("works on plain .js files", () => {
    const { file, cleanup } = writeTempFile(
      `const el = document.createElement('div'); el.className = 'flex items-center'`,
      ".js"
    )
    try {
      const { stdout, status } = runParse(file)
      assert.equal(status, 0)
      const out = parseOutput(stdout)
      assert.ok(typeof out.classCount === "number")
    } finally {
      cleanup()
    }
  })
})
