import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

function run(cmd, options = {}) {
  try {
    const out = execSync(cmd, { stdio: "pipe", encoding: "utf8", ...options })
    return { ok: true, output: out.trim() }
  } catch (error) {
    return {
      ok: false,
      output: (error.stdout || "").toString().trim(),
      error: (error.stderr || error.message || "").toString().trim(),
    }
  }
}

const root = process.cwd()
const reportDir = path.join(root, "artifacts")
const reportPath = path.join(reportDir, "validation-report.json")

const checks = {
  // ── Core builds ──────────────────────────────────────────────────────────
  buildCompiler:        run("npm run build -w packages/compiler"),
  buildScanner:         run("npm run build -w packages/scanner"),
  buildEngine:          run("npm run build -w packages/engine"),
  buildVite:            run("npm run build -w packages/vite"),
  buildCli:             run("npm run build -w packages/cli"),
  buildPluginRegistry:  run("npm run build -w packages/plugin-registry"),
  buildTesting:         run("npm run build -w packages/testing"),
  buildStorybookAddon:  run("npm run build -w packages/storybook-addon"),

  // ── Core tests ───────────────────────────────────────────────────────────
  coreTest:             run("npm run test -w packages/core"),
  engineTest:           run("npm run test -w packages/engine"),
  pluginRegistryTest:   run("npm run test -w packages/plugin-registry"),

  // ── Sprint 1+2 unit tests ────────────────────────────────────────────────
  testParse:            run("node --test packages/scanner/test/parse-v46.test.mjs"),
  testShake:            run("node --test packages/compiler/test/shake-v47.test.mjs"),
  testTestingUtils:     run("node --test packages/testing/test/testing-utils.test.mjs"),

  // ── CLI smoke ────────────────────────────────────────────────────────────
  benchNative:          run("npm run bench:native"),
  cliScan:              run("node packages/cli/dist/index.js scan packages/core/src --json"),
  cliMigrateDryRun:     run("node packages/cli/dist/index.js migrate packages/core/src --dry-run --json"),

  // ── Track B SLO checks ──────────────────────────────────────────────────────
  pluginListSlo:        run("node packages/plugin-registry/dist/cli.js list"),
  auditJsonSlo:         run("node scripts/v45/audit.mjs --json"),

  // ── Sprint 6 checks ──────────────────────────────────────────────────────
  registryList:         run("node scripts/v45/registry.mjs list --store=/tmp/tw-validate-registry"),
  clusterServerExists:  run("node -e \"require('fs').existsSync('scripts/v50/cluster-server.mjs')||process.exit(1)\""),
  routeCssMwExists:     run("node -e \"require('fs').existsSync('packages/next/src/routeCssMiddleware.ts')||process.exit(1)\""),
  studioUpdaterExists:  run("node -e \"require('fs').existsSync('packages/studio-desktop/src/updater.js')||process.exit(1)\""),

  // ── Sprint 1+2 scripts ───────────────────────────────────────────────────
  v46Parse:             run("node scripts/v46/parse.mjs packages/scanner/src/index.ts"),
  v47Shake:             run(`node -e "const fs=require('fs'),os=require('os'),p=require('path');const d=fs.mkdtempSync(p.join(os.tmpdir(),'twv'));const c=p.join(d,'t.css');fs.writeFileSync(c,'.px-4{p:1rem}');require('child_process').spawnSync(process.execPath,['scripts/v47/shake-css.mjs',c,'--classes-from','packages/scanner/src'],{stdio:'pipe'});fs.rmSync(d,{recursive:true})"`),
  v49Optimize:          run("node scripts/v49/optimize.mjs packages/scanner/src/index.ts --dedup"),
  v50ClusterInit:       run("node scripts/v50/cluster.mjs init 2"),
  aiGenerate:           run("node scripts/v45/ai.mjs primary button"),
  syncInit:             run("node scripts/v45/sync.mjs init", { cwd: root }),
}

let bench = null
if (checks.benchNative.ok) {
  const lines = checks.benchNative.output.split("\n")
  const jsonBlock = lines.slice(lines.findIndex((l) => l.trim().startsWith("{"))).join("\n")
  try {
    bench = JSON.parse(jsonBlock)
  } catch {
    bench = null
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  checks: Object.fromEntries(
    Object.entries(checks).map(([k, v]) => [k, { ok: v.ok, outputPreview: v.output.slice(0, 600) }])
  ),
  benchmark: bench,
  summary: {
    passed: Object.values(checks).filter((c) => c.ok).length,
    failed: Object.values(checks).filter((c) => !c.ok).length,
  },
}

fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n")

console.log(`Validation report written: ${path.relative(root, reportPath)}`)
if (report.summary.failed > 0) {
  console.error(`Validation finished with failures: ${report.summary.failed}`)
  process.exitCode = 1
}
