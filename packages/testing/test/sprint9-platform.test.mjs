/**
 * Tests — Sprint 9 (Platform Adapters & Studio Desktop)
 * Covers:
 *   - next/vite/rspack tsup.config noExternal (compiler bundled)
 *   - preserveImports: true di semua loader
 *   - studio-desktop engine IPC handlers
 *   - studio-desktop STUDIO_SCRIPT path resolution
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "../../..")

// ─── Next.js adapter ──────────────────────────────────────────────────────────

describe("Next.js adapter — Sprint 9", () => {
  const TSUP = path.join(ROOT, "packages/next/tsup.config.ts")
  const TURBO = path.join(ROOT, "packages/next/src/turbopackLoader.ts")
  const WEBPACK = path.join(ROOT, "packages/next/src/webpackLoader.ts")

  test("tsup.config has noExternal for @tailwind-styled/compiler", () => {
    const c = fs.readFileSync(TSUP, "utf8")
    assert.ok(c.includes("noExternal"), "should have noExternal array")
    assert.ok(c.includes("@tailwind-styled/compiler"), "compiler in noExternal")
    assert.ok(c.includes("@tailwind-styled/plugin"), "plugin in noExternal")
  })

  test("tsup.config external excludes *.node binaries", () => {
    const c = fs.readFileSync(TSUP, "utf8")
    assert.ok(c.includes("*.node") || c.includes("esbuildOptions"), "should skip *.node binaries")
  })

  test("tsup.config external keeps tailwindcss as external", () => {
    const c = fs.readFileSync(TSUP, "utf8")
    assert.ok(c.includes('"tailwindcss"'), "tailwindcss should remain external")
  })

  test("turbopackLoader has preserveImports: true", () => {
    const c = fs.readFileSync(TURBO, "utf8")
    assert.ok(c.includes("preserveImports: true"), "turbopackLoader should preserve imports")
  })

  test("webpackLoader has preserveImports: true", () => {
    const c = fs.readFileSync(WEBPACK, "utf8")
    assert.ok(c.includes("preserveImports: true"), "webpackLoader should preserve imports")
  })
})

// ─── Vite adapter ─────────────────────────────────────────────────────────────

describe("Vite adapter — Sprint 9", () => {
  const TSUP = path.join(ROOT, "packages/vite/tsup.config.ts")
  const PLUGIN = path.join(ROOT, "packages/vite/src/plugin.ts")

  test("tsup.config has noExternal for @tailwind-styled packages", () => {
    const c = fs.readFileSync(TSUP, "utf8")
    assert.ok(c.includes("noExternal"), "should have noExternal")
    assert.ok(c.includes("@tailwind-styled/compiler"), "compiler in noExternal")
    assert.ok(c.includes("@tailwind-styled/engine"), "engine in noExternal")
    assert.ok(c.includes("@tailwind-styled/scanner"), "scanner in noExternal")
  })

  test("plugin.ts has preserveImports: true", () => {
    const c = fs.readFileSync(PLUGIN, "utf8")
    assert.ok(c.includes("preserveImports: true"), "vite plugin should preserve imports")
  })

  test("plugin.ts uses runLoaderTransform", () => {
    const c = fs.readFileSync(PLUGIN, "utf8")
    assert.ok(c.includes("runLoaderTransform"), "should call runLoaderTransform")
  })
})

// ─── Rspack adapter ───────────────────────────────────────────────────────────

describe("Rspack adapter — Sprint 9", () => {
  const TSUP = path.join(ROOT, "packages/rspack/tsup.config.ts")
  const LOADER = path.join(ROOT, "packages/rspack/src/loader.ts")

  test("tsup.config.ts exists (new file in Sprint 9)", () => {
    assert.ok(fs.existsSync(TSUP), "rspack tsup.config.ts should exist")
  })

  test("tsup.config has noExternal for @tailwind-styled/compiler", () => {
    const c = fs.readFileSync(TSUP, "utf8")
    assert.ok(c.includes("noExternal"), "should have noExternal")
    assert.ok(c.includes("@tailwind-styled/compiler"), "compiler in noExternal")
  })

  test("loader.ts has preserveImports: true", () => {
    const c = fs.readFileSync(LOADER, "utf8")
    assert.ok(c.includes("preserveImports: true"), "rspack loader should preserve imports")
  })

  test("loader.ts uses runLoaderTransform", () => {
    const c = fs.readFileSync(LOADER, "utf8")
    assert.ok(c.includes("runLoaderTransform"), "should call runLoaderTransform")
  })
})

// ─── Studio Desktop ───────────────────────────────────────────────────────────

describe("Studio Desktop — Sprint 9", () => {
  const SD = path.join(ROOT, "packages/studio-desktop/src")
  const MAIN = path.join(SD, "main.js")
  const PRELOAD = path.join(SD, "preload.js")
  const PKG = path.join(ROOT, "packages/studio-desktop/package.json")

  test("main.js has resolveStudioScript function", () => {
    const c = fs.readFileSync(MAIN, "utf8")
    assert.ok(c.includes("resolveStudioScript"), "should have resolveStudioScript")
    assert.ok(c.includes("process.resourcesPath"), "should check resourcesPath for packaged app")
    assert.ok(c.includes("STUDIO_SCRIPT = resolveStudioScript()"), "should assign STUDIO_SCRIPT")
  })

  test("main.js studio script has multiple path candidates", () => {
    const c = fs.readFileSync(MAIN, "utf8")
    assert.ok(c.includes("candidates"), "should have candidates array")
    // Packaged, dev, and cwd fallback
    assert.ok(c.includes("resourcesPath"), "should include resourcesPath candidate")
    assert.ok(c.includes("__dirname"), "should include __dirname candidate")
  })

  test("main.js has engine IPC handlers", () => {
    const c = fs.readFileSync(MAIN, "utf8")
    assert.ok(c.includes('"engine-scan"'), "should handle engine-scan")
    assert.ok(c.includes('"engine-build"'), "should handle engine-build")
    assert.ok(c.includes('"engine-watch-start"'), "should handle engine-watch-start")
    assert.ok(c.includes('"engine-watch-stop"'), "should handle engine-watch-stop")
  })

  test("main.js engine uses createEngine from @tailwind-styled/engine", () => {
    const c = fs.readFileSync(MAIN, "utf8")
    assert.ok(c.includes("createEngine"), "should use createEngine")
    assert.ok(c.includes("@tailwind-styled/engine"), "should require engine package")
  })

  test("main.js forwards engine events to renderer via webContents.send", () => {
    const c = fs.readFileSync(MAIN, "utf8")
    assert.ok(c.includes("engine-event"), "should have engine-event channel")
    assert.ok(c.includes("webContents.send"), "should send events to renderer")
  })

  test("main.js resets engine on project change", () => {
    const c = fs.readFileSync(MAIN, "utf8")
    assert.ok(c.includes("engine-reset"), "should reset engine on project change")
  })

  test("preload.js exposes engineScan, engineBuild, engineWatchStart, engineWatchStop", () => {
    const c = fs.readFileSync(PRELOAD, "utf8")
    assert.ok(c.includes("engineScan"), "should expose engineScan")
    assert.ok(c.includes("engineBuild"), "should expose engineBuild")
    assert.ok(c.includes("engineWatchStart"), "should expose engineWatchStart")
    assert.ok(c.includes("engineWatchStop"), "should expose engineWatchStop")
  })

  test("preload.js exposes onEngineEvent subscription", () => {
    const c = fs.readFileSync(PRELOAD, "utf8")
    assert.ok(c.includes("onEngineEvent"), "should expose onEngineEvent")
    assert.ok(c.includes("engine-event"), "should listen to engine-event channel")
  })

  test("package.json has build scripts for all platforms", () => {
    const pkg = JSON.parse(fs.readFileSync(PKG, "utf8"))
    assert.ok(pkg.scripts["build:mac"], "should have build:mac")
    assert.ok(pkg.scripts["build:win"], "should have build:win")
    assert.ok(pkg.scripts["build:linux"], "should have build:linux")
    assert.ok(pkg.scripts["build:all"], "should have build:all")
  })

  test("package.json extraResources includes studio.mjs", () => {
    const pkg = JSON.parse(fs.readFileSync(PKG, "utf8"))
    const extras = pkg.build?.extraResources ?? []
    const hasStudio = extras.some((r) => String(r.from ?? r).includes("studio.mjs"))
    assert.ok(hasStudio, "extraResources should include studio.mjs")
  })

  test("package.json dependencies include @tailwind-styled/engine and scanner", () => {
    const pkg = JSON.parse(fs.readFileSync(PKG, "utf8"))
    assert.ok(pkg.dependencies["@tailwind-styled/engine"], "should depend on engine")
    assert.ok(pkg.dependencies["@tailwind-styled/scanner"], "should depend on scanner")
  })
})
