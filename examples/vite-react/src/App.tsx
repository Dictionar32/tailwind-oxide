/**
 * tailwind-styled-v4 — Vite React Example
 *
 * Menunjukkan fitur:
 *  1. tw template literal dasar
 *  2. Responsive layout dengan Tailwind breakpoints
 *  3. Animation dengan tw + Tailwind animate classes
 *  4. Dark mode toggle
 */

import { useState } from "react"
import { tw } from "tailwind-styled-v4"

// ── Komponen dasar ──────────────────────────────────────────────────────────
const Heading = tw.h1`
  text-3xl font-extrabold tracking-tight
  text-gray-900 dark:text-white
`

const Lead = tw.p`
  mt-2 text-lg text-gray-600 dark:text-gray-300
`

const Tag = tw.span`
  rounded-md bg-indigo-50 px-2 py-1
  text-xs font-semibold text-indigo-700
  ring-1 ring-inset ring-indigo-700/10
`

// ── Feature card ─────────────────────────────────────────────────────────────
const FeatureCard = tw.div`
  group relative overflow-hidden rounded-2xl border border-gray-200
  bg-white p-6 shadow-sm transition-all duration-200
  hover:-translate-y-1 hover:shadow-lg hover:border-indigo-300
  dark:bg-gray-800 dark:border-gray-700 dark:hover:border-indigo-500
`

const FeatureIcon = tw.div`
  mb-4 inline-flex h-12 w-12 items-center justify-center
  rounded-xl bg-indigo-100 text-2xl
  dark:bg-indigo-900/50
`

const FeatureTitle = tw.h3`
  text-base font-semibold text-gray-900 dark:text-white
`

const FeatureDesc = tw.p`
  mt-1 text-sm text-gray-500 dark:text-gray-400
`

// ── Code snippet display ─────────────────────────────────────────────────────
const Code = tw.pre`
  mt-4 rounded-xl bg-gray-900 p-4
  text-sm text-green-400 font-mono overflow-x-auto
  leading-relaxed
`

// ── Data ─────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: "🦀",
    title: "Rust-powered engine",
    desc:  "AST parsing via Oxc, 27 native N-API functions. Scan 1000 files in < 1ms.",
    tag:   "Performance",
  },
  {
    icon: "🧩",
    title: "tw template literal",
    desc:  "Write tw.button`classes` — compiler extracts and hashes classes at build time.",
    tag:   "DX",
  },
  {
    icon: "⚡",
    title: "Object variants",
    desc:  "tw.button({ variants: { intent: { primary: '...', danger: '...' } } })",
    tag:   "API",
  },
  {
    icon: "🔁",
    title: ".extend() inheritance",
    desc:  "DangerButton = Button.extend`border-2 border-red-500` — extend tanpa override.",
    tag:   "Composition",
  },
  {
    icon: "🌐",
    title: "RSC-aware",
    desc:  "Deteksi otomatis 'use client' boundary untuk Next.js App Router.",
    tag:   "Next.js",
  },
  {
    icon: "🛠️",
    title: "CLI + DevTools",
    desc:  "npx tw setup — inject semua config otomatis. tw preflight untuk verifikasi.",
    tag:   "Tooling",
  },
]

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false)

  return (
    <div className={dark ? "dark" : ""}>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
        <div className="mx-auto max-w-5xl px-6 py-16">

          {/* Hero */}
          <div className="mb-12 text-center">
            <Tag>Rust + TypeScript + React</Tag>
            <Heading className="mt-4">tailwind-styled-v4</Heading>
            <Lead>
              Rust-powered compiler untuk Tailwind CSS di React.
              <br />
              Build time 10× lebih cepat, DX seperti styled-components.
            </Lead>
            <button
              onClick={() => setDark(d => !d)}
              className="mt-6 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {dark ? "☀️ Light mode" : "🌙 Dark mode"}
            </button>
          </div>

          {/* Code snippet */}
          <Code>{`import { tw } from "tailwind-styled-v4"

const Button = tw.button({
  base: "rounded-lg px-4 py-2 font-medium transition",
  variants: {
    intent: {
      primary:   "bg-blue-600 text-white hover:bg-blue-700",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    },
  },
  defaultVariants: { intent: "primary" },
})

// Usage:
<Button intent="primary">Click me</Button>
<Button intent="secondary">Cancel</Button>`}</Code>

          {/* Feature grid */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(f => (
              <FeatureCard key={f.title}>
                <FeatureIcon>{f.icon}</FeatureIcon>
                <div className="flex items-start justify-between gap-2">
                  <FeatureTitle>{f.title}</FeatureTitle>
                  <Tag>{f.tag}</Tag>
                </div>
                <FeatureDesc>{f.desc}</FeatureDesc>
              </FeatureCard>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
