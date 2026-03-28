import { test } from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pkgDir = path.resolve(__dirname, "..")
const cliPath = path.join(pkgDir, "dist/cli.js")

function runCli(args, env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: pkgDir,
    encoding: "utf8",
    env: { ...process.env, ...env },
  })
}

test("search returns plugin from registry", () => {
  const run = runCli(["search", "animation"])
  assert.equal(run.status, 0)
  assert.match(run.stdout, /@tailwind-styled\/plugin-animation@5\.0\.0/)
})

test("list returns registry plugin entries", () => {
  const run = runCli(["list"])
  assert.equal(run.status, 0)
  assert.match(run.stdout, /@tailwind-styled\/plugin-forms@5\.0\.0/)
})

test("install --dry-run succeeds for registry plugin", () => {
  const run = runCli(["install", "@tailwind-styled/plugin-animation", "--dry-run"])
  assert.equal(run.status, 0)
  assert.match(run.stdout, /Installed: @tailwind-styled\/plugin-animation/)
})

test("install without plugin name exits non-zero", () => {
  const run = runCli(["install"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /Missing plugin name/)
})

test("unknown command exits non-zero", () => {
  const run = runCli(["unknown-cmd"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /Unknown command: unknown-cmd/)
})

test("plugin not in registry shows actionable message", () => {
  const run = runCli(["install", "left-pad", "--dry-run"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /PLUGIN_NOT_FOUND/)
  assert.match(run.stderr, /tw-plugin search <keyword>/)
})

test("external plugin requires --yes confirmation", () => {
  const run = runCli(["install", "left-pad", "--dry-run", "--allow-external"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /EXTERNAL_CONFIRMATION_REQUIRED/)
})

test("external plugin allowed with --allow-external --yes", () => {
  const run = runCli(["install", "left-pad", "--dry-run", "--allow-external", "--yes"])
  assert.equal(run.status, 0)
  assert.match(run.stdout, /Installed: left-pad/)
})

test("invalid plugin name gets standardized error", () => {
  const run = runCli(["install", "bad;name", "--dry-run"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /INVALID_PLUGIN_NAME/)
})

test("install failure path returns non-zero", () => {
  const run = runCli(["install", "@tailwind-styled/plugin-animation"], {
    TW_PLUGIN_NPM_BIN: "__missing_npm_bin__",
  })
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /INSTALL_COMMAND_FAILED/)
})

test("uninstall --dry-run succeeds for registry plugin", () => {
  const run = runCli(["uninstall", "@tailwind-styled/plugin-animation", "--dry-run"])
  assert.equal(run.status, 0)
  assert.match(run.stdout, /Uninstalled: @tailwind-styled\/plugin-animation/)
})

test("uninstall without plugin name exits non-zero", () => {
  const run = runCli(["uninstall"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /Missing plugin name/)
})

test("uninstall dry-run returns proper JSON output", () => {
  const run = runCli(["uninstall", "@tailwind-styled/plugin-animation", "--dry-run", "--json"])
  assert.equal(run.status, 0)
  const output = JSON.parse(run.stdout)
  assert.equal(output.plugin, "@tailwind-styled/plugin-animation")
  assert.equal(output.uninstalled, true)
  assert.equal(output.command, "npm uninstall @tailwind-styled/plugin-animation")
})

test("update-check returns update status", () => {
  const run = runCli(["update-check"])
  assert.equal(run.status, 0)
  assert.match(run.stdout, /up to date|update\(s\)/i)
})

test("update-check --json returns JSON output", () => {
  const run = runCli(["update-check", "--json"])
  assert.equal(run.status, 0)
  const output = JSON.parse(run.stdout)
  assert.ok(Array.isArray(output))
  assert.ok(output.length > 0)
  assert.ok(output[0].name !== undefined)
  assert.ok(output[0].hasUpdate !== undefined)
})

test("verify returns integrity status for registry plugin", () => {
  const run = runCli(["verify", "@tailwind-styled/plugin-animation"])
  assert.match(run.stdout, /\[OK\]|\[FAIL\]/)
  assert.match(run.stdout, /plugin not installed|integrity OK|Integrity/)
})

test("verify --json returns JSON output", () => {
  const run = runCli(["verify", "@tailwind-styled/plugin-animation", "--json"])
  assert.equal(run.status, 0)
  const output = JSON.parse(run.stdout)
  assert.equal(output.plugin, "@tailwind-styled/plugin-animation")
  assert.equal(output.ok !== undefined, true)
})

test("verify without plugin name exits non-zero", () => {
  const run = runCli(["verify"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /Missing plugin name/)
})

test("info returns plugin details", () => {
  const run = runCli(["info", "@tailwind-styled/plugin-animation"])
  assert.equal(run.status, 0)
  assert.match(run.stdout, /@tailwind-styled\/plugin-animation@5\.0\.0/)
  assert.match(run.stdout, /official|community/)
})

test("info --json returns JSON output", () => {
  const run = runCli(["info", "@tailwind-styled/plugin-animation", "--json"])
  assert.equal(run.status, 0)
  const output = JSON.parse(run.stdout)
  assert.equal(output.name, "@tailwind-styled/plugin-animation")
  assert.equal(output.version, "5.0.0")
})

test("info without plugin name exits non-zero", () => {
  const run = runCli(["info"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /Missing plugin name/)
})

test("info for non-existent plugin exits non-zero", () => {
  const run = runCli(["info", "nonexistent-plugin"])
  assert.notEqual(run.status, 0)
  assert.match(run.stderr, /not found/i)
})
