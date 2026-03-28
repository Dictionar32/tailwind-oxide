#!/usr/bin/env node
/**
 * tw studio [--project=.] — Studio Desktop
 *
 * Meluncurkan web-based component studio di browser.
 * Electron app penuh ada di Sprint 3; ini adalah web studio yang bisa
 * berjalan di browser lokal menggunakan Express + Vite dev server.
 *
 * Mode operasi:
 *   --mode=web     (default) — buka di browser, tidak perlu Electron
 *   --mode=electron — launch Electron jika terinstall
 *   --port=3030    — port untuk studio server
 */

import fs from "node:fs"
import path from "node:path"
import http from "node:http"
import { spawnSync, spawn } from "node:child_process"

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=")
    return [k, v ?? "true"]
  })
)

// --help
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: tw studio [--project=.] [--port=3030] [--mode=web|electron]")
  process.exit(0)
}

const projectDir = path.resolve(args.get("project") ?? ".")
const mode       = args.get("mode") ?? "web"
const port       = Number(args.get("port") ?? 3030)

// ─── Scan project untuk component info ────────────────────────────────────────

function scanComponents(dir) {
  const components = []
  const exts = [".tsx", ".jsx", ".ts", ".js", ".vue", ".svelte"]

  function walk(d, depth = 0) {
    if (depth > 5) return
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (["node_modules", ".next", "dist", ".cache", "out", ".git"].includes(entry.name)) continue
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) { walk(full, depth + 1); continue }
      if (!exts.includes(path.extname(entry.name))) continue

      const src = fs.readFileSync(full, "utf8")
      // Detect tw() usage
      const hasTw = /tw\.(button|div|span|a|input|section|article|nav|header|footer|p|h[1-6])\s*\(/.test(src)
      const hasCV = /\bcv\s*\(/.test(src)
      const exports = [...src.matchAll(/export\s+(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/g)].map(m => m[1])

      if (hasTw || hasCV || exports.length > 0) {
        components.push({
          file: path.relative(dir, full),
          name: exports[0] ?? path.basename(full, path.extname(full)),
          type: hasTw ? "tw" : hasCV ? "cv" : "plain",
          exports,
        })
      }
    }
  }

  try { walk(dir) } catch {}
  return components
}

// ─── Web Studio HTML ──────────────────────────────────────────────────────────

function buildStudioHtml(components, project) {
  const compRows = components.slice(0, 50).map((c) =>
    `<tr class="comp-row" data-file="${c.file}">
      <td class="name">${c.name}</td>
      <td class="type"><span class="badge badge-${c.type}">${c.type}</span></td>
      <td class="file">${c.file}</td>
      <td class="exports">${c.exports.slice(0, 3).join(", ")}</td>
    </tr>`
  ).join("")

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>tailwind-styled studio — ${path.basename(project)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
    :root {
      --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0;
      --text: #1e293b; --muted: #64748b; --accent: #3b82f6;
      --tw: #10b981; --cv: #8b5cf6; --plain: #94a3b8;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
    @media(prefers-color-scheme:dark){:root{--bg:#0f172a;--surface:#1e293b;--border:#334155;--text:#f1f5f9;--muted:#94a3b8}}
    body { background: var(--bg); color: var(--text); min-height: 100vh }
    .header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem;
              display: flex; align-items: center; justify-content: space-between }
    .header h1 { font-size: 1.1rem; font-weight: 600 }
    .header .project { font-size: .85rem; color: var(--muted); font-family: ui-monospace, monospace }
    .main { padding: 2rem; max-width: 1200px; margin: 0 auto }
    .stats { display: flex; gap: 1.5rem; margin-bottom: 2rem }
    .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
            padding: 1rem 1.5rem; flex: 1 }
    .stat .n { font-size: 2rem; font-weight: 700; color: var(--accent) }
    .stat .l { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted) }
    .search { width: 100%; padding: .6rem 1rem; border: 1px solid var(--border); border-radius: 8px;
              background: var(--surface); color: var(--text); font-size: .9rem; margin-bottom: 1rem }
    .search:focus { outline: none; border-color: var(--accent) }
    table { width: 100%; border-collapse: collapse; background: var(--surface);
            border: 1px solid var(--border); border-radius: 8px; overflow: hidden }
    th { padding: .75rem 1rem; text-align: left; font-size: .75rem; text-transform: uppercase;
         letter-spacing: .05em; color: var(--muted); border-bottom: 1px solid var(--border) }
    td { padding: .75rem 1rem; font-size: .875rem; border-bottom: 1px solid var(--border) }
    tr:last-child td { border-bottom: none }
    tr.comp-row:hover { background: var(--bg); cursor: pointer }
    .name { font-weight: 600 }
    .file { font-family: ui-monospace, monospace; font-size: .8rem; color: var(--muted) }
    .badge { padding: .2rem .5rem; border-radius: 4px; font-size: .7rem; font-weight: 600; text-transform: uppercase }
    .badge-tw { background: #d1fae5; color: #065f46 }
    .badge-cv { background: #ede9fe; color: #4c1d95 }
    .badge-plain { background: #f1f5f9; color: #64748b }
    @media(prefers-color-scheme:dark){.badge-tw{background:#064e3b;color:#6ee7b7}.badge-cv{background:#2e1065;color:#c4b5fd}.badge-plain{background:#1e293b;color:#94a3b8}}
    .empty { text-align: center; padding: 3rem; color: var(--muted) }
    #ai-form { display: flex; gap: .5rem; margin-top: 2rem }
    #ai-input { flex: 1; padding: .6rem 1rem; border: 1px solid var(--border); border-radius: 8px;
                background: var(--surface); color: var(--text); font-size: .9rem }
    #ai-btn { padding: .6rem 1.2rem; background: var(--accent); color: white; border: none;
              border-radius: 8px; cursor: pointer; font-size: .9rem; font-weight: 500 }
    #ai-btn:hover { opacity: .9 }
    #ai-output { margin-top: 1rem; background: var(--surface); border: 1px solid var(--border);
                 border-radius: 8px; padding: 1rem; font-family: ui-monospace, monospace;
                 font-size: .8rem; white-space: pre; overflow-x: auto; display: none }
    .section-title { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em;
                     color: var(--muted); margin-bottom: .75rem; margin-top: 2rem }
  </style>
</head>
<body>
  <header class="header">
    <h1>tailwind-styled studio</h1>
    <span class="project">${path.basename(project)}</span>
  </header>
  <main class="main">
    <div class="stats">
      <div class="stat"><div class="n">${components.length}</div><div class="l">Components</div></div>
      <div class="stat"><div class="n">${components.filter(c=>c.type==="tw").length}</div><div class="l">tw() styled</div></div>
      <div class="stat"><div class="n">${components.filter(c=>c.type==="cv").length}</div><div class="l">cv() variants</div></div>
      <div class="stat"><div class="n">${new Set(components.map(c=>c.file.split("/")[0])).size}</div><div class="l">Directories</div></div>
    </div>

    <input class="search" type="search" placeholder="Search components..." id="search" oninput="filterTable(this.value)"/>

    <table id="comp-table">
      <thead><tr><th>Name</th><th>Type</th><th>File</th><th>Exports</th></tr></thead>
      <tbody id="comp-body">
        ${compRows || '<tr><td colspan="4" class="empty">No tw() or cv() components found</td></tr>'}
      </tbody>
    </table>

    <div class="section-title">AI Component Generator</div>
    <div id="ai-form">
      <input id="ai-input" type="text" placeholder='Describe a component: "primary button with danger variant"'/>
      <button id="ai-btn" onclick="generateComponent()">Generate ✨</button>
    </div>
    <pre id="ai-output"></pre>
  </main>

  <script>
    function filterTable(q) {
      const rows = document.querySelectorAll('#comp-body .comp-row')
      const lq = q.toLowerCase()
      rows.forEach(r => {
        r.style.display = (!lq || r.textContent.toLowerCase().includes(lq)) ? '' : 'none'
      })
    }

    async function generateComponent() {
      const input = document.getElementById('ai-input').value.trim()
      if (!input) return
      const out = document.getElementById('ai-output')
      const btn = document.getElementById('ai-btn')
      btn.textContent = 'Generating...'
      btn.disabled = true
      out.style.display = 'block'
      out.textContent = '...'
      try {
        const r = await fetch('/api/generate?prompt=' + encodeURIComponent(input))
        const data = await r.json()
        out.textContent = data.code ?? data.error ?? 'Error'
      } catch(e) {
        out.textContent = 'Error: ' + e.message
      } finally {
        btn.textContent = 'Generate ✨'
        btn.disabled = false
      }
    }
  </script>
</body>
</html>`
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const components = scanComponents(projectDir)
console.log(`[tw studio] Found ${components.length} components in ${projectDir}`)

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`)

  if (url.pathname === "/api/components") {
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ components, total: components.length }))
    return
  }

  if (url.pathname === "/api/generate") {
    const prompt = url.searchParams.get("prompt") ?? ""
    // Call ai.mjs
    const aiScript = new URL("./ai.mjs", import.meta.url).pathname
    const r = spawnSync(process.execPath, [aiScript, prompt], { encoding: "utf8", timeout: 30_000 })
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ code: r.stdout.trim(), error: r.status !== 0 ? r.stderr : null }))
    return
  }

  if (url.pathname === "/health") {
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ ok: true, components: components.length }))
    return
  }

  // Default: studio UI
  res.setHeader("content-type", "text/html; charset=utf-8")
  res.end(buildStudioHtml(components, projectDir))
})

server.listen(port, () => {
  const studioUrl = `http://localhost:${port}`
  console.log(`[tw studio] Studio running at ${studioUrl}`)
  console.log(`[tw studio] Project: ${projectDir}`)

  // Try to open browser
  const openCmd = process.platform === "darwin" ? "open"
    : process.platform === "win32" ? "start"
    : "xdg-open"
  try {
    spawnSync(openCmd, [studioUrl], { stdio: "ignore" })
  } catch {}
})

// Electron mode
if (mode === "electron") {
  console.log("[tw studio] Electron mode: launching desktop window...")
  try {
    const electron = spawnSync("electron", ["--no-sandbox", `--app=${`http://localhost:${port}`}`], {
      stdio: "inherit",
    })
    if (electron.error) throw electron.error
  } catch {
    console.warn("[tw studio] Electron not available — studio already running in browser mode")
  }
}
