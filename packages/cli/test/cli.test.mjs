/**
 * Test suite: create-tailwind-styled (CLI)
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { execFileSync, execSync } from "node:child_process"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const DIST = path.join(ROOT, "packages/cli/dist")

describe("Dist files tersedia", () => {
  for (const file of [
    "index.js", "setup.js", "preflight.js",
    "analyze.js", "scan.js", "stats.js",
    "migrate.js", "init.js", "extract.js",
  ]) {
    test(`${file} ada`, () => {
      assert.ok(fs.existsSync(path.join(DIST, file)), `${file} tidak ada di dist/`)
    })
  }
})

describe("setup — source verifikasi", () => {
  const src = fs.readFileSync(path.join(ROOT, "packages/cli/src/setup.ts"), "utf8")

  test("pickProjectType tersedia", () => {
    assert.ok(src.includes("pickProjectType"))
  })

  test("support 4 project types: next, vite, rspack, react", () => {
    assert.ok(src.includes('"next"'))
    assert.ok(src.includes('"vite"'))
    assert.ok(src.includes('"rspack"'))
    assert.ok(src.includes('"react"'))
  })

  test("semua patch functions ada", () => {
    assert.ok(src.includes("patchNextConfig"),   "patchNextConfig")
    assert.ok(src.includes("patchViteConfig"),   "patchViteConfig")
    assert.ok(src.includes("patchRspackConfig"), "patchRspackConfig")
  })

  test("flag --dry-run dan --skip-install support", () => {
    assert.ok(src.includes("--dry-run"),       "--dry-run")
    assert.ok(src.includes("--skip-install"),  "--skip-install")
  })

  test("flag --yes dan explicit project type support", () => {
    assert.ok(src.includes("--yes"), "--yes")
    assert.ok(src.includes("--next"), "--next")
    assert.ok(src.includes("--vite"), "--vite")
    assert.ok(src.includes("--rspack"), "--rspack")
    assert.ok(src.includes("--react"), "--react")
  })

  test("patch adapter memakai API plugin yang benar", () => {
    assert.ok(src.includes("tailwindStyledPlugin"), "vite patch harus pakai tailwindStyledPlugin")
    assert.ok(
      src.includes("tailwindStyledRspackPlugin"),
      "rspack patch harus pakai tailwindStyledRspackPlugin"
    )
  })

  test("patch adapter mendukung migrasi import legacy", () => {
    assert.ok(src.includes("tailwind-styled-v4/vite"), "harus detect import vite legacy")
    assert.ok(src.includes("tailwind-styled-v4/rspack"), "harus detect import rspack legacy")
  })

  test("patch next config membungkus dengan withTailwindStyled()(config)", () => {
    assert.ok(
      src.includes("withTailwindStyled()("),
      "next patch harus menghasilkan withTailwindStyled()(nextConfig)"
    )
  })
})

describe("createApp — source verifikasi", () => {
  const src = fs.readFileSync(path.join(ROOT, "packages/cli/src/createApp.ts"), "utf8")

  test("template memakai adapter package v5", () => {
    assert.ok(src.includes('@tailwind-styled/next'), "@tailwind-styled/next")
    assert.ok(src.includes('@tailwind-styled/vite'), "@tailwind-styled/vite")
    assert.ok(src.includes('@tailwind-styled/vue'), "@tailwind-styled/vue")
    assert.ok(src.includes('@tailwind-styled/svelte'), "@tailwind-styled/svelte")
    assert.ok(src.includes("^5.0.0"), "harus referensi dependency v5")
  })
})

describe("create — runtime verifikasi", () => {
  test("create simple --dry-run --json tidak menulis file", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-create-dry-"))
    try {
      const out = execFileSync(
        process.execPath,
        [
          path.join(DIST, "index.js"),
          "create",
          "demo-app",
          "--template=simple",
          "--yes",
          "--dry-run",
          "--json",
        ],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "create")
      assert.equal(parsed.data.name, "demo-app")
      assert.equal(parsed.data.template, "simple")
      assert.equal(parsed.data.dryRun, true)
      assert.equal(parsed.data.filesCreated, 2)
      assert.equal(fs.existsSync(path.join(tmpDir, "demo-app")), false)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("create unknown template + --json menghasilkan error JSON valid", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-create-err-"))
    try {
      assert.throws(
        () =>
          execFileSync(
            process.execPath,
            [path.join(DIST, "index.js"), "create", "demo-app", "--template=unknown", "--yes", "--json"],
            { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
          ),
        (error) => {
          const payload = JSON.parse(String(error.stdout || "{}"))
          assert.equal(payload.error, true)
          assert.equal(payload.code, "CLI_USAGE_ERROR")
          assert.equal(payload.exitCode, 2)
          assert.equal(typeof payload.message, "string")
          return true
        }
      )
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("global --json sebelum command create tetap hasilkan JSON valid", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-create-global-json-"))
    try {
      const out = execFileSync(
        process.execPath,
        [
          path.join(DIST, "index.js"),
          "--json",
          "create",
          "demo-app",
          "--template=simple",
          "--yes",
          "--dry-run",
        ],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )
      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "create")
      assert.equal(parsed.data.name, "demo-app")
      assert.equal(parsed.data.template, "simple")
      assert.equal(parsed.data.dryRun, true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("createApp direct --json unknown template menghasilkan error JSON valid", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-create-direct-json-"))
    try {
      assert.throws(
        () =>
          execFileSync(
            process.execPath,
            [path.join(DIST, "createApp.js"), "demo-app", "--template=unknown", "--yes", "--json"],
            { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
          ),
        (error) => {
          const payload = JSON.parse(String(error.stdout || "{}"))
          assert.equal(payload.ok, false)
          assert.equal(payload.error, true)
          assert.equal(payload.command, "create")
          assert.equal(payload.code, "CLI_USAGE_ERROR")
          assert.equal(payload.exitCode, 2)
          return true
        }
      )
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

describe("json schema — runtime verifikasi", () => {
  test("deploy --dry-run --json mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-deploy-json-"))
    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ name: "demo-deploy", version: "1.2.3", description: "Demo package" })
      )

      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "deploy", "--dry-run"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "deploy")
      assert.equal(parsed.data.mode, "dry-run")
      assert.equal(parsed.data.component, "demo-deploy")
      assert.equal(parsed.data.manifest.version, "1.2.3")
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("share --json mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-share-json-"))
    try {
      fs.mkdirSync(path.join(tmpDir, ".tw-cache"), { recursive: true })
      fs.writeFileSync(
        path.join(tmpDir, ".tw-cache", "deploy-manifest.json"),
        JSON.stringify({ name: "shared-comp", version: "0.9.0", registry: "https://registry.example.dev" })
      )

      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "share"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "share")
      assert.equal(parsed.data.name, "shared-comp")
      assert.equal(parsed.data.version, "0.9.0")
      assert.equal(parsed.data.registry, "https://registry.example.dev")
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("code --docs --json mengembalikan envelope JSON sukses", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(DIST, "index.js"), "--json", "code", "--docs"],
      { cwd: ROOT, encoding: "utf8", timeout: 10000 }
    )

    const parsed = JSON.parse(out)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.error, false)
    assert.equal(parsed.command, "code")
    assert.equal(parsed.data.action, "docs")
    assert.equal(typeof parsed.data.url, "string")
    assert.ok(parsed.data.url.includes("marketplace.visualstudio.com"))
  })

  test("dashboard --json menghasilkan error JSON usage yang valid", () => {
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [path.join(DIST, "index.js"), "--json", "dashboard"],
          { cwd: ROOT, encoding: "utf8", timeout: 10000 }
        ),
      (error) => {
        const payload = JSON.parse(String(error.stdout || "{}"))
        assert.equal(payload.ok, false)
        assert.equal(payload.error, true)
        assert.equal(payload.command, "dashboard")
        assert.equal(payload.code, "CLI_USAGE_ERROR")
        assert.equal(payload.exitCode, 2)
        return true
      }
    )
  })

  test("plugin list --json mengembalikan envelope JSON sukses", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(DIST, "index.js"), "--json", "plugin", "list"],
      { cwd: ROOT, encoding: "utf8", timeout: 10000 }
    )

    const parsed = JSON.parse(out)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.error, false)
    assert.equal(parsed.command, "plugin.list")
    assert.equal(typeof parsed.data.count, "number")
    assert.equal(Array.isArray(parsed.data.plugins), true)
  })

  test("plugin search --json mengembalikan envelope JSON sukses", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(DIST, "index.js"), "--json", "plugin", "search", "tailwind"],
      { cwd: ROOT, encoding: "utf8", timeout: 10000 }
    )

    const parsed = JSON.parse(out)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.error, false)
    assert.equal(parsed.command, "plugin.search")
    assert.equal(parsed.data.query, "tailwind")
    assert.equal(Array.isArray(parsed.data.results), true)
  })

  test("storybook --variants --json mengembalikan envelope JSON sukses", () => {
    const out = execFileSync(
      process.execPath,
      [
        path.join(DIST, "index.js"),
        "--json",
        "storybook",
        "--variants={\"size\":[\"sm\",\"lg\"],\"intent\":[\"primary\",\"ghost\"]}",
      ],
      { cwd: ROOT, encoding: "utf8", timeout: 10000 }
    )

    const parsed = JSON.parse(out)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.error, false)
    assert.equal(parsed.command, "storybook.variants")
    assert.equal(parsed.data.count, 4)
    assert.equal(Array.isArray(parsed.data.rows), true)
  })

  test("storybook --json tanpa --variants menghasilkan error usage", () => {
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [path.join(DIST, "index.js"), "--json", "storybook"],
          { cwd: ROOT, encoding: "utf8", timeout: 10000 }
        ),
      (error) => {
        const payload = JSON.parse(String(error.stdout || "{}"))
        assert.equal(payload.ok, false)
        assert.equal(payload.error, true)
        assert.equal(payload.command, "storybook")
        assert.equal(payload.code, "CLI_USAGE_ERROR")
        return true
      }
    )
  })

  test("registry list --json mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-registry-json-"))
    try {
      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "registry", "list"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "registry.list")
      assert.equal(parsed.data.outputFormat, "text")
      assert.equal(typeof parsed.data.output, "string")
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("sync init --json mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-sync-json-"))
    try {
      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "sync", "init"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "sync.init")
      assert.equal(parsed.data.outputFormat, "text")
      assert.equal(fs.existsSync(path.join(tmpDir, "tokens.sync.json")), true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("script parse --json mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-parse-json-"))
    try {
      fs.writeFileSync(
        path.join(tmpDir, "sample.tsx"),
        'export function App(){ return <div className="text-red-500 p-2">x</div> }\n'
      )

      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "parse", "sample.tsx"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "parse")
      assert.equal(parsed.data.outputFormat, "json")
      assert.equal(typeof parsed.data.output.classCount, "number")
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("init --json mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-init-json-"))
    try {
      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "init"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "init")
      assert.equal(Array.isArray(parsed.data.created), true)
      assert.equal(Array.isArray(parsed.data.skipped), true)
      assert.equal(fs.existsSync(path.join(tmpDir, "src", "tailwind.css")), true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("scan --json mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-scan-json-"))
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true })
      fs.writeFileSync(
        path.join(tmpDir, "src", "app.tsx"),
        'export const App = () => <div className="p-2 text-red-500">x</div>\n'
      )

      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "scan"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "scan")
      assert.equal(typeof parsed.data.totalFiles, "number")
      assert.equal(typeof parsed.data.uniqueClassCount, "number")
      assert.equal(Array.isArray(parsed.data.topClasses), true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("migrate --json mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-migrate-json-"))
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true })
      fs.writeFileSync(
        path.join(tmpDir, "src", "index.tsx"),
        "import { tw } from 'tailwind-styled-components'\nconst x = 'flex-grow'\n"
      )

      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "migrate", "--dry-run"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "migrate")
      assert.equal(parsed.data.dryRun, true)
      assert.equal(typeof parsed.data.scannedFiles, "number")
      assert.equal(typeof parsed.data.updatedFiles, "number")
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("preflight --json --allow-fail mengembalikan envelope JSON sukses", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-preflight-json-"))
    try {
      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "preflight", "--allow-fail"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "preflight")
      assert.equal(typeof parsed.data.generatedAt, "string")
      assert.equal(typeof parsed.data.summary, "object")
      assert.equal(Array.isArray(parsed.data.checks), true)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("version --json mengembalikan envelope JSON sukses", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(DIST, "index.js"), "--json", "version"],
      { cwd: ROOT, encoding: "utf8", timeout: 10000 }
    )

    const parsed = JSON.parse(out)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.error, false)
    assert.equal(parsed.command, "version")
    assert.equal(parsed.data.packageName, "create-tailwind-styled")
    assert.equal(typeof parsed.data.currentVersion, "string")
  })

  test("help setup --json mengembalikan command help yang terstruktur", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(DIST, "index.js"), "--json", "help", "setup"],
      { cwd: ROOT, encoding: "utf8", timeout: 10000 }
    )

    const parsed = JSON.parse(out)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.error, false)
    assert.equal(parsed.command, "help")
    assert.equal(parsed.data.command, "setup")
    assert.equal(typeof parsed.data.text, "string")
    assert.ok(parsed.data.text.includes("Usage: tw setup [options]"))
  })

  test("global --json tanpa command mengembalikan help envelope JSON", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(DIST, "index.js"), "--json"],
      { cwd: ROOT, encoding: "utf8", timeout: 10000 }
    )

    const parsed = JSON.parse(out)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.error, false)
    assert.equal(parsed.command, "help")
    assert.equal(typeof parsed.data.text, "string")
    assert.ok(parsed.data.text.includes("tailwind-styled-v4 CLI"))
  })
})

describe("setup — tw setup next.js dry-run", () => {
  test("setup Next.js dengan dry-run tidak crash", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-test-"))
    try {
      fs.writeFileSync(path.join(tmpDir, "package.json"),
        JSON.stringify({ name: "test-app", dependencies: { next: "^16" } }))
      fs.writeFileSync(path.join(tmpDir, "next.config.ts"),
        'import type { NextConfig } from "next"\nconst c: NextConfig = {}\nexport default c\n')

      const out = execSync(
        `echo "1" | node "${path.join(DIST, "index.js")}" setup --skip-install --dry-run`,
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )
      assert.ok(out.includes("Next.js") || out.includes("setup") || out.includes("Terdeteksi"),
        `output: ${out.slice(0, 150)}`)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("setup Vite dengan dry-run tidak crash", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-vite-"))
    try {
      fs.writeFileSync(path.join(tmpDir, "package.json"),
        JSON.stringify({ name: "test-app", devDependencies: { vite: "^6" } }))
      fs.writeFileSync(path.join(tmpDir, "vite.config.ts"),
        'import { defineConfig } from "vite"\nexport default defineConfig({})\n')

      const out = execSync(
        `echo "2" | node "${path.join(DIST, "index.js")}" setup --skip-install --dry-run`,
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )
      assert.ok(out.includes("Vite") || out.includes("setup"),
        `output: ${out.slice(0, 150)}`)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("setup --next --yes --dry-run non-interactive tidak prompt", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-next-flag-"))
    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ name: "test-app", dependencies: { next: "^16" } })
      )

      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "setup", "--next", "--yes", "--dry-run", "--skip-install"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      assert.ok(out.includes("Project type dipaksa via flag: Next.js"), out)
      assert.ok(!out.includes("Pilihan [1-"), `masih prompt interaktif:\n${out}`)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test("setup --json output valid JSON (stdout only JSON)", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tw-cli-setup-json-"))
    try {
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify({ name: "test-app", dependencies: { next: "^16" } })
      )
      fs.writeFileSync(
        path.join(tmpDir, "next.config.ts"),
        'import type { NextConfig } from "next"\nconst c: NextConfig = {}\nexport default c\n'
      )

      const out = execFileSync(
        process.execPath,
        [path.join(DIST, "index.js"), "--json", "setup", "--next", "--yes", "--dry-run", "--skip-install"],
        { cwd: tmpDir, encoding: "utf8", timeout: 10000 }
      )

      const parsed = JSON.parse(out)
      assert.equal(parsed.ok, true)
      assert.equal(parsed.error, false)
      assert.equal(parsed.command, "setup")
      assert.equal(parsed.data.selected, "next")
      assert.equal(parsed.data.dryRun, true)
      assert.equal(Array.isArray(parsed.data.events), true)
      assert.ok(parsed.data.events.length > 0)
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

describe("preflight — source verifikasi", () => {
  const src = fs.readFileSync(path.join(ROOT, "packages/cli/src/preflight.ts"), "utf8")

  test("preflight ada konten", () => {
    assert.ok(src.length > 0)
  })

  test("preflight cek tailwind-styled config", () => {
    assert.ok(src.includes("tailwind-styled"), `content snippet: ${src.slice(0,100)}`)
  })

  test("preflight enforce Node.js >=20", () => {
    assert.ok(src.includes("node.major >= 20"), "preflight harus check Node >=20")
  })

  test("preflight --fix resolve index entry for ts and js", () => {
    assert.ok(src.includes("preflight.ts"), "harus handle preflight.ts")
    assert.ok(src.includes("preflight.js"), "harus handle preflight.js")
    assert.ok(src.includes("resolveCliEntry"), "harus punya resolver CLI entry")
  })
})

describe("stats — source verifikasi", () => {
  const src = fs.readFileSync(path.join(ROOT, "packages/cli/src/stats.ts"), "utf8")
  test("stats ada konten", () => assert.ok(src.length > 0))
})
