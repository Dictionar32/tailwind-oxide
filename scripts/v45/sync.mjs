#!/usr/bin/env node
/**
 * tw sync <init|pull|push|diff>
 * Design token sync helper (DTCG-like JSON).
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const cmd = process.argv[2]
const rawArgs = process.argv.slice(3)
const argMap = new Map(
  rawArgs
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...rest] = a.replace(/^--/, '').split('=')
      return [k, rest.length ? rest.join('=') : 'true']
    })
)

const TOKEN_FILE = path.join(process.cwd(), 'tokens.sync.json')

const DEFAULT_TOKENS = {
  version: 1,
  updatedAt: new Date().toISOString(),
  tokens: {
    color: {
      primary: { $value: '#3b82f6', $type: 'color' },
      secondary: { $value: '#8b5cf6', $type: 'color' },
      danger: { $value: '#ef4444', $type: 'color' },
      success: { $value: '#22c55e', $type: 'color' },
    },
    spacing: {
      xs: { $value: '0.25rem', $type: 'dimension' },
      sm: { $value: '0.5rem', $type: 'dimension' },
      md: { $value: '1rem', $type: 'dimension' },
      lg: { $value: '1.5rem', $type: 'dimension' },
    },
    radius: {
      sm: { $value: '0.25rem', $type: 'dimension' },
      md: { $value: '0.375rem', $type: 'dimension' },
      lg: { $value: '0.5rem', $type: 'dimension' },
      full: { $value: '9999px', $type: 'dimension' },
    },
  },
}

function usage() {
  console.error('Usage: tw sync <init|pull|push|diff>')
  console.error('  tw sync init')
  console.error('  tw sync pull --from=<file.json|https://...|s3://...|figma>')
  console.error('  tw sync push --to=<css|tailwind> [--out=file]')
  console.error('  tw sync push --to-url=https://api.example.com/tokens')
  console.error('  tw sync diff')
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function readCurrentTokens() {
  const data = readJson(TOKEN_FILE)
  return data && typeof data === 'object' ? data : { version: 1, tokens: {} }
}

function writeTokens(payload) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(payload, null, 2) + '\n')
}

function resolveTokenValue(value, allTokens, depth = 0) {
  if (typeof value !== 'string' || depth > 8) return value
  const m = value.match(/^\{([^}]+)\}$/)
  if (!m) return value
  const parts = m[1].split('.')
  let cursor = allTokens
  for (const p of parts) {
    cursor = cursor?.[p]
    if (cursor == null) return value
  }
  const resolved = cursor?.$value ?? cursor
  if (resolved == null) return value
  return resolveTokenValue(String(resolved), allTokens, depth + 1)
}

function tokensToCss(tokens, prefix = '', vars = [], allTokens = tokens) {
  for (const [key, val] of Object.entries(tokens ?? {})) {
    const varName = `--${[prefix, key].filter(Boolean).join('-')}`
    if (val && typeof val === 'object' && '$value' in val) {
      vars.push(`  ${varName}: ${resolveTokenValue(String(val.$value), allTokens)};`)
      continue
    }
    if (val && typeof val === 'object') {
      tokensToCss(val, [prefix, key].filter(Boolean).join('-'), vars, allTokens)
    }
  }
  return vars
}

function tokensToTailwindTheme(tokens) {
  return ['@theme {', ...tokensToCss(tokens), '}'].join('\n')
}

async function pullFromRemote(fromArg) {
  let sourceUrl = fromArg
  if (fromArg.startsWith('s3://')) {
    const endpoint = process.env.AWS_ENDPOINT_URL ?? process.env.TW_S3_ENDPOINT
    if (!endpoint) {
      throw new Error('s3:// requires AWS_ENDPOINT_URL or TW_S3_ENDPOINT')
    }
    const [, rest] = fromArg.split('s3://')
    const [bucket, ...keyParts] = rest.split('/')
    sourceUrl = `${endpoint.replace(/\/$/, '')}/${bucket}/${keyParts.join('/')}`
  }

  process.stderr.write(`[sync] Fetching tokens from ${sourceUrl}...\n`)
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${sourceUrl}`)
  const remoteData = await res.json()

  const existing = readCurrentTokens()
  const merged = {
    ...existing,
    tokens: { ...(existing.tokens ?? {}), ...((remoteData?.tokens ?? remoteData) ?? {}) },
    remoteSource: sourceUrl,
    updatedAt: new Date().toISOString(),
  }
  writeTokens(merged)
  console.log(`[sync] Pulled tokens from ${sourceUrl} -> ${TOKEN_FILE}`)
  console.log(`[sync] Token groups: ${Object.keys(merged.tokens ?? {}).length}`)
}

async function main() {
  if (cmd === 'init') {
    if (fs.existsSync(TOKEN_FILE)) {
      console.log(`tokens.sync.json already exists at ${TOKEN_FILE}`)
      process.exit(0)
    }
    writeTokens(DEFAULT_TOKENS)
    console.log(`Initialized ${TOKEN_FILE}`)
    process.exit(0)
  }

  if (cmd === 'pull') {
    const from = argMap.get('from')
    if (!from || from === 'true') {
      console.error('Usage: tw sync pull --from=<file.json|https://...|s3://...|figma>')
      process.exit(1)
    }

    if (from === 'figma') {
      const figmaScript = new URL('./figma-sync.mjs', import.meta.url)
      const result = spawnSync(process.execPath, [figmaScript.pathname, 'pull', ...process.argv.slice(4)], {
        stdio: 'inherit',
      })
      process.exit(result.status ?? 0)
    }

    if (from.startsWith('http://') || from.startsWith('https://') || from.startsWith('s3://')) {
      try {
        await pullFromRemote(from)
        process.exit(0)
      } catch (e) {
        console.error(`[sync] Pull failed: ${e.message}`)
        process.exit(1)
      }
    }

    const sourcePath = path.resolve(process.cwd(), from)
    if (!fs.existsSync(sourcePath)) {
      console.error(`Source file not found: ${sourcePath}`)
      process.exit(1)
    }

    const incoming = readJson(sourcePath)
    if (!incoming) {
      console.error('Failed to parse source file as JSON')
      process.exit(1)
    }

    const existing = readCurrentTokens()
    const merged = {
      ...existing,
      tokens: { ...(existing.tokens ?? {}), ...((incoming?.tokens ?? incoming) ?? {}) },
      updatedAt: new Date().toISOString(),
    }
    writeTokens(merged)
    console.log(`Pulled tokens from ${from} -> ${TOKEN_FILE}`)
    process.exit(0)
  }

  if (cmd === 'push') {
    if (!fs.existsSync(TOKEN_FILE)) {
      console.error('tokens.sync.json not found. Run `tw sync init` first.')
      process.exit(1)
    }

    const local = readCurrentTokens()
    const toUrl = argMap.get('to-url')
    if (toUrl && toUrl !== 'true') {
      try {
        process.stderr.write(`[sync] Pushing tokens to ${toUrl}...\n`)
        const res = await fetch(toUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(process.env.TW_SYNC_TOKEN ? { authorization: `Bearer ${process.env.TW_SYNC_TOKEN}` } : {}),
          },
          body: JSON.stringify(local),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        console.log(`[sync] Tokens pushed to ${toUrl}`)
        process.exit(0)
      } catch (e) {
        console.error(`[sync] Push failed: ${e.message}`)
        process.exit(1)
      }
    }

    const to = argMap.get('to') ?? 'css'
    const out = argMap.get('out')
    const content = to === 'tailwind'
      ? tokensToTailwindTheme(local.tokens ?? local)
      : `:root {\n${tokensToCss(local.tokens ?? local).join('\n')}\n}`

    if (out && out !== 'true') {
      const outPath = path.resolve(process.cwd(), out)
      fs.writeFileSync(outPath, content + '\n')
      console.log(`Pushed tokens to ${outPath}`)
    } else {
      console.log(content)
    }
    process.exit(0)
  }

  if (cmd === 'diff') {
    if (!fs.existsSync(TOKEN_FILE)) {
      console.error('tokens.sync.json not found. Run `tw sync init` first.')
      process.exit(1)
    }
    const local = readCurrentTokens()
    const vars = tokensToCss(local.tokens ?? local)
    console.log(`tokens.sync.json -> ${vars.length} CSS variables:`)
    console.log(vars.join('\n'))
    process.exit(0)
  }

  if (cmd === 'figma') {
    const sub = process.argv[3]
    if (!sub) {
      console.error('Usage: tw sync figma <pull|push|diff|help>')
      process.exit(1)
    }
    const figmaScript = new URL('./figma-sync.mjs', import.meta.url)
    const result = spawnSync(process.execPath, [figmaScript.pathname, sub, ...process.argv.slice(4)], {
      stdio: 'inherit',
    })
    process.exit(result.status ?? 0)
  }

  usage()
  process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
