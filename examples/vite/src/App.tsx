/**
 * tailwind-styled-v4 — Vite Example
 *
 * Menunjukkan fitur utama:
 *  1. tw template literal
 *  2. tw object config + variants
 *  3. .extend() inheritance
 *  4. cx() merge utility
 *  5. Live token engine
 */

import { useState } from "react"
import { tw, cx } from "tailwind-styled-v4"

// ── 1. Template literal ─────────────────────────────────────────────────────
const Badge = tw.span`
  inline-flex items-center rounded-full px-2.5 py-0.5
  text-xs font-medium bg-blue-100 text-blue-800
`

// ── 2. Object config dengan variants ────────────────────────────────────────
const Button = tw.button({
  base: "inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  variants: {
    intent: {
      primary:   "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400",
      danger:    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    },
    size: {
      sm: "text-sm px-3 py-1.5",
      md: "text-base px-4 py-2",
      lg: "text-lg px-6 py-3",
    },
  },
  defaultVariants: { intent: "primary", size: "md" },
})

// ── 3. .extend() — turunan dari Button ──────────────────────────────────────
const IconButton = Button.extend`
  aspect-square justify-center rounded-full p-2
`

// ── 4. Card compound layout ──────────────────────────────────────────────────
const Card = tw.div`
  rounded-xl border border-gray-200 bg-white shadow-sm
  transition hover:shadow-md
`
const CardHeader = tw.div`px-6 py-4 border-b border-gray-100`
const CardBody   = tw.div`px-6 py-4`
const CardFooter = tw.div`px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl`

// ── 5. cx() conditional merge ────────────────────────────────────────────────
function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={cx(
        "h-2.5 w-2.5 rounded-full",
        online ? "bg-green-500" : "bg-gray-300"
      )}
    />
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [count, setCount] = useState(0)
  const [online, setOnline] = useState(true)

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            tailwind-styled-v4
          </h1>
          <p className="mt-1 text-gray-500">
            Vite example — template literal, variants, extend, cx
          </p>
        </div>

        {/* Card dengan semua fitur */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Button Variants</h2>
              <Badge>tw.button()</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Button intent="primary">Primary</Button>
              <Button intent="secondary">Secondary</Button>
              <Button intent="danger">Danger</Button>
              <Button intent="primary" size="sm">Small</Button>
              <Button intent="primary" size="lg">Large</Button>
            </div>
          </CardBody>
          <CardFooter>
            <p className="text-sm text-gray-500">
              Object config + variants — pilih kombinasi intent &amp; size
            </p>
          </CardFooter>
        </Card>

        {/* Counter dengan IconButton */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Counter + extend()</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <IconButton intent="secondary" onClick={() => setCount(c => c - 1)}>
                −
              </IconButton>
              <span className="w-12 text-center text-2xl font-bold">{count}</span>
              <IconButton intent="primary" onClick={() => setCount(c => c + 1)}>
                +
              </IconButton>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                IconButton = Button.extend`...`
              </code>
            </p>
          </CardBody>
        </Card>

        {/* cx() demo */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">cx() conditional merge</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              <StatusDot online={online} />
              <span className="text-sm text-gray-700">
                Status: <strong>{online ? "Online" : "Offline"}</strong>
              </span>
              <Button
                intent="secondary"
                size="sm"
                onClick={() => setOnline(v => !v)}
              >
                Toggle
              </Button>
            </div>
          </CardBody>
        </Card>

      </div>
    </main>
  )
}
