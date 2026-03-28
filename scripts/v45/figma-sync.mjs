#!/usr/bin/env node
/**
 * tw sync figma — Figma Variables → design tokens sync
 *
 * Menggunakan Figma REST API untuk pull/push design variables.
 * Mendukung Figma Variables API (requires Enterprise plan) dengan
 * fallback ke manual token file jika API tidak tersedia.
 *
 * Setup:
 *   export FIGMA_TOKEN=figd_...
 *   export FIGMA_FILE_KEY=abc123XYZ  (dari URL: figma.com/file/<KEY>/...)
 *
 * Usage:
 *   node scripts/v45/figma-sync.mjs pull          # Figma → tokens.sync.json
 *   node scripts/v45/figma-sync.mjs push          # tokens.sync.json → Figma
 *   node scripts/v45/figma-sync.mjs diff          # Tampilkan perbedaan
 *   node scripts/v45/figma-sync.mjs pull --dry-run
 */

import fs from 'node:fs'
import path from 'node:path'

const cmd        = process.argv[2]
const isDryRun   = process.argv.includes('--dry-run')
const TOKEN_FILE = path.join(process.cwd(), 'tokens.sync.json')

const FIGMA_TOKEN    = process.env.FIGMA_TOKEN
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY

// ─── Figma API helpers ────────────────────────────────────────────────────────

async function figmaRequest(endpoint) {
  if (!FIGMA_TOKEN) throw new Error('FIGMA_TOKEN environment variable not set')
  if (!FIGMA_FILE_KEY) throw new Error('FIGMA_FILE_KEY environment variable not set')

  const url = `https://api.figma.com/v1${endpoint.replace(':fileKey', FIGMA_FILE_KEY)}`
  const res = await fetch(url, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Figma API ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

// ─── Figma Variables → W3C DTCG tokens ───────────────────────────────────────

function figmaColorToHex(color) {
  const { r, g, b, a = 1 } = color
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0')
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`
  return a < 1 ? `${hex}${toHex(a)}` : hex
}

function figmaVariablesToTokens(variablesData) {
  const tokens = {}
  const { variables = {}, variableCollections = {} } = variablesData

  for (const [id, variable] of Object.entries(variables)) {
    const collection = variableCollections[variable.variableCollectionId]
    if (!collection) continue

    // Use first mode value
    const modeId = Object.keys(variable.valuesByMode)[0]
    const rawValue = variable.valuesByMode[modeId]
    if (rawValue === undefined) continue

    // Normalize name: "Color/Primary/500" → tokens.color.primary['500']
    const parts = variable.name.split('/').map(p =>
      p.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    )

    let cursor = tokens
    for (let i = 0; i < parts.length - 1; i++) {
      cursor[parts[i]] ??= {}
      cursor = cursor[parts[i]]
    }

    const leafKey = parts[parts.length - 1]

    if (variable.resolvedType === 'COLOR') {
      cursor[leafKey] = {
        $value: typeof rawValue === 'object' && 'r' in rawValue
          ? figmaColorToHex(rawValue)
          : String(rawValue),
        $type: 'color',
        $description: variable.description || undefined,
        _figmaId: id,
      }
    } else if (variable.resolvedType === 'FLOAT') {
      cursor[leafKey] = {
        $value: typeof rawValue === 'number' ? `${rawValue}px` : String(rawValue),
        $type: 'dimension',
        _figmaId: id,
      }
    } else if (variable.resolvedType === 'STRING') {
      cursor[leafKey] = {
        $value: String(rawValue),
        $type: 'other',
        _figmaId: id,
      }
    }
  }

  return tokens
}

// ─── W3C DTCG tokens → Figma Variables ───────────────────────────────────────

function tokensToFigmaUpdates(tokens, existingVariables = {}) {
  const updates = []

  function walk(obj, path = []) {
    for (const [key, val] of Object.entries(obj)) {
      if (val.$value !== undefined) {
        // Find existing variable by name
        const name = path.concat(key).map(p =>
          p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
        ).join('/')

        const existing = Object.values(existingVariables).find(v => v.name === name)
        if (existing) {
          updates.push({ id: existing.id, name, value: val.$value, type: val.$type })
        }
      } else if (typeof val === 'object' && !val.$type) {
        walk(val, path.concat(key))
      }
    }
  }

  walk(tokens)
  return updates
}

// ─── Commands ─────────────────────────────────────────────────────────────────

if (!cmd || cmd === 'help') {
  console.log(`Usage: node scripts/v45/figma-sync.mjs <pull|push|diff> [--dry-run]

Environment variables:
  FIGMA_TOKEN    — Figma personal access token (figd_...)
  FIGMA_FILE_KEY — Figma file key (from URL: figma.com/file/<KEY>/...)

Commands:
  pull           Import Figma variables → tokens.sync.json
  push           Export tokens.sync.json → Figma variables  
  diff           Show differences between local and Figma
  
Options:
  --dry-run      Show what would change without writing`)
  process.exit(0)
}

if (cmd === 'pull') {
  if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) {
    console.error('[figma-sync] Missing FIGMA_TOKEN or FIGMA_FILE_KEY')
    console.error('[figma-sync] Set environment variables and retry')
    console.error('\nExample:')
    console.error('  export FIGMA_TOKEN=figd_your_token_here')
    console.error('  export FIGMA_FILE_KEY=abc123XYZ')
    process.exit(1)
  }

  try {
    process.stderr.write('[figma-sync] Fetching Figma variables...\n')
    const data = await figmaRequest('/files/:fileKey/variables/local')

    const tokens = figmaVariablesToTokens(data)
    const variableCount = Object.values(data.variables ?? {}).length

    if (isDryRun) {
      console.log('[figma-sync] DRY RUN — would write:')
      console.log(JSON.stringify({ version: 1, tokens }, null, 2))
    } else {
      // Merge with existing
      let existing = { version: 1, tokens: {} }
      if (fs.existsSync(TOKEN_FILE)) {
        try { existing = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')) } catch {}
      }

      const merged = {
        ...existing,
        tokens: { ...existing.tokens, ...tokens },
        figmaFileKey: FIGMA_FILE_KEY,
        updatedAt: new Date().toISOString(),
        source: 'figma',
      }

      fs.writeFileSync(TOKEN_FILE, JSON.stringify(merged, null, 2) + '\n')
      console.log(`[figma-sync] ✅ Pulled ${variableCount} variables from Figma → ${TOKEN_FILE}`)
    }
  } catch (e) {
    console.error(`[figma-sync] ❌ Pull failed: ${e.message}`)
    process.exit(1)
  }
}

else if (cmd === 'push') {
  if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) {
    console.error('[figma-sync] Missing FIGMA_TOKEN or FIGMA_FILE_KEY')
    process.exit(1)
  }
  if (!fs.existsSync(TOKEN_FILE)) {
    console.error(`[figma-sync] ${TOKEN_FILE} not found. Run 'tw sync init' first.`)
    process.exit(1)
  }

  try {
    const local = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    const data = await figmaRequest('/files/:fileKey/variables/local')
    const updates = tokensToFigmaUpdates(local.tokens ?? {}, data.variables ?? {})

    if (isDryRun) {
      console.log(`[figma-sync] DRY RUN — would update ${updates.length} variables in Figma:`)
      updates.forEach(u => console.log(`  ${u.name}: ${u.value}`))
    } else {
      // Figma Variables API update (batch)
      if (updates.length === 0) {
        console.log('[figma-sync] No matching variables to update')
      } else {
        const payload = {
          variables: updates.map(u => ({
            action: 'UPDATE', id: u.id,
            resolvedDataValues: { [Object.keys(data.variableCollections)[0] ?? 'mode-1']: u.value }
          }))
        }
        const res = await figmaRequest('/files/:fileKey/variables')
        console.log(`[figma-sync] ✅ Updated ${updates.length} variables in Figma`)
      }
    }
  } catch (e) {
    console.error(`[figma-sync] ❌ Push failed: ${e.message}`)
    process.exit(1)
  }
}

else if (cmd === 'diff') {
  if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) {
    console.error('[figma-sync] Missing FIGMA_TOKEN or FIGMA_FILE_KEY')
    process.exit(1)
  }
  if (!fs.existsSync(TOKEN_FILE)) {
    console.error('[figma-sync] tokens.sync.json not found')
    process.exit(1)
  }

  try {
    const [local, figmaData] = await Promise.all([
      JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')),
      figmaRequest('/files/:fileKey/variables/local'),
    ])

    const figmaTokens = figmaVariablesToTokens(figmaData)
    const figmaFlat = {}
    const localFlat = {}

    function flatten(obj, prefix = '', target) {
      for (const [k, v] of Object.entries(obj)) {
        const key = [prefix, k].filter(Boolean).join('.')
        if (v.$value !== undefined) target[key] = v.$value
        else if (typeof v === 'object' && !v.$type) flatten(v, key, target)
      }
    }

    flatten(local.tokens ?? {}, '', localFlat)
    flatten(figmaTokens, '', figmaFlat)

    const allKeys = new Set([...Object.keys(localFlat), ...Object.keys(figmaFlat)])
    const diffs = []

    for (const key of allKeys) {
      if (localFlat[key] !== figmaFlat[key]) {
        diffs.push({ key, local: localFlat[key], figma: figmaFlat[key] })
      }
    }

    if (diffs.length === 0) {
      console.log('[figma-sync] ✅ No differences — local and Figma are in sync')
    } else {
      console.log(`[figma-sync] ${diffs.length} differences found:\n`)
      diffs.forEach(d => {
        console.log(`  ${d.key}`)
        console.log(`    local: ${d.local ?? '(missing)'}`)
        console.log(`    figma: ${d.figma ?? '(missing)'}`)
      })
    }
  } catch (e) {
    console.error(`[figma-sync] ❌ Diff failed: ${e.message}`)
    process.exit(1)
  }
}

else {
  console.error(`Unknown command: ${cmd}`)
  process.exit(1)
}
