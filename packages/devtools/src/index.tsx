/**
 * tailwind-styled-v4 — DevTools v4
 *
 * Panels:
 *   🔍 Inspector  — hover element, see classes + variants
 *   ⚡ State      — list all reactive state components + active states
 *   📦 Container  — list container query components + active breakpoints
 *   🎨 Tokens     — live token editor with instant preview
 *   📊 Analyzer   — duplicate patterns + unused variants (runtime scan)
 *   🔬 Trace      — build timeline, pipeline events, memory profile
 *
 * Keyboard shortcuts:
 *   Ctrl+Shift+D  → toggle devtools
 *   Escape        → close
 *   1-6           → switch panels
 */

"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  formatMemory,
  formatDuration,
  getBuildTimeColor,
  getModeColor,
  getHealthColor,
  getMemoryColor,
  getPipelinePercentages,
  type TraceSnapshot,
  type TraceSummary,
} from "@tailwind-styled/shared"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface InspectedElement {
  componentName: string
  element: HTMLElement
  rect: DOMRect
  twClasses: string[]
  variantProps: Record<string, string>
  atomicMap: Record<string, string>
  rawClassName: string
  stateNames: string[]
  activeStates: Record<string, string>
  containerBps: string[]
}

type Panel = "inspector" | "state" | "container" | "tokens" | "analyzer" | "trace"

interface DevToolsState {
  open: boolean
  panel: Panel
  pinned: boolean
  inspected: InspectedElement | null
  position: { x: number; y: number }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseDataTw(dataTw: string | null): { name: string; classes: string[] } {
  if (!dataTw) return { name: "Unknown", classes: [] }
  const colonIdx = dataTw.indexOf(":")
  if (colonIdx === -1) return { name: dataTw, classes: [] }
  const name = dataTw.slice(0, colonIdx)
  const classes = dataTw
    .slice(colonIdx + 1)
    .split(/\s+/)
    .filter(Boolean)
  return { name, classes }
}

function parseVariantAttr(v: string | null): Record<string, string> {
  if (!v) return {}
  try {
    return JSON.parse(v)
  } catch {
    return {}
  }
}

function findNearestTwElement(el: HTMLElement): HTMLElement | null {
  const cur = { el: el as HTMLElement | null }
  while (cur.el) {
    if (cur.el.dataset?.tw) return cur.el
    cur.el = cur.el.parentElement
  }
  return null
}

function getAtomicMap(classes: string[]): Record<string, string> {
  const registry = window.__TW_REGISTRY__
  if (!registry) return {}
  const map: Record<string, string> = {}
  for (const cls of classes) {
    if (registry[cls]) map[cls] = registry[cls]
  }
  return map
}

function getActiveStates(el: HTMLElement): Record<string, string> {
  const states: Record<string, string> = {}
  for (const attr of el.attributes) {
    if (attr.name.startsWith("data-")) {
      states[attr.name.replace("data-", "")] = attr.value
    }
  }
  return states
}

function getStateNames(el: HTMLElement): string[] {
  const registry = window.__TW_STATE_REGISTRY__ as Map<string, { states: string[] }> | undefined
  if (!registry) return []
  for (const [id, entry] of registry) {
    if (el.classList.contains(id)) return entry.states
  }
  return []
}

function getContainerBps(el: HTMLElement): string[] {
  const registry = window.__TW_CONTAINER_REGISTRY__ as Map<string, { breakpoints: Array<{ minWidth: string }> }> | undefined
  if (!registry) return []
  for (const [id, entry] of registry) {
    if (el.classList.contains(id)) {
      return entry.breakpoints.map((bp) => bp.minWidth)
    }
  }
  return []
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: Inspector
// ─────────────────────────────────────────────────────────────────────────────

function InspectorPanel({
  inspected,
  position: _position,
  pinned: _pinned,
}: {
  inspected: InspectedElement | null
  position: { x: number; y: number }
  pinned: boolean
}) {
  if (!inspected) {
    return React.createElement(
      "div",
      { style: S.emptyPanel },
      React.createElement("span", { style: { opacity: 0.4 } }, "Hover an element to inspect")
    )
  }

  return React.createElement(
    "div",
    { style: S.scrollArea },
    // Variant props
    Object.keys(inspected.variantProps).length > 0 &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement("div", { style: S.sectionTitle }, "Variants"),
        Object.entries(inspected.variantProps).map(([k, v]) =>
          React.createElement(
            "div",
            { key: k, style: S.row },
            React.createElement("span", { style: S.varKey }, k),
            React.createElement("span", { style: S.varValue }, `"${v}"`)
          )
        )
      ),

    // Active states
    Object.keys(inspected.activeStates).length > 0 &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement("div", { style: S.sectionTitle }, "Active Data Attrs"),
        Object.entries(inspected.activeStates).map(([k, v]) =>
          React.createElement(
            "div",
            { key: k, style: S.row },
            React.createElement("code", { style: { ...S.varKey, color: "#f59e0b" } }, `data-${k}`),
            React.createElement("span", { style: { ...S.varValue, color: "#34d399" } }, `"${v}"`)
          )
        )
      ),

    // State names
    inspected.stateNames.length > 0 &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement("div", { style: S.sectionTitle }, "Reactive States"),
        React.createElement(
          "div",
          { style: S.classGrid },
          inspected.stateNames.map((s) =>
            React.createElement(
              "code",
              {
                key: s,
                style: {
                  ...S.classChip,
                  background: inspected.activeStates[s] === "true" ? "#065f46" : "#18181b",
                  borderColor: inspected.activeStates[s] === "true" ? "#34d399" : "#27272a",
                },
              },
              s
            )
          )
        )
      ),

    // Container breakpoints
    inspected.containerBps.length > 0 &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement("div", { style: S.sectionTitle }, "Container Breakpoints"),
        React.createElement(
          "div",
          { style: S.classGrid },
          inspected.containerBps.map((bp) =>
            React.createElement(
              "code",
              { key: bp, style: { ...S.classChip, color: "#818cf8" } },
              bp
            )
          )
        )
      ),

    // Tailwind classes
    inspected.twClasses.length > 0 &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement("div", { style: S.sectionTitle }, "Classes"),
        React.createElement(
          "div",
          { style: S.classGrid },
          inspected.twClasses.map((cls) =>
            React.createElement(
              "code",
              { key: cls, style: S.classChip, title: inspected.atomicMap[cls] },
              cls
            )
          )
        )
      ),

    // Copy
    React.createElement(
      "button",
      {
        style: S.copyBtn,
        onClick: () => {
          navigator.clipboard?.writeText(
            JSON.stringify(
              {
                component: inspected.componentName,
                variants: inspected.variantProps,
                states: inspected.activeStates,
                classes: inspected.twClasses,
              },
              null,
              2
            )
          )
        },
      },
      "Copy to clipboard"
    )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: State Registry
// ─────────────────────────────────────────────────────────────────────────────

function StatePanel() {
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    const refresh = () => {
      const reg = window.__TW_STATE_REGISTRY__
      setEntries(reg ? Array.from(reg.values()) : [])
    }
    refresh()
    const interval = setInterval(refresh, 1000)
    return () => clearInterval(interval)
  }, [])

  if (entries.length === 0) {
    return React.createElement(
      "div",
      { style: S.emptyPanel },
      React.createElement(
        "span",
        { style: { opacity: 0.4 } },
        "No state-enabled components found."
      ),
      React.createElement("br", null),
      React.createElement(
        "span",
        { style: { opacity: 0.3, fontSize: "11px" } },
        'Use tw.button({ state: { active: "..." } }) to register.'
      )
    )
  }

  return React.createElement(
    "div",
    { style: S.scrollArea },
    entries.map((entry) =>
      React.createElement(
        "div",
        { key: entry.id, style: S.section },
        React.createElement(
          "div",
          { style: S.sectionTitle },
          React.createElement("span", { style: { color: "#60a5fa" } }, entry.tag.toUpperCase()),
          React.createElement(
            "span",
            { style: { marginLeft: "8px", color: "#52525b", fontSize: "10px" } },
            entry.id
          )
        ),
        React.createElement(
          "div",
          { style: S.classGrid },
          entry.states.map((s: string) =>
            React.createElement(
              "code",
              { key: s, style: { ...S.classChip, color: "#f59e0b" } },
              `data-${s}`
            )
          )
        ),
        React.createElement(
          "div",
          { style: { ...S.row, marginTop: "4px" } },
          React.createElement(
            "span",
            {
              style: {
                ...S.sectionTitle,
                marginBottom: 0,
                color: entry.cssInjected ? "#34d399" : "#ef4444",
              },
            },
            entry.cssInjected ? "● CSS injected" : "○ CSS pending"
          )
        )
      )
    )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: Container Query Registry
// ─────────────────────────────────────────────────────────────────────────────

function ContainerPanel() {
  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    const refresh = () => {
      const reg = window.__TW_CONTAINER_REGISTRY__
      setEntries(reg ? Array.from(reg.values()) : [])
    }
    refresh()
    const interval = setInterval(refresh, 1000)
    return () => clearInterval(interval)
  }, [])

  if (entries.length === 0) {
    return React.createElement(
      "div",
      { style: S.emptyPanel },
      React.createElement(
        "span",
        { style: { opacity: 0.4 } },
        "No container query components found."
      ),
      React.createElement("br", null),
      React.createElement(
        "span",
        { style: { opacity: 0.3, fontSize: "11px" } },
        'Use tw.div({ container: { md: "flex-row" } }) to register.'
      )
    )
  }

  return React.createElement(
    "div",
    { style: S.scrollArea },
    entries.map((entry) =>
      React.createElement(
        "div",
        { key: entry.id, style: S.section },
        React.createElement(
          "div",
          { style: S.sectionTitle },
          React.createElement("span", { style: { color: "#60a5fa" } }, entry.tag.toUpperCase()),
          entry.containerName &&
            React.createElement(
              "span",
              { style: { marginLeft: "6px", color: "#818cf8" } },
              `[${entry.containerName}]`
            ),
          React.createElement(
            "span",
            { style: { marginLeft: "8px", color: "#52525b", fontSize: "10px" } },
            entry.id
          )
        ),
        React.createElement(
          "div",
          null,
          entry.breakpoints.map((bp: any, i: number) =>
            React.createElement(
              "div",
              { key: i, style: { ...S.row, marginBottom: "2px" } },
              React.createElement(
                "code",
                { style: { color: "#818cf8", fontSize: "11px" } },
                `≥ ${bp.minWidth}`
              ),
              React.createElement(
                "span",
                { style: { color: "#6b7280", fontSize: "11px" } },
                bp.classes
              )
            )
          )
        )
      )
    )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: Live Token Editor
// ─────────────────────────────────────────────────────────────────────────────

function TokensPanel() {
  const [tokens, setTokens_] = useState<Record<string, string>>({})

  useEffect(() => {
    const engine = window.__TW_TOKEN_ENGINE__
    if (!engine) return

    setTokens_(engine.getTokens())
    if (!engine.subscribe) return
    const unsub = engine.subscribe((t: Record<string, string>) => setTokens_({ ...t }))
    return unsub
  }, [])

  const entries = Object.entries(tokens)

  if (entries.length === 0) {
    return React.createElement(
      "div",
      { style: S.emptyPanel },
      React.createElement("span", { style: { opacity: 0.4 } }, "No live tokens registered."),
      React.createElement("br", null),
      React.createElement(
        "span",
        { style: { opacity: 0.3, fontSize: "11px" } },
        'Use liveToken({ primary: "#3b82f6" }) to register tokens.'
      )
    )
  }

  return React.createElement(
    "div",
    { style: S.scrollArea },
    React.createElement(
      "div",
      { style: { ...S.sectionTitle, padding: "8px 12px 4px", color: "#52525b" } },
      "Click color to edit · Changes apply instantly"
    ),
    entries.map(([name, value]) => {
      const isColor = value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")
      return React.createElement(
        "div",
        { key: name, style: { ...S.row, padding: "6px 12px", borderBottom: "1px solid #18181b" } },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px" } },
          isColor &&
            React.createElement("div", {
              style: {
                width: "16px",
                height: "16px",
                borderRadius: "3px",
                background: value,
                border: "1px solid #27272a",
                flexShrink: 0,
              },
            }),
          React.createElement("span", { style: { color: "#a1a1aa", fontSize: "12px" } }, name)
        ),
        isColor
          ? React.createElement("input", {
              type: "color",
              defaultValue: value.startsWith("#") ? value : "#000000",
              style: {
                width: "52px",
                height: "22px",
                border: "none",
                background: "none",
                cursor: "pointer",
              },
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const engine = window.__TW_TOKEN_ENGINE__
                if (engine) engine.setToken(name, e.target.value)
              },
            })
          : React.createElement("input", {
              type: "text",
              defaultValue: value,
              style: {
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "3px",
                color: "#e4e4e7",
                fontSize: "11px",
                padding: "2px 6px",
                width: "100px",
                fontFamily: "monospace",
              },
              onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
                const engine = window.__TW_TOKEN_ENGINE__
                if (engine) engine.setToken(name, e.target.value)
              },
            })
      )
    })
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: Runtime Analyzer
// ─────────────────────────────────────────────────────────────────────────────

function AnalyzerPanel() {
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<{
    duplicates: Array<{ pattern: string; count: number; names: string[] }>
    stateCount: number
    containerCount: number
    tokenCount: number
  } | null>(null)
  // Engine metrics — fetched dari dashboard server (http://localhost:3000/metrics)
  const [engineMetrics, setEngineMetrics] = useState<Record<string, unknown> | null>(null)
  const [metricsFetching, setMetricsFetching] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  const loadEngineMetrics = useCallback(async () => {
    setMetricsFetching(true)
    setMetricsError(null)
    try {
      const res = await fetch("http://localhost:3000/metrics", {
        signal: AbortSignal.timeout(2000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEngineMetrics(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setMetricsError(
        msg.includes("Failed to fetch") || msg.includes("NetworkError")
          ? "Dashboard tidak berjalan. Jalankan: tw dashboard"
          : msg
      )
      setEngineMetrics(null)
    } finally {
      setMetricsFetching(false)
    }
  }, [])

  const runScan = useCallback(() => {
    setScanning(true)

    setTimeout(() => {
      const twEls = document.querySelectorAll("[data-tw]")
      const classMap = new Map<string, string[]>()

      for (const el of twEls) {
        const { name, classes } = (() => {
          const dTw = (el as HTMLElement).dataset.tw ?? null
          if (!dTw) return { name: "?", classes: [] }
          const ci = dTw.indexOf(":")
          return {
            name: ci >= 0 ? dTw.slice(0, ci) : dTw,
            classes:
              ci >= 0
                ? dTw
                    .slice(ci + 1)
                    .split(/\s+/)
                    .filter(Boolean)
                : [],
          }
        })()

        const key = classes.sort().join(" ")
        if (!classMap.has(key)) classMap.set(key, [])
        classMap.get(key)!.push(name)
      }

      const duplicates = Array.from(classMap.entries())
        .filter(([, names]) => names.length > 1)
        .map(([pattern, names]) => ({ pattern, count: names.length, names }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const stateReg = window.__TW_STATE_REGISTRY__
      const containerReg = window.__TW_CONTAINER_REGISTRY__
      const tokenEngine = window.__TW_TOKEN_ENGINE__

      setResults({
        duplicates,
        stateCount: stateReg?.size ?? 0,
        containerCount: containerReg?.size ?? 0,
        tokenCount: Object.keys(tokenEngine?.getTokens?.() ?? {}).length,
      })
      setScanning(false)
    }, 100)
  }, [])

  return React.createElement(
    "div",
    { style: S.scrollArea },
    React.createElement(
      "div",
      { style: { padding: "10px 12px" } },

      // ── DOM Scan ──────────────────────────────────────────────────────────
      React.createElement(
        "button",
        {
          style: { ...S.copyBtn, borderTop: "none", color: "#60a5fa", fontWeight: "600" },
          onClick: runScan,
          disabled: scanning,
        },
        scanning ? "Scanning DOM..." : "▶ Run DOM Scan"
      ),

      // ── Engine Metrics (dari dashboard) ───────────────────────────────────
      React.createElement(
        "div",
        { style: { ...S.section, marginTop: "8px" } },
        React.createElement(
          "div",
          { style: { ...S.sectionTitle, marginBottom: "6px" } },
          "⚡ Engine Metrics"
        ),
        engineMetrics
          ? React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { style: S.row },
                React.createElement("span", { style: S.varKey }, "Build"),
                React.createElement(
                  "span",
                  { style: { ...S.varValue, color: "#34d399" } },
                  engineMetrics.buildMs !== null ? `${engineMetrics.buildMs}ms` : "—"
                )
              ),
              React.createElement(
                "div",
                { style: S.row },
                React.createElement("span", { style: S.varKey }, "Classes"),
                React.createElement(
                  "span",
                  { style: { ...S.varValue, color: "#34d399" } },
                  String(engineMetrics.classCount ?? "—")
                )
              ),
              React.createElement(
                "div",
                { style: S.row },
                React.createElement("span", { style: S.varKey }, "Files"),
                React.createElement(
                  "span",
                  { style: { ...S.varValue, color: "#34d399" } },
                  String(engineMetrics.fileCount ?? "—")
                )
              ),
              React.createElement(
                "div",
                { style: S.row },
                React.createElement("span", { style: S.varKey }, "Mode"),
                React.createElement(
                  "span",
                  { style: { color: "#a1a1aa", fontSize: "11px" } },
                  String(engineMetrics.mode ?? "—")
                )
              ),
              React.createElement(
                "button",
                {
                  style: {
                    ...S.copyBtn,
                    borderTop: "none",
                    color: "#52525b",
                    fontSize: "10px",
                    padding: "4px 0",
                  },
                  onClick: loadEngineMetrics,
                  disabled: metricsFetching,
                },
                "↻ Refresh"
              )
            )
          : metricsError
            ? React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  { style: { color: "#f87171", fontSize: "11px", marginBottom: "6px" } },
                  metricsError
                ),
                React.createElement(
                  "button",
                  {
                    style: { ...S.copyBtn, borderTop: "none", color: "#34d399", fontWeight: "600" },
                    onClick: loadEngineMetrics,
                    disabled: metricsFetching,
                  },
                  metricsFetching ? "Connecting..." : "↻ Retry"
                )
              )
            : React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  {
                    style: {
                      color: "#71717a",
                      fontSize: "11px",
                      lineHeight: 1.6,
                      marginBottom: "6px",
                    },
                  },
                  "Rust analyzer hanya tersedia via CLI atau dashboard.",
                  React.createElement("br", null),
                  React.createElement(
                    "code",
                    { style: { color: "#52525b", fontSize: "10px" } },
                    "tw analyze . | tw dashboard"
                  )
                ),
                React.createElement(
                  "button",
                  {
                    style: { ...S.copyBtn, borderTop: "none", color: "#34d399", fontWeight: "600" },
                    onClick: loadEngineMetrics,
                    disabled: metricsFetching,
                  },
                  metricsFetching ? "Connecting..." : "⚡ Load from Dashboard"
                )
              )
      ),

      // ── DOM Scan Results ──────────────────────────────────────────────────
      results &&
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            { style: S.section },
            React.createElement("div", { style: S.sectionTitle }, "Summary"),
            React.createElement(
              "div",
              { style: S.row },
              React.createElement("span", { style: S.varKey }, "State components"),
              React.createElement("span", { style: S.varValue }, String(results.stateCount))
            ),
            React.createElement(
              "div",
              { style: S.row },
              React.createElement("span", { style: S.varKey }, "Container components"),
              React.createElement("span", { style: S.varValue }, String(results.containerCount))
            ),
            React.createElement(
              "div",
              { style: S.row },
              React.createElement("span", { style: S.varKey }, "Live tokens"),
              React.createElement("span", { style: S.varValue }, String(results.tokenCount))
            )
          ),

          results.duplicates.length > 0
            ? React.createElement(
                "div",
                { style: S.section },
                React.createElement("div", { style: S.sectionTitle }, "Duplicate Class Sets"),
                results.duplicates.map((d, i) =>
                  React.createElement(
                    "div",
                    { key: i, style: { marginBottom: "8px" } },
                    React.createElement(
                      "div",
                      { style: { color: "#f59e0b", fontSize: "11px", marginBottom: "2px" } },
                      d.names.join(", ")
                    ),
                    React.createElement(
                      "code",
                      {
                        style: {
                          color: "#52525b",
                          fontSize: "10px",
                          wordBreak: "break-all" as const,
                        },
                      },
                      d.pattern.split(" ").slice(0, 8).join(" ") +
                        (d.pattern.split(" ").length > 8 ? "..." : "")
                    )
                  )
                )
              )
            : React.createElement(
                "div",
                { style: S.section },
                React.createElement(
                  "span",
                  { style: { color: "#34d399", fontSize: "12px" } },
                  "✓ No duplicate class sets in current DOM"
                )
              )
        )
    )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel: Trace — build timeline, pipeline events, memory profile
// ─────────────────────────────────────────────────────────────────────────────

const DASHBOARD_BASE = "http://localhost:3000"

function TracePanel() {
  const [metrics, setMetrics] = useState<TraceSnapshot | null>(null)
  const [history, setHistory] = useState<TraceSnapshot[]>([])
  const [summary, setSummary] = useState<TraceSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAll = useCallback(async () => {
    setFetching(true)
    setError(null)
    try {
      const [mRes, hRes, sRes] = await Promise.all([
        fetch(`${DASHBOARD_BASE}/metrics`, { signal: AbortSignal.timeout(2000) }),
        fetch(`${DASHBOARD_BASE}/history`, { signal: AbortSignal.timeout(2000) }),
        fetch(`${DASHBOARD_BASE}/summary`, { signal: AbortSignal.timeout(2000) }),
      ])
      if (!mRes.ok) throw new Error(`metrics: HTTP ${mRes.status}`)
      if (!hRes.ok) throw new Error(`history: HTTP ${hRes.status}`)
      if (!sRes.ok) throw new Error(`summary: HTTP ${sRes.status}`)

      const m = await mRes.json()
      const h = await hRes.json()
      const s = await sRes.json()

      setMetrics(m)
      setHistory(Array.isArray(h) ? h : [])
      setSummary(s)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(
        msg.includes("Failed to fetch") || msg.includes("NetworkError")
          ? "Dashboard tidak berjalan. Jalankan: tw dashboard"
          : msg
      )
    } finally {
      setFetching(false)
    }
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      fetchAll()
      intervalRef.current = setInterval(fetchAll, 3000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, fetchAll])

  // Render bar chart for build time history
  const renderHistoryChart = () => {
    const vals = history.map((h) => h.buildMs ?? 0).filter((v) => v > 0)
    if (vals.length === 0) {
      return React.createElement(
        "div",
        {
          style: {
            color: "#52525b",
            fontSize: "11px",
            textAlign: "center" as const,
            padding: "12px",
          },
        },
        "No build history available"
      )
    }
    const max = Math.max(...vals)
    const chartWidth = 296
    const barWidth = Math.max(3, Math.floor(chartWidth / vals.length) - 1)

    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-end" as const,
          gap: "1px",
          height: "60px",
          padding: "0 2px",
        },
      },
      vals.map((v, i) => {
        const h = max > 0 ? Math.max(3, Math.round((v / max) * 56)) : 3
        return React.createElement("div", {
          key: i,
          style: {
            width: `${barWidth}px`,
            height: `${h}px`,
            background: getBuildTimeColor(v),
            borderRadius: "2px 2px 0 0",
            opacity: i === vals.length - 1 ? 1 : 0.5,
            flexShrink: 0,
          },
          title: `${v}ms`,
        })
      })
    )
  }

  // Render pipeline breakdown bar
  const renderPipelineBar = () => {
    if (!metrics) return null
    const { scanPct, analyzePct, compilePct } = getPipelinePercentages(metrics)
    const scan = metrics.scanMs ?? 0
    const analyze = metrics.analyzeMs ?? 0
    const compile = metrics.compileMs ?? 0

    if (scanPct === 0 && analyzePct === 0 && compilePct === 0) return null

    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { ...S.sectionTitle, marginBottom: "6px" } },
        "Pipeline Breakdown"
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            height: "12px",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "6px",
          },
        },
        scanPct > 0 &&
          React.createElement("div", {
            style: { width: `${scanPct}%`, background: "#60a5fa", minWidth: "2px" },
            title: `Scan: ${scan}ms`,
          }),
        analyzePct > 0 &&
          React.createElement("div", {
            style: { width: `${analyzePct}%`, background: "#818cf8", minWidth: "2px" },
            title: `Analyze: ${analyze}ms`,
          }),
        compilePct > 0 &&
          React.createElement("div", {
            style: { width: `${compilePct}%`, background: "#34d399", minWidth: "2px" },
            title: `Compile: ${compile}ms`,
          })
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: "12px", fontSize: "10px" } },
        React.createElement("span", { style: { color: "#60a5fa" } }, `Scan ${scan}ms`),
        React.createElement("span", { style: { color: "#818cf8" } }, `Analyze ${analyze}ms`),
        React.createElement("span", { style: { color: "#34d399" } }, `Compile ${compile}ms`)
      )
    )
  }

  // Error state
  if (error && !metrics) {
    return React.createElement(
      "div",
      { style: S.scrollArea },
      React.createElement(
        "div",
        { style: { padding: "12px" } },
        React.createElement(
          "div",
          { style: { color: "#f87171", fontSize: "11px", marginBottom: "8px" } },
          error
        ),
        React.createElement(
          "button",
          {
            style: { ...S.copyBtn, borderTop: "none", color: "#34d399", fontWeight: "600" },
            onClick: fetchAll,
            disabled: fetching,
          },
          fetching ? "Connecting..." : "⚡ Load from Dashboard"
        )
      )
    )
  }

  // Initial load state
  if (!metrics) {
    return React.createElement(
      "div",
      { style: S.scrollArea },
      React.createElement(
        "div",
        { style: { padding: "12px" } },
        React.createElement(
          "div",
          {
            style: {
              color: "#71717a",
              fontSize: "11px",
              lineHeight: 1.6,
              marginBottom: "8px",
            },
          },
          "Build timeline dan pipeline events dari engine.",
          React.createElement("br", null),
          React.createElement(
            "code",
            { style: { color: "#52525b", fontSize: "10px" } },
            "tw dashboard"
          )
        ),
        React.createElement(
          "button",
          {
            style: { ...S.copyBtn, borderTop: "none", color: "#34d399", fontWeight: "600" },
            onClick: fetchAll,
            disabled: fetching,
          },
          fetching ? "Connecting..." : "⚡ Load from Dashboard"
        )
      )
    )
  }

  return React.createElement(
    "div",
    { style: S.scrollArea },

    // ── Mode & Health ────────────────────────────────────────────────────
    React.createElement(
      "div",
      { style: { padding: "10px 12px 6px" } },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px" } },
          React.createElement("div", {
            style: {
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: getModeColor(metrics.mode),
              boxShadow: `0 0 6px ${getModeColor(metrics.mode)}`,
            },
          }),
          React.createElement(
            "span",
            {
              style: {
                color: getModeColor(metrics.mode),
                fontWeight: "600",
                fontSize: "12px",
                textTransform: "uppercase" as const,
              },
            },
            metrics.mode ?? "unknown"
          )
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: "4px" } },
          React.createElement(
            "button",
            {
              style: {
                background: autoRefresh ? "#1e3a5f" : "none",
                border: `1px solid ${autoRefresh ? "#3b82f6" : "#27272a"}`,
                borderRadius: "4px",
                color: autoRefresh ? "#60a5fa" : "#52525b",
                cursor: "pointer",
                fontSize: "10px",
                padding: "2px 6px",
                fontFamily: "inherit",
                pointerEvents: "all" as const,
              },
              onClick: () => setAutoRefresh(!autoRefresh),
              title: autoRefresh ? "Stop auto-refresh" : "Auto-refresh every 3s",
            },
            autoRefresh ? "● Live" : "○ Live"
          ),
          React.createElement(
            "button",
            {
              style: {
                background: "none",
                border: "1px solid #27272a",
                borderRadius: "4px",
                color: "#52525b",
                cursor: "pointer",
                fontSize: "10px",
                padding: "2px 6px",
                fontFamily: "inherit",
                pointerEvents: "all" as const,
              },
              onClick: fetchAll,
              disabled: fetching,
              title: "Refresh now",
            },
            "↻"
          )
        )
      )
    ),

    // ── Health Status ────────────────────────────────────────────────────
    summary &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement("div", { style: { ...S.sectionTitle, marginBottom: "6px" } }, "Health"),
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "Status"),
          React.createElement(
            "span",
            { style: { color: getHealthColor(summary.health?.status), fontWeight: "600" } },
            summary.health?.status ?? "unknown"
          )
        ),
        summary.health?.issues &&
          summary.health.issues.length > 0 &&
          React.createElement(
            "div",
            { style: { marginTop: "4px" } },
            summary.health.issues.map((issue, i) =>
              React.createElement(
                "div",
                {
                  key: i,
                  style: {
                    fontSize: "10px",
                    color:
                      issue.severity === "high"
                        ? "#f87171"
                        : issue.severity === "medium"
                          ? "#fbbf24"
                          : "#71717a",
                    marginBottom: "2px",
                  },
                },
                `• ${issue.message}`
              )
            )
          )
      ),

    // ── Build Metrics ────────────────────────────────────────────────────
    React.createElement(
      "div",
      { style: S.section },
      React.createElement(
        "div",
        { style: { ...S.sectionTitle, marginBottom: "6px" } },
        "Build Metrics"
      ),
      React.createElement(
        "div",
        { style: S.row },
        React.createElement("span", { style: S.varKey }, "Build"),
        React.createElement(
          "span",
          {
            style: {
              ...S.varValue,
              color: getBuildTimeColor(metrics.buildMs),
            },
          },
          metrics.buildMs !== null ? `${metrics.buildMs}ms` : "—"
        )
      ),
      React.createElement(
        "div",
        { style: S.row },
        React.createElement("span", { style: S.varKey }, "Classes"),
        React.createElement("span", { style: S.varValue }, String(metrics.classCount ?? "—"))
      ),
      React.createElement(
        "div",
        { style: S.row },
        React.createElement("span", { style: S.varKey }, "Files"),
        React.createElement("span", { style: S.varValue }, String(metrics.fileCount ?? "—"))
      ),
      metrics.cssBytes !== null &&
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "CSS"),
          React.createElement(
            "span",
            { style: { ...S.varValue, color: "#818cf8" } },
            formatMemory(metrics.cssBytes)
          )
        )
    ),

    // ── Pipeline Breakdown ───────────────────────────────────────────────
    React.createElement("div", { style: S.section }, renderPipelineBar()),

    // ── Pipeline Events ──────────────────────────────────────────────────
    (metrics.eventsReceived !== undefined || metrics.batchesProcessed !== undefined) &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement(
          "div",
          { style: { ...S.sectionTitle, marginBottom: "6px" } },
          "Pipeline Events"
        ),
        metrics.eventsReceived !== undefined &&
          React.createElement(
            "div",
            { style: S.row },
            React.createElement("span", { style: S.varKey }, "Events received"),
            React.createElement(
              "span",
              { style: { color: "#a1a1aa", fontSize: "11px" } },
              String(metrics.eventsReceived)
            )
          ),
        metrics.eventsProcessed !== undefined &&
          React.createElement(
            "div",
            { style: S.row },
            React.createElement("span", { style: S.varKey }, "Events processed"),
            React.createElement(
              "span",
              { style: { color: "#a1a1aa", fontSize: "11px" } },
              String(metrics.eventsProcessed)
            )
          ),
        metrics.batchesProcessed !== undefined &&
          React.createElement(
            "div",
            { style: S.row },
            React.createElement("span", { style: S.varKey }, "Batches"),
            React.createElement(
              "span",
              { style: { color: "#a1a1aa", fontSize: "11px" } },
              String(metrics.batchesProcessed)
            )
          ),
        metrics.incrementalUpdates !== undefined &&
          React.createElement(
            "div",
            { style: S.row },
            React.createElement("span", { style: S.varKey }, "Incremental"),
            React.createElement(
              "span",
              { style: { color: "#34d399", fontSize: "11px" } },
              String(metrics.incrementalUpdates)
            )
          ),
        metrics.fullRescans !== undefined &&
          React.createElement(
            "div",
            { style: S.row },
            React.createElement("span", { style: S.varKey }, "Full rescans"),
            React.createElement(
              "span",
              { style: { color: "#fbbf24", fontSize: "11px" } },
              String(metrics.fullRescans)
            )
          )
      ),

    // ── Memory ───────────────────────────────────────────────────────────
    metrics.memoryMb &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement("div", { style: { ...S.sectionTitle, marginBottom: "6px" } }, "Memory"),
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "Heap used"),
          React.createElement(
            "span",
            {
              style: {
                color: getMemoryColor(metrics.memoryMb.heapUsed),
                fontWeight: "600",
              },
            },
            `${metrics.memoryMb.heapUsed.toFixed(1)}MB`
          )
        ),
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "Heap total"),
          React.createElement(
            "span",
            { style: { color: "#a1a1aa", fontSize: "11px" } },
            `${metrics.memoryMb.heapTotal.toFixed(1)}MB`
          )
        ),
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "RSS"),
          React.createElement(
            "span",
            { style: { color: "#a1a1aa", fontSize: "11px" } },
            `${metrics.memoryMb.rss.toFixed(1)}MB`
          )
        )
      ),

    // ── Workspace Summary ────────────────────────────────────────────────
    summary &&
      React.createElement(
        "div",
        { style: S.section },
        React.createElement(
          "div",
          { style: { ...S.sectionTitle, marginBottom: "6px" } },
          "Workspace"
        ),
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "Packages"),
          React.createElement(
            "span",
            { style: { color: "#a1a1aa", fontSize: "11px" } },
            String(summary.workspace?.totalPackages ?? "—")
          )
        ),
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "Files"),
          React.createElement(
            "span",
            { style: { color: "#a1a1aa", fontSize: "11px" } },
            String(summary.workspace?.totalFiles ?? "—")
          )
        ),
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "Classes"),
          React.createElement(
            "span",
            { style: { color: "#a1a1aa", fontSize: "11px" } },
            String(summary.workspace?.totalClasses ?? "—")
          )
        ),
        React.createElement(
          "div",
          { style: S.row },
          React.createElement("span", { style: S.varKey }, "Cache hit rate"),
          React.createElement(
            "span",
            {
              style: {
                color: (summary.cache?.hitRate ?? 0) > 0.8 ? "#34d399" : "#fbbf24",
                fontSize: "11px",
              },
            },
            summary.cache ? `${(summary.cache.hitRate * 100).toFixed(0)}%` : "—"
          )
        )
      ),

    // ── Build Time History ───────────────────────────────────────────────
    React.createElement(
      "div",
      { style: S.section },
      React.createElement(
        "div",
        { style: { ...S.sectionTitle, marginBottom: "6px" } },
        `Build History (${history.length} snapshots)`
      ),
      renderHistoryChart()
    ),

    // ── Timestamp ────────────────────────────────────────────────────────
    metrics.generatedAt &&
      React.createElement(
        "div",
        {
          style: {
            padding: "6px 12px",
            color: "#3f3f46",
            fontSize: "10px",
            textAlign: "center" as const,
          },
        },
        `Last update: ${new Date(metrics.generatedAt).toLocaleTimeString()}`
      )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main DevTools component
// ─────────────────────────────────────────────────────────────────────────────

export function TwDevTools(): React.ReactElement | null {
  if (process.env.NODE_ENV === "production") return null

  const [state, setState] = useState<DevToolsState>({
    open: false,
    panel: "inspector",
    pinned: false,
    inspected: null,
    position: { x: 0, y: 0 },
  })

  const overlayRef = useRef<HTMLDivElement>(null)
  const isInspecting = state.open && state.panel === "inspector"

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault()
        setState((s) => ({ ...s, open: !s.open, inspected: null }))
      }
      if (e.key === "Escape")
        setState((s) => ({ ...s, open: false, pinned: false, inspected: null }))
      if (e.key === "1") setState((s) => (s.open ? { ...s, panel: "inspector" } : s))
      if (e.key === "2") setState((s) => (s.open ? { ...s, panel: "state" } : s))
      if (e.key === "3") setState((s) => (s.open ? { ...s, panel: "container" } : s))
      if (e.key === "4") setState((s) => (s.open ? { ...s, panel: "tokens" } : s))
      if (e.key === "5") setState((s) => (s.open ? { ...s, panel: "analyzer" } : s))
      if (e.key === "6") setState((s) => (s.open ? { ...s, panel: "trace" } : s))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Mouse move — only active on inspector panel
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isInspecting || state.pinned) return
      const twEl = findNearestTwElement(e.target as HTMLElement)
      if (!twEl) {
        setState((s) => ({ ...s, inspected: null, position: { x: e.clientX, y: e.clientY } }))
        return
      }
      const { name, classes } = parseDataTw(twEl.dataset.tw ?? null)
      setState((s) => ({
        ...s,
        position: { x: e.clientX, y: e.clientY },
        inspected: {
          componentName: name,
          element: twEl,
          rect: twEl.getBoundingClientRect(),
          twClasses: classes,
          variantProps: parseVariantAttr(twEl.dataset.twVariants ?? null),
          atomicMap: getAtomicMap(classes),
          rawClassName: twEl.className,
          stateNames: getStateNames(twEl),
          activeStates: getActiveStates(twEl),
          containerBps: getContainerBps(twEl),
        },
      }))
    },
    [isInspecting, state.pinned]
  )

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!isInspecting) return
      if (overlayRef.current?.contains(e.target as HTMLElement)) return
      setState((s) => ({ ...s, pinned: !s.pinned && !!s.inspected }))
    },
    [isInspecting]
  )

  useEffect(() => {
    if (!isInspecting) return
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("click", onClick)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("click", onClick)
    }
  }, [isInspecting, onMouseMove, onClick])

  // Toggle button
  if (!state.open) {
    return React.createElement(
      "button",
      {
        onClick: () => setState((s) => ({ ...s, open: true })),
        style: S.toggleBtn,
        title: "tailwind-styled-v4 DevTools (Ctrl+Shift+D)",
      },
      "🎨"
    )
  }

  const PANELS: Array<{ id: Panel; label: string; icon: string }> = [
    { id: "inspector", label: "Inspector", icon: "🔍" },
    { id: "state", label: "State", icon: "⚡" },
    { id: "container", label: "Container", icon: "📦" },
    { id: "tokens", label: "Tokens", icon: "🎨" },
    { id: "analyzer", label: "Analyzer", icon: "📊" },
    { id: "trace", label: "Trace", icon: "🔬" },
  ]

  return React.createElement(
    "div",
    { style: S.root },

    // ── Element highlight (inspector only) ──────────────────────────────
    isInspecting &&
      state.inspected &&
      React.createElement("div", {
        style: {
          ...S.highlight,
          top: state.inspected.rect.top + window.scrollY,
          left: state.inspected.rect.left + window.scrollX,
          width: state.inspected.rect.width,
          height: state.inspected.rect.height,
        },
      }),

    // ── Component name label ────────────────────────────────────────────
    isInspecting &&
      state.inspected &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute" as const,
            top: state.inspected.rect.top + window.scrollY - 22,
            left: state.inspected.rect.left + window.scrollX,
            background: "#1e3a5f",
            color: "#93c5fd",
            fontSize: "11px",
            padding: "2px 6px",
            borderRadius: "3px 3px 0 0",
            pointerEvents: "none" as const,
            zIndex: 2147483646,
            fontFamily: "monospace",
          },
        },
        state.inspected.componentName
      ),

    // ── Main DevTools panel ─────────────────────────────────────────────
    React.createElement(
      "div",
      {
        ref: overlayRef,
        style:
          state.panel === "inspector" && state.inspected
            ? {
                ...S.panel,
                top: Math.min(state.position.y + 16, window.innerHeight - 460),
                left: Math.min(state.position.x + 16, window.innerWidth - 320),
              }
            : {
                ...S.panel,
                top: "auto",
                bottom: "40px",
                right: "12px",
                left: "auto",
              },
      },

      // Header
      React.createElement(
        "div",
        { style: S.header },
        React.createElement(
          "span",
          { style: S.componentName },
          state.inspected && state.panel === "inspector"
            ? state.inspected.componentName
            : "tailwind-styled-v4"
        ),
        React.createElement(
          "div",
          { style: S.headerActions },
          state.pinned && React.createElement("span", { style: S.pinBadge }, "📌"),
          React.createElement(
            "button",
            {
              style: S.closeBtn,
              onClick: () =>
                setState((s) => ({ ...s, open: false, pinned: false, inspected: null })),
            },
            "✕"
          )
        )
      ),

      // Tab bar
      React.createElement(
        "div",
        { style: S.tabBar },
        PANELS.map((p) =>
          React.createElement(
            "button",
            {
              key: p.id,
              style: {
                ...S.tab,
                background: state.panel === p.id ? "#18181b" : "none",
                color: state.panel === p.id ? "#e4e4e7" : "#52525b",
                borderBottom: state.panel === p.id ? "2px solid #3b82f6" : "2px solid transparent",
              },
              onClick: () => setState((s) => ({ ...s, panel: p.id })),
              title: `${p.label} (${PANELS.findIndex((x) => x.id === p.id) + 1})`,
            },
            `${p.icon} ${p.label}`
          )
        )
      ),

      // Panel content
      state.panel === "inspector" &&
        React.createElement(InspectorPanel, {
          inspected: state.inspected,
          position: state.position,
          pinned: state.pinned,
        }),
      state.panel === "state" && React.createElement(StatePanel, null),
      state.panel === "container" && React.createElement(ContainerPanel, null),
      state.panel === "tokens" && React.createElement(TokensPanel, null),
      state.panel === "analyzer" && React.createElement(AnalyzerPanel, null),
      state.panel === "trace" && React.createElement(TracePanel, null)
    ),

    // ── Status bar ──────────────────────────────────────────────────────
    React.createElement(
      "div",
      { style: S.statusBar },
      React.createElement("span", null, "🎨 tailwind-styled-v4 DevTools"),
      React.createElement(
        "span",
        { style: { opacity: 0.6, fontSize: "10px" } },
        state.pinned
          ? "Click to unpin"
          : isInspecting
            ? "Hover to inspect · Click to pin · 1-6 switch panel · Esc close"
            : "Ctrl+Shift+D close · 1-6 switch panel"
      )
    )
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  root: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 2147483647,
    pointerEvents: "none" as const,
    fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
    fontSize: "12px",
  },
  highlight: {
    position: "absolute" as const,
    borderRadius: "3px",
    outline: "2px solid #3b82f6",
    outlineOffset: "1px",
    background: "rgba(59,130,246,0.08)",
    pointerEvents: "none" as const,
    transition: "all 0.1s ease",
    zIndex: 2147483646,
  },
  panel: {
    position: "fixed" as const,
    width: 320,
    maxHeight: 480,
    background: "#0f0f0f",
    border: "1px solid #27272a",
    borderRadius: "10px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
    pointerEvents: "all" as const,
    zIndex: 2147483647,
    userSelect: "text" as const,
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px 6px",
    borderBottom: "1px solid #1f1f1f",
    flexShrink: 0,
  },
  tabBar: {
    display: "flex",
    borderBottom: "1px solid #18181b",
    flexShrink: 0,
    overflowX: "auto" as const,
  },
  tab: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "10px",
    padding: "5px 8px",
    whiteSpace: "nowrap" as const,
    fontFamily: "inherit",
    transition: "color 0.1s",
    pointerEvents: "all" as const,
  },
  scrollArea: {
    overflowY: "auto" as const,
    flex: 1,
  },
  emptyPanel: {
    padding: "24px 12px",
    color: "#71717a",
    fontSize: "12px",
    textAlign: "center" as const,
    lineHeight: 1.6,
  },
  componentName: {
    color: "#60a5fa",
    fontWeight: "bold" as const,
    fontSize: "13px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  pinBadge: { color: "#fbbf24", fontSize: "10px" },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#71717a",
    cursor: "pointer",
    fontSize: "14px",
    lineHeight: 1,
    padding: "2px 4px",
    pointerEvents: "all" as const,
  },
  section: {
    padding: "8px 12px",
    borderBottom: "1px solid #18181b",
  },
  sectionTitle: {
    color: "#52525b",
    fontSize: "10px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: "6px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "3px",
  },
  varKey: { color: "#a1a1aa" },
  varValue: { color: "#34d399", fontWeight: "bold" as const },
  classGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
  },
  classChip: {
    background: "#18181b",
    border: "1px solid #27272a",
    borderRadius: "4px",
    padding: "2px 6px",
    color: "#e4e4e7",
    cursor: "default",
    fontSize: "11px",
  },
  copyBtn: {
    display: "block",
    width: "100%",
    background: "none",
    border: "none",
    borderTop: "1px solid #18181b",
    color: "#52525b",
    cursor: "pointer",
    padding: "8px 12px",
    textAlign: "left" as const,
    fontSize: "11px",
    pointerEvents: "all" as const,
    fontFamily: "inherit",
  },
  statusBar: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: "#1e3a5f",
    color: "#93c5fd",
    fontSize: "11px",
    padding: "4px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "all" as const,
    zIndex: 2147483647,
  },
  toggleBtn: {
    position: "fixed" as const,
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#1e3a5f",
    border: "1px solid #3b82f6",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2147483647,
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    pointerEvents: "all" as const,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function DevToolsProvider(): React.ReactElement | null {
  if (process.env.NODE_ENV === "production") return null
  return React.createElement(TwDevTools)
}

// Export shared trace utilities for reuse across CLI, dashboard, and devtools
export type { TraceSnapshot, TraceSummary } from "@tailwind-styled/shared"
export {
  getHealthColor,
  getModeColor,
  formatMemory,
  formatDuration,
  getBuildTimeColor,
  getMemoryColor,
  getPipelinePercentages,
}
