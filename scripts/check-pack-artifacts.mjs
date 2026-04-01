import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, "..")
const defaultTargets = [".", "packages/core", "packages/scanner", "packages/engine", "packages/vite", "packages/next"]
const requestedTargets = process.argv.slice(2)
const targets = requestedTargets.length > 0 ? requestedTargets : defaultTargets
const requireFromHere = createRequire(import.meta.url)

const resolveNpmModuleBase = () => {
  const candidates = []

  if (process.env.npm_execpath) {
    candidates.push(path.resolve(path.dirname(process.env.npm_execpath), "..", "node_modules"))
  }

  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, "npm", "node_modules", "npm", "node_modules"))
  }

  candidates.push(path.join(path.dirname(process.execPath), "node_modules", "npm", "node_modules"))

  for (const base of candidates) {
    if (!base) continue
    if (
      fs.existsSync(path.join(base, "npm-packlist")) &&
      fs.existsSync(path.join(base, "@npmcli", "arborist"))
    ) {
      return base
    }
  }

  throw new Error("Unable to locate npm internal modules for pack artifact checks")
}

const npmModuleBase = resolveNpmModuleBase()
const packlist = requireFromHere(path.join(npmModuleBase, "npm-packlist"))
const Arborist = requireFromHere(path.join(npmModuleBase, "@npmcli", "arborist"))

const findForbiddenPackedFile = (files) =>
  files.find((filePath) => {
    const normalized = filePath.replaceAll("\\", "/")
    return (
      normalized.endsWith(".node") ||
      normalized.includes("/src/") ||
      normalized.includes("index.minified.ts") ||
      normalized.includes("/_experiments/") ||
      normalized.includes("/test/package.json")
    )
  })

const collectFilesRecursively = (directory) => {
  if (!fs.existsSync(directory)) return []

  const files = []
  const stack = [directory]

  while (stack.length > 0) {
    const current = stack.pop()
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(fullPath)
        continue
      }
      files.push(fullPath)
    }
  }

  return files
}

const checkScannerBundle = (targetPath) => {
  const scannerDistFiles = ["dist/index.js", "dist/index.cjs", "dist/worker.js", "dist/worker.cjs"]
  for (const relativeFile of scannerDistFiles) {
    const absoluteFile = path.resolve(rootDir, targetPath, relativeFile)
    if (!fs.existsSync(absoluteFile)) continue
    const content = fs.readFileSync(absoluteFile, "utf8")
    if (content.includes("eval: true")) {
      throw new Error(`${targetPath} still contains 'eval: true' in ${relativeFile}`)
    }
  }
}

const checkAdapterBundleSafety = (targetPath) => {
  const distDir = path.resolve(rootDir, targetPath, "dist")
  const textFilePattern = /\.(?:cjs|js|mjs|d\.ts|map)$/i
  const nativePattern = /\.node\b|@tailwindcss\/oxide|tailwindcss-oxide|oxide-/i

  for (const absoluteFile of collectFilesRecursively(distDir)) {
    const relativeFile = path.relative(path.resolve(rootDir, targetPath), absoluteFile)

    if (absoluteFile.endsWith(".node")) {
      throw new Error(`${targetPath} should not ship native binaries in ${relativeFile}`)
    }

    if (!textFilePattern.test(absoluteFile)) continue
    const content = fs.readFileSync(absoluteFile, "utf8")
    if (nativePattern.test(content)) {
      throw new Error(`${targetPath} dist still references native bindings in ${relativeFile}`)
    }
  }
}

for (const target of targets) {
  const absoluteTarget = path.resolve(rootDir, target)
  const arborist = new Arborist({ path: absoluteTarget })
  const tree = await arborist.loadActual()
  const packedFiles = await packlist(tree)
  const forbiddenFile = findForbiddenPackedFile(packedFiles)
  if (forbiddenFile) {
    throw new Error(`${target} package contains forbidden packed file: ${forbiddenFile}`)
  }
  if (target.includes("scanner")) {
    checkScannerBundle(target)
  }
  if (["packages/vite", "packages/next", "packages/rspack"].some((prefix) => target.includes(prefix))) {
    checkAdapterBundleSafety(target)
  }
}

console.log(`pack artifacts OK for ${targets.join(", ")}`)
