#!/usr/bin/env node

/**
 * generate-json-schemas.mjs — Rust → JSON Schema → Zod bridge
 *
 * Reads JSON Schema output from Rust (via schemars/JsonSchema derive),
 * converts each schema to a Zod schema definition, and writes the result
 * to packages/shared/src/generated/.
 *
 * Usage:
 *   node scripts/generate-json-schemas.mjs [--check]
 *
 * Flags:
 *   --check   Dry-run mode: exit 1 if generated files differ from committed.
 *
 * Prerequisites:
 *   1. Cargo binary `export-schemas` must exist (generates JSON Schema files).
 *   2. Or manually place JSON Schema files in native/json-schemas/.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SCHEMA_INPUT_DIR = path.resolve(ROOT, "native", "json-schemas")
const GENERATED_DIR = path.resolve(ROOT, "packages", "shared", "src", "generated")
const HEADER = "/* Auto-generated from Rust JSON Schema — do not edit manually */\n"

const CHECK_MODE = process.argv.includes("--check")

// ── JSON Schema → Zod converter ────────────────────────────────────────────

function jsonSchemaTypeToZod(prop) {
  if (!prop || typeof prop !== "object") return "z.unknown()"

  if (prop.$ref) {
    const refName = prop.$ref.replace("#/$defs/", "").replace("#/definitions/", "")
    return `${refName}Schema`
  }

  const type = prop.type

  if (Array.isArray(prop.oneOf) || Array.isArray(prop.anyOf)) {
    const variants = (prop.oneOf || prop.anyOf).map((v) => jsonSchemaTypeToZod(v))
    return `z.union([${variants.join(", ")}])`
  }

  if (type === "string") {
    let schema = "z.string()"
    if (prop.minLength != null) schema += `.min(${prop.minLength})`
    if (prop.maxLength != null) schema += `.max(${prop.maxLength})`
    if (prop.pattern) schema += `.regex(new RegExp(${JSON.stringify(prop.pattern)}))`
    return schema
  }

  if (type === "integer") {
    let schema = "z.number().int()"
    if (prop.minimum != null) schema += `.min(${prop.minimum})`
    if (prop.maximum != null) schema += `.max(${prop.maximum})`
    return schema
  }

  if (type === "number") {
    let schema = "z.number()"
    if (prop.minimum != null) schema += `.min(${prop.minimum})`
    if (prop.maximum != null) schema += `.max(${prop.maximum})`
    return schema
  }

  if (type === "boolean") return "z.boolean()"

  if (type === "array") {
    const itemSchema = prop.items ? jsonSchemaTypeToZod(prop.items) : "z.unknown()"
    return `z.array(${itemSchema})`
  }

  if (type === "object") {
    if (prop.properties) {
      return buildObjectSchema(prop)
    }
    if (prop.additionalProperties) {
      const valSchema = jsonSchemaTypeToZod(prop.additionalProperties)
      return `z.record(z.string(), ${valSchema})`
    }
    return "z.record(z.string(), z.unknown())"
  }

  return "z.unknown()"
}

function buildObjectSchema(schema) {
  const props = schema.properties || {}
  const required = new Set(schema.required || [])
  const lines = []

  for (const [key, propSchema] of Object.entries(props)) {
    let zodType = jsonSchemaTypeToZod(propSchema)
    if (!required.has(key)) {
      zodType += ".optional()"
    }
    lines.push(`  ${key}: ${zodType},`)
  }

  return `z.object({\n${lines.join("\n")}\n})`
}

function generateZodSchema(name, jsonSchema) {
  const objectSchema = buildObjectSchema(jsonSchema)
  const lines = [
    HEADER,
    `import { z } from "zod"`,
    "",
    `export const ${name}Schema = ${objectSchema}`,
    "",
    `export type ${name} = z.infer<typeof ${name}Schema>`,
    "",
  ]
  return lines.join("\n")
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(SCHEMA_INPUT_DIR)) {
    console.log(`No JSON Schema input directory found at ${SCHEMA_INPUT_DIR}`)
    console.log("To generate JSON Schemas from Rust, run:")
    console.log("  cargo run --bin export-schemas")
    console.log("")
    console.log("Or manually place JSON Schema files in native/json-schemas/")
    return
  }

  const schemaFiles = fs.readdirSync(SCHEMA_INPUT_DIR).filter((f) => f.endsWith(".json"))

  if (schemaFiles.length === 0) {
    console.log("No JSON Schema files found in native/json-schemas/")
    return
  }

  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true })
  }

  let changed = 0
  let unchanged = 0

  for (const file of schemaFiles) {
    const filePath = path.join(SCHEMA_INPUT_DIR, file)
    const content = fs.readFileSync(filePath, "utf-8")
    const jsonSchema = JSON.parse(content)

    const name = path.basename(file, ".json")
    const zodSource = generateZodSchema(name, jsonSchema)
    const outPath = path.join(GENERATED_DIR, `${name}.schema.ts`)

    if (CHECK_MODE) {
      if (fs.existsSync(outPath)) {
        const existing = fs.readFileSync(outPath, "utf-8")
        if (existing !== zodSource) {
          console.error(`DRIFT: ${outPath} differs from generated output`)
          changed++
        } else {
          unchanged++
        }
      } else {
        console.error(`MISSING: ${outPath} does not exist`)
        changed++
      }
    } else {
      fs.writeFileSync(outPath, zodSource, "utf-8")
      console.log(`Generated: ${outPath}`)
    }
  }

  if (CHECK_MODE) {
    if (changed > 0) {
      console.error(`\n${changed} schema(s) are out of sync. Run: node scripts/generate-json-schemas.mjs`)
      process.exit(1)
    } else {
      console.log(`All ${unchanged} generated schema(s) are up to date.`)
    }
  }
}

main()
