#!/usr/bin/env node
/**
 * tw sync figma multi — Multi-mode & branch support (Sprint 7)
 *
 * Extends figma-sync.mjs dengan:
 *   - Multiple Figma files (--file=key1,key2)
 *   - Branch support (--branch=main)
 *   - Mode selection (--mode=dark|light|compact)
 *   - Diff antara branches (--diff --from=branch-a --to=branch-b)
 *
 * Usage:
 *   node scripts/v45/figma-multi.mjs pull --file=KEY1,KEY2 --mode=dark
 *   node scripts/v45/figma-multi.mjs diff --from=main --to=feature/dark-mode
 *   node scripts/v45/figma-multi.mjs modes         # list available modes
 */

import fs from 'node:fs'
import path from 'node:path'

const cmd       = process.argv[2]
const fileArg   = process.argv.find(a => a.startsWith('--file='))?.split('=').slice(1).join('=')
const branchArg = process.argv.find(a => a.startsWith('--branch='))?.split('=')[1]
const modeArg   = process.argv.find(a => a.startsWith('--mode='))?.split('=')[1]
const fromArg   = process.argv.find(a => a.startsWith('--from='))?.split('=')[1]
const toArg     = process.argv.find(a => a.startsWith('--to='))?.split('=')[1]
const isDryRun  = process.argv.includes('--dry-run')
const TOKEN_FILE = path.join(process.cwd(), 'tokens.sync.json')

const FIGMA_TOKEN = process.env.FIGMA_TOKEN
// Support multiple file keys: FIGMA_FILE_KEY=key1 or --file=key1,key2
const fileKeys = fileArg
  ? fileArg.split(',').map(k => k.trim())
  : (process.env.FIGMA_FILE_KEY ? [process.env.FIGMA_FILE_KEY] : [])

// ─── Figma API ────────────────────────────────────────────────────────────────

async function figmaRequest(endpoint, fileKey) {
  if (!FIGMA_TOKEN) throw new Error('FIGMA_TOKEN not set')
  const url = endpoint.replace(':fileKey', fileKey)
  const res = await fetch(`https://api.figma.com/v1${url}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  })
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

// ─── Get available modes for a file ──────────────────────────────────────────

async function getFileModes(fileKey) {
  const data = await figmaRequest('/files/:fileKey/variables/local', fileKey)
  const modes = new Map() // modeName → modeId
  for (const coll of Object.values(data.variableCollections ?? {})) {
    for (const mode of (coll.modes ?? [])) {
      modes.set(mode.name, mode.modeId)
    }
  }
  return modes
}

// ─── Pull with mode selection ─────────────────────────────────────────────────

async function pullWithMode(fileKey, modeName) {
  const data = await figmaRequest('/files/:fileKey/variables/local', fileKey)
  const tokens = {}

  for (const [id, variable] of Object.entries(data.variables ?? {})) {
    const collection = data.variableCollections?.[variable.variableCollectionId]
    if (!collection) continue

    // Find the requested mode id
    let modeId
    if (modeName) {
      const mode = collection.modes?.find(m => m.name.toLowerCase() === modeName.toLowerCase())
      modeId = mode?.modeId ?? Object.keys(variable.valuesByMode)[0]
    } else {
      modeId = Object.keys(variable.valuesByMode)[0]
    }

    const rawValue = variable.valuesByMode[modeId]
    if (rawValue === undefined) continue

    // Normalize name → nested token structure
    const parts = variable.name.split('/').map(p =>
      p.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    )

    let cursor = tokens
    for (let i = 0; i < parts.length - 1; i++) {
      cursor[parts[i]] ??= {}
      cursor = cursor[parts[i]]
    }

    const leafKey = parts[parts.length - 1]
    const figmaColorToHex = (c) => {
      const h = (v) => Math.round(v * 255).toString(16).padStart(2, '0')
      const hex = `#${h(c.r)}${h(c.g)}${h(c.b)}`
      return c.a < 1 ? `${hex}${h(c.a)}` : hex
    }

    if (variable.resolvedType === 'COLOR') {
      cursor[leafKey] = {
        $value: typeof rawValue === 'object' && 'r' in rawValue ? figmaColorToHex(rawValue) : String(rawValue),
        $type: 'color', _figmaId: id, _mode: modeName ?? 'default',
      }
    } else if (variable.resolvedType === 'FLOAT') {
      cursor[leafKey] = { $value: `${rawValue}px`, $type: 'dimension', _figmaId: id }
    } else if (variable.resolvedType === 'STRING') {
      cursor[leafKey] = { $value: String(rawValue), $type: 'other', _figmaId: id }
    }
  }

  return { tokens, fileKey, variableCount: Object.values(data.variables ?? {}).length }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

if (!cmd || cmd === 'help') {
  console.log(`Usage: node scripts/v45/figma-multi.mjs <pull|modes|diff> [options]

Commands:
  pull          Pull tokens from one or more Figma files
  modes         List available modes in Figma file
  diff          Show diff between two branches/modes

Options:
  --file=key1,key2    Comma-separated Figma file keys (overrides FIGMA_FILE_KEY)
  --mode=dark         Pull specific mode (light/dark/compact/etc)
  --branch=main       Figma branch name (future: v7.1)
  --from=light        Diff source mode
  --to=dark           Diff target mode
  --dry-run           Show what would change

Environment:
  FIGMA_TOKEN         Figma personal access token
  FIGMA_FILE_KEY      Default file key`)
  process.exit(0)
}

if (!FIGMA_TOKEN) {
  console.error('[figma-multi] FIGMA_TOKEN not set')
  process.exit(1)
}

if (fileKeys.length === 0) {
  console.error('[figma-multi] No file key provided. Set FIGMA_FILE_KEY or use --file=KEY')
  process.exit(1)
}

if (cmd === 'modes') {
  for (const fileKey of fileKeys) {
    process.stderr.write(`[figma-multi] Fetching modes from ${fileKey}...\n`)
    try {
      const modes = await getFileModes(fileKey)
      console.log(`\nFile: ${fileKey}`)
      console.log('Available modes:')
      for (const [name, id] of modes) {
        console.log(`  ${name.padEnd(20)} (id: ${id})`)
      }
    } catch (e) {
      console.error(`  Error: ${e.message}`)
    }
  }
}

else if (cmd === 'pull') {
  const allTokens = {}
  let totalVars = 0

  for (const fileKey of fileKeys) {
    process.stderr.write(`[figma-multi] Pulling from ${fileKey}${modeArg ? ` (mode: ${modeArg})` : ''}...\n`)
    try {
      const { tokens, variableCount } = await pullWithMode(fileKey, modeArg ?? null)
      Object.assign(allTokens, tokens)
      totalVars += variableCount
    } catch (e) {
      console.error(`[figma-multi] Error from ${fileKey}: ${e.message}`)
    }
  }

  if (isDryRun) {
    console.log('[figma-multi] DRY RUN — would write:')
    console.log(JSON.stringify({ tokens: allTokens }, null, 2).slice(0, 500))
  } else {
    let existing = { version: 1, tokens: {} }
    if (fs.existsSync(TOKEN_FILE)) {
      try { existing = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')) } catch {}
    }
    const merged = {
      ...existing,
      tokens: { ...existing.tokens, ...allTokens },
      figmaFileKeys: fileKeys,
      figmaMode: modeArg ?? 'default',
      updatedAt: new Date().toISOString(),
      source: 'figma-multi',
    }
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(merged, null, 2) + '\n')
    console.log(`[figma-multi] ✅ Pulled ${totalVars} variables from ${fileKeys.length} file(s) → ${TOKEN_FILE}`)
    if (modeArg) console.log(`[figma-multi] Mode: ${modeArg}`)
  }
}

else if (cmd === 'diff') {
  if (!fromArg || !toArg) {
    console.error('[figma-multi] Usage: tw sync figma diff --from=light --to=dark')
    process.exit(1)
  }

  const results = []
  for (const fileKey of fileKeys) {
    process.stderr.write(`[figma-multi] Diffing ${fromArg} → ${toArg} in ${fileKey}...\n`)
    try {
      const [fromTokens, toTokens] = await Promise.all([
        pullWithMode(fileKey, fromArg),
        pullWithMode(fileKey, toArg),
      ])

      const flatten = (obj, prefix = '') => {
        const out = {}
        for (const [k, v] of Object.entries(obj)) {
          const key = [prefix, k].filter(Boolean).join('.')
          if (v?.$value !== undefined) out[key] = v.$value
          else if (typeof v === 'object' && !v?.$type) Object.assign(out, flatten(v, key))
        }
        return out
      }

      const flatFrom = flatten(fromTokens.tokens)
      const flatTo   = flatten(toTokens.tokens)
      const allKeys  = new Set([...Object.keys(flatFrom), ...Object.keys(flatTo)])

      for (const key of allKeys) {
        if (flatFrom[key] !== flatTo[key]) {
          results.push({ file: fileKey, key, [fromArg]: flatFrom[key], [toArg]: flatTo[key] })
        }
      }
    } catch (e) {
      console.error(`  Error from ${fileKey}: ${e.message}`)
    }
  }

  if (results.length === 0) {
    console.log(`[figma-multi] ✅ No differences between '${fromArg}' and '${toArg}'`)
  } else {
    console.log(`[figma-multi] ${results.length} differences:\n`)
    for (const d of results) {
      console.log(`  ${d.key}`)
      console.log(`    ${fromArg}: ${d[fromArg] ?? '(missing)'}`)
      console.log(`    ${toArg}: ${d[toArg] ?? '(missing)'}`)
    }
  }
}

else {
  console.error(`Unknown command: ${cmd}`)
  process.exit(1)
}
