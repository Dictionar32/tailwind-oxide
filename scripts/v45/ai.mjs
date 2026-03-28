#!/usr/bin/env node
/**
 * tw ai "describe" [--provider=anthropic|openai|ollama] — AI component generator (v4.5)
 *
 * Providers:
 *   anthropic (default) — ANTHROPIC_API_KEY env var
 *   openai              — OPENAI_API_KEY env var
 *   ollama              — local Ollama server (no key needed)
 *
 * Usage:
 *   tw ai "primary button with danger variant"
 *   tw ai "card component" --provider=openai
 *   tw ai "nav link" --provider=ollama --model=llama3
 */

const args     = process.argv.slice(2)
const input    = args.filter(a => !a.startsWith('--')).join(' ').trim()
const provider = (args.find(a => a.startsWith('--provider='))?.split('=')[1] ?? 'anthropic').toLowerCase()
const model    = args.find(a => a.startsWith('--model='))?.split('=')[1]

if (!input) {
  console.error('Usage: tw ai "describe component" [--provider=anthropic|openai|ollama] [--model=name]')
  process.exit(1)
}

const SYSTEM_PROMPT = `You are an expert at tailwind-styled-v4. Generate a single production-quality React component.
Rules: use tw.tagname({ base, variants, defaultVariants }) syntax. Real Tailwind v4 classes. 2-3 variants. Export default.
Output ONLY TypeScript code starting with: import { tw } from "tailwind-styled-v4"`

// ─── Provider: Anthropic ──────────────────────────────────────────────────────
async function generateWithAnthropic(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: model ?? 'claude-sonnet-4-20250514', max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Generate a tailwind-styled-v4 component for: ${prompt}` }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? null
}

// ─── Provider: OpenAI ────────────────────────────────────────────────────────
async function generateWithOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model ?? 'gpt-4o-mini',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Generate a tailwind-styled-v4 component for: ${prompt}` },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ─── Provider: Ollama (local) ────────────────────────────────────────────────
async function generateWithOllama(prompt) {
  const ollamaHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434'
  const ollamaModel = model ?? 'llama3'
  const res = await fetch(`${ollamaHost}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      prompt: `${SYSTEM_PROMPT}\n\nGenerate a tailwind-styled-v4 component for: ${prompt}`,
      stream: false,
    }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.response ?? null
}

// ─── Static fallback ─────────────────────────────────────────────────────────
function generateStatic(prompt) {
  const name = prompt.replace(/[^a-zA-Z0-9 ]/g,' ').split(/\s+/).filter(Boolean)
    .slice(0,2).map(w => w[0].toUpperCase()+w.slice(1).toLowerCase()).join('') || 'Generated'
  const cn = `${name}Component`
  const isCard = /card|panel|box/.test(prompt.toLowerCase())
  const isNav  = /nav|link|menu|tab/.test(prompt.toLowerCase())

  if (isCard) return `import { tw } from "tailwind-styled-v4"\n\nconst ${cn} = tw.div({\n  base: "rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden",\n  variants: {\n    padding: { none: "", sm: "p-4", md: "p-6", lg: "p-8" },\n    shadow: { none: "shadow-none", sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg" },\n  },\n  defaultVariants: { padding: "md", shadow: "sm" },\n})\n\nexport default ${cn}\n`
  if (isNav) return `import { tw } from "tailwind-styled-v4"\n\nconst ${cn} = tw.a({\n  base: "inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",\n  variants: {\n    active: {\n      true: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",\n      false: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",\n    },\n  },\n  defaultVariants: { active: "false" },\n})\n\nexport default ${cn}\n`
  return `import { tw } from "tailwind-styled-v4"\n\nconst ${cn} = tw.button({\n  base: "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",\n  variants: {\n    intent: {\n      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",\n      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",\n      ghost: "bg-transparent border border-gray-200 hover:bg-gray-50 focus:ring-gray-200",\n    },\n    size: { sm: "h-8 px-3 text-sm rounded", md: "h-10 px-4 text-base rounded-md", lg: "h-12 px-6 text-lg rounded-lg" },\n  },\n  defaultVariants: { intent: "primary", size: "md" },\n})\n\nexport default ${cn}\n`
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const PROVIDERS = { anthropic: generateWithAnthropic, openai: generateWithOpenAI, ollama: generateWithOllama }
const generateFn = PROVIDERS[provider]

if (!generateFn) {
  process.stderr.write(`[tw ai] Unknown provider: ${provider}. Use: anthropic, openai, ollama\n`)
  process.exit(1)
}

let result = null
try {
  result = await generateFn(input)
  if (result) process.stderr.write(`[tw ai] Generated with ${provider}\n`)
} catch(e) {
  process.stderr.write(`[tw ai] ${provider} unavailable (${e.message})\n`)
  if (provider !== 'anthropic') {
    process.stderr.write(`[tw ai] Trying fallback: anthropic\n`)
    try { result = await generateWithAnthropic(input); if(result) process.stderr.write(`[tw ai] Fallback to anthropic succeeded\n`) }
    catch {}
  }
}

if (!result) {
  result = generateStatic(input)
  process.stderr.write(`[tw ai] Using static template fallback\n`)
}
console.log(result)
