import { useState } from "react"
import { tw } from "tailwind-styled-v4"

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

const FeatureCard = tw.div`
  group relative overflow-hidden rounded-2xl border border-gray-200
  bg-white p-6 shadow-sm transition-all duration-200
  hover:-translate-y-1 hover:shadow-lg hover:border-indigo-300
  dark:bg-gray-800 dark:border-gray-700 dark:hover:border-indigo-500
`

const FeatureIcon = tw.div`
  mb-4 inline-flex h-12 w-12 items-center justify-center
  rounded-xl bg-indigo-100 text-lg font-bold text-indigo-700
  dark:bg-indigo-900/50 dark:text-indigo-200
`

const FeatureTitle = tw.h3`
  text-base font-semibold text-gray-900 dark:text-white
`

const FeatureDesc = tw.p`
  mt-1 text-sm text-gray-500 dark:text-gray-400
`

const Code = tw.pre`
  mt-4 rounded-xl bg-gray-900 p-4
  text-sm text-green-400 font-mono overflow-x-auto
  leading-relaxed
`

const features = [
  {
    icon: "RS",
    title: "Rust-powered engine",
    desc: "AST parsing via Oxc with native N-API hooks for fast scans and compilation.",
    tag: "Performance",
  },
  {
    icon: "TW",
    title: "Template literals",
    desc: "Write tw" + ".button`classes` and let the compiler extract classes at build time.",
    tag: "DX",
  },
  {
    icon: "OV",
    title: "Object variants",
    desc: "Use tw" + ".button({ variants: { intent: { primary: '...', danger: '...' } } })",
    tag: "API",
  },
  {
    icon: "EX",
    title: ".extend() inheritance",
    desc: "Compose Button" + ".extend`border-2 border-red-500` without rewriting the base styles.",
    tag: "Composition",
  },
  {
    icon: "RSC",
    title: "RSC-aware",
    desc: "Detect the correct client boundary automatically for Next.js App Router builds.",
    tag: "Next.js",
  },
  {
    icon: "CLI",
    title: "CLI + DevTools",
    desc: "Use the CLI to wire project config quickly and run preflight checks before shipping.",
    tag: "Tooling",
  },
]

const exampleSnippet = [
  'import { tw } from "tailwind-styled-v4"',
  "",
  "const Button = tw" + '.button({',
  '  base: "rounded-lg px-4 py-2 font-medium transition",',
  "  variants: {",
  "    intent: {",
  '      primary:   "bg-blue-600 text-white hover:bg-blue-700",',
  '      secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",',
  "    },",
  "  },",
  '  defaultVariants: { intent: "primary" },',
  "})",
  "",
  "// Usage:",
  '<Button intent="primary">Click me</Button>',
  '<Button intent="secondary">Cancel</Button>',
].join("\n")

export default function App() {
  const [dark, setDark] = useState(false)

  return (
    <div className={dark ? "dark" : ""}>
      <main className="min-h-screen bg-gray-50 transition-colors dark:bg-gray-950">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="mb-12 text-center">
            <Tag>Rust + TypeScript + React</Tag>
            <Heading className="mt-4">tailwind-styled-v4</Heading>
            <Lead>
              A Tailwind compiler for React with a styled-components-like authoring model.
              <br />
              Faster build-time extraction with a small runtime surface.
            </Lead>
            <button
              onClick={() => setDark((value) => !value)}
              className="mt-6 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {dark ? "Light mode" : "Dark mode"}
            </button>
          </div>

          <Code>{exampleSnippet}</Code>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title}>
                <FeatureIcon>{feature.icon}</FeatureIcon>
                <div className="flex items-start justify-between gap-2">
                  <FeatureTitle>{feature.title}</FeatureTitle>
                  <Tag>{feature.tag}</Tag>
                </div>
                <FeatureDesc>{feature.desc}</FeatureDesc>
              </FeatureCard>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
