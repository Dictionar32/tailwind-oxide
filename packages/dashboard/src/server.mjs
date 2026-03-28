/**
 * tailwind-styled-v4 Dashboard Server
 *
 * HTTP server yang expose LIVE build metrics dari engine.
 * Bukan lagi hardcoded — connect ke engine via file-based IPC atau
 * event emitter jika dijalankan dalam proses yang sama.
 *
 * Port default: 3000 (override via PORT env var)
 *
 * Endpoints:
 *   GET /           → HTML dashboard UI
 *   GET /metrics    → JSON metrics snapshot (live)
 *   GET /history    → JSON array dari metrics snapshots (max 100)
 *   POST /reset     → Reset history
 *   GET /health     → { ok: true }
 */

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'

const port = Number(process.env.PORT ?? 3000)
const METRICS_FILE = path.join(process.cwd(), '.tw-cache', 'metrics.json')
const MAX_HISTORY = 100

// ─── In-memory metrics store ────────────────────────────────────────────────
const currentMetrics = {
  generatedAt: new Date().toISOString(),
  buildMs: null,
  scanMs: null,
  memoryMb: null,
  classCount: null,
  fileCount: null,
  cssBytes: null,
  mode: 'idle',
}

const history = []
const events = new EventEmitter()

/**
 * Update metrics — dipanggil dari engine atau via file watch
 */
function updateMetrics(data) {
  Object.assign(currentMetrics, data, { generatedAt: new Date().toISOString() })
  history.push({ ...currentMetrics })
  if (history.length > MAX_HISTORY) history.shift()
  events.emit('update', currentMetrics)
}

// ─── Watch metrics file untuk IPC dari engine ───────────────────────────────
function watchMetricsFile() {
  const dir = path.dirname(METRICS_FILE)
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }) } catch {}
  }

  if (fs.existsSync(METRICS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'))
      updateMetrics(data)
    } catch {}
  }

  try {
    fs.watch(METRICS_FILE, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        try {
          const data = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'))
          updateMetrics(data)
        } catch {}
      }
    })
  } catch {
    // File doesn't exist yet — poll instead
    setInterval(() => {
      if (fs.existsSync(METRICS_FILE)) {
        try {
          const data = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'))
          if (data.generatedAt !== currentMetrics.generatedAt) updateMetrics(data)
        } catch {}
      }
    }, 2000)
  }
}

// ─── HTML Dashboard UI ──────────────────────────────────────────────────────
const dashboardHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>tailwind-styled dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
    :root {
      --bg: #0f1117; --surface: #1a1d2e; --border: #2a2d3e;
      --text: #e2e8f0; --muted: #8892a4; --accent: #38bdf8;
      --green: #4ade80; --amber: #fbbf24; --red: #f87171;
      font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    }
    body { background: var(--bg); color: var(--text); min-height: 100vh; padding: 2rem }
    h1 { font-size: 1.1rem; color: var(--muted); font-weight: 400; letter-spacing: 0.1em;
         text-transform: uppercase; margin-bottom: 2rem; border-bottom: 1px solid var(--border);
         padding-bottom: 1rem }
    h1 span { color: var(--accent) }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
            padding: 1.25rem; transition: border-color .2s }
    .card:hover { border-color: var(--accent) }
    .card .label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: .1em;
                   color: var(--muted); margin-bottom: .5rem }
    .card .value { font-size: 1.8rem; font-weight: 700; color: var(--text) }
    .card .value.good { color: var(--green) }
    .card .value.warn { color: var(--amber) }
    .card .value.bad { color: var(--red) }
    .card .unit { font-size: .75rem; color: var(--muted); margin-left: .25rem }
    .section-title { font-size: .75rem; text-transform: uppercase; letter-spacing: .1em;
                     color: var(--muted); margin: 2rem 0 .75rem }
    .raw { background: var(--surface); border: 1px solid var(--border); border-radius: 8px;
           padding: 1rem; font-size: .8rem; overflow-x: auto; white-space: pre; max-height: 300px;
           overflow-y: auto }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green);
                  display: inline-block; margin-right: .5rem; animation: pulse 2s infinite }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    .idle .status-dot { background: var(--muted); animation: none }
    .building .status-dot { background: var(--amber) }
    .error .status-dot { background: var(--red); animation: none }
    #status { font-size: .8rem; color: var(--muted); margin-bottom: 2rem }
    #last-update { font-size: .75rem; color: var(--muted); margin-top: 2rem }
    .history-mini { display: flex; align-items: flex-end; gap: 2px; height: 40px; margin-top: .5rem }
    .history-mini .bar { flex: 1; background: var(--accent); opacity: .4; border-radius: 2px 2px 0 0;
                         min-width: 4px; transition: opacity .2s }
    .history-mini .bar:hover { opacity: 1 }
  </style>
</head>
<body>
  <h1><span class="status-dot" id="dot"></span>tailwind-styled <span>dashboard</span></h1>
  <div id="status">Connecting...</div>

  <div class="grid" id="cards">
    <div class="card"><div class="label">Build time</div><div class="value" id="buildMs">—</div></div>
    <div class="card"><div class="label">Scan time</div><div class="value" id="scanMs">—</div></div>
    <div class="card"><div class="label">Classes</div><div class="value" id="classCount">—</div></div>
    <div class="card"><div class="label">Files</div><div class="value" id="fileCount">—</div></div>
    <div class="card"><div class="label">CSS output</div><div class="value" id="cssBytes">—</div></div>
    <div class="card"><div class="label">Memory (heap)</div><div class="value" id="memoryMb">—</div></div>
  </div>

  <div class="section-title">Build time history</div>
  <div class="card">
    <div class="history-mini" id="history-chart"></div>
  </div>

  <div class="section-title">Raw metrics</div>
  <div class="raw" id="raw-json">Loading...</div>
  <div id="last-update"></div>

  <script>
    const _state = { prevGenAt: null }

    function fmt(v, unit, warn, bad) {
      if (v == null) return '—'
      const el = document.createElement('span')
      el.textContent = typeof v === 'number' ? v.toFixed(unit === 'ms' ? 0 : 1) : v
      if (unit) el.insertAdjacentHTML('beforeend', '<span class="unit">' + unit + '</span>')
      if (bad != null && v > bad) el.className = 'bad'
      else if (warn != null && v > warn) el.className = 'warn'
      else if (v != null) el.className = 'good'
      return el.outerHTML
    }

    function fmtBytes(b) {
      if (b == null) return '—'
      if (b < 1024) return b + '<span class="unit">B</span>'
      if (b < 1024*1024) return (b/1024).toFixed(1) + '<span class="unit">KB</span>'
      return (b/1024/1024).toFixed(2) + '<span class="unit">MB</span>'
    }

    function renderHistory(history) {
      const chart = document.getElementById('history-chart')
      if (!history.length) return
      const vals = history.map(h => h.buildMs ?? 0).filter(v => v > 0)
      if (!vals.length) return
      const max = Math.max(...vals)
      chart.innerHTML = vals.map(v => {
        const h = max > 0 ? Math.max(4, Math.round((v / max) * 40)) : 4
        return '<div class="bar" style="height:' + h + 'px" title="' + v + 'ms"></div>'
      }).join('')
    }

    async function fetchAndRender() {
      try {
        const [mRes, hRes] = await Promise.all([fetch('/metrics'), fetch('/history')])
        const m = await mRes.json()
        const h = await hRes.json()

        if (m.generatedAt === _state.prevGenAt) return
        _state.prevGenAt = m.generatedAt

        document.getElementById('buildMs').innerHTML = fmt(m.buildMs, 'ms', 500, 2000)
        document.getElementById('scanMs').innerHTML = fmt(m.scanMs, 'ms', 200, 1000)
        document.getElementById('classCount').innerHTML = fmt(m.classCount, null, null, null)
        document.getElementById('fileCount').innerHTML = fmt(m.fileCount, null, null, null)
        document.getElementById('cssBytes').innerHTML = fmtBytes(m.cssBytes)
        document.getElementById('memoryMb').innerHTML = fmt(m.memoryMb?.heapUsed, 'MB', 100, 500)
        document.getElementById('raw-json').textContent = JSON.stringify(m, null, 2)
        document.getElementById('last-update').textContent = 'Last update: ' + new Date(m.generatedAt).toLocaleTimeString()
        document.getElementById('status').textContent = 'Mode: ' + (m.mode ?? 'idle')

        const dot = document.getElementById('dot')
        dot.parentElement.className = m.mode ?? 'idle'

        renderHistory(h)
      } catch (e) {
        document.getElementById('status').textContent = 'Error: ' + e.message
      }
    }

    fetchAndRender()
    setInterval(fetchAndRender, 1500)
  </script>
</body>
</html>`

// ─── HTTP server ────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`)

  if (url.pathname === '/health') {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (url.pathname === '/metrics') {
    res.setHeader('content-type', 'application/json')
    res.setHeader('cache-control', 'no-cache')
    res.end(JSON.stringify(currentMetrics, null, 2))
    return
  }

  if (url.pathname === '/history') {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(history))
    return
  }

  if (url.pathname === '/reset' && req.method === 'POST') {
    history.length = 0
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true, message: 'History cleared' }))
    return
  }

  // Default: serve dashboard HTML
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.end(dashboardHtml)
})

// ─── Start ──────────────────────────────────────────────────────────────────
watchMetricsFile()

server.listen(port, () => {
  console.log(`[tailwind-styled] Dashboard: http://localhost:${port}`)
  console.log(`[tailwind-styled] Metrics:   http://localhost:${port}/metrics`)
  console.log(`[tailwind-styled] Watching:  ${METRICS_FILE}`)
})

// Export untuk dipakai sebagai module
export { updateMetrics, currentMetrics, history, events }
