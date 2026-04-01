import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { cruise } from "dependency-cruiser"
import extractTSConfig from "dependency-cruiser/config-utl/extract-ts-config"
import ts from "typescript"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, "..", "..")
const manifestPath = path.join(rootDir, "monorepo-file-dependency-graph.json")
const scopeDirectories = ["src", "packages", "scripts", "examples", "test"]
const definitionFilePattern = /\.d\.[cm]?tsx?$/i
const sourceFilePattern = /\.(?:[cm]?[jt]sx?)$/i
const checkMode = process.argv.includes("--check")
const requireFromHere = createRequire(import.meta.url)

process.chdir(rootDir)

const graphConfig = requireFromHere(path.join(rootDir, "dependency-cruiser.graph.cjs"))
const tsConfig = extractTSConfig(path.join(rootDir, graphConfig.options.tsConfig.fileName))
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]

const toPosixPath = (value) => value.replaceAll("\\", "/")

const normalizeRelativePath = (value) => {
  const rawValue = toPosixPath(value).replace(/^\.\//, "")
  if (path.isAbsolute(value)) {
    return toPosixPath(path.relative(rootDir, value))
  }
  return rawValue
}

const globMatchesPath = (pattern, filePath) => {
  const normalized = normalizeRelativePath(filePath)

  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3)
    if (prefix.startsWith("**/")) {
      const segment = prefix.slice(3)
      return (
        normalized === segment ||
        normalized.startsWith(`${segment}/`) ||
        normalized.includes(`/${segment}/`)
      )
    }

    return normalized === prefix || normalized.startsWith(`${prefix}/`)
  }

  if (pattern.startsWith("**/*.")) {
    return normalized.endsWith(pattern.slice(4))
  }

  return normalized === pattern
}

const isScopedPath = (filePath) => {
  const normalized = normalizeRelativePath(filePath)
  return graphConfig.scope.include.some((pattern) => normalized === pattern.slice(0, -3) || normalized.startsWith(pattern.slice(0, -2)))
}

const isExcludedPath = (filePath) => {
  const normalized = normalizeRelativePath(filePath)
  return (
    graphConfig.scope.exclude.some((pattern) => globMatchesPath(pattern, normalized)) ||
    definitionFilePattern.test(normalized)
  )
}

const isRepoLocalSourceFile = (filePath) => {
  const normalized = normalizeRelativePath(filePath)
  return isScopedPath(normalized) && !isExcludedPath(normalized) && sourceFilePattern.test(normalized)
}

const classifyWorkspace = (filePath) => {
  const segments = normalizeRelativePath(filePath).split("/")
  if (segments[0] === "packages" && segments[1]) {
    return `packages/${segments[1]}`
  }
  if (segments[0] === "examples" && segments[1] && segments.length > 2) {
    return `examples/${segments[1]}`
  }
  if (segments[0] === "examples") {
    return "examples"
  }
  return "root"
}

const classifyKind = (filePath) => {
  const normalized = normalizeRelativePath(filePath)
  if (normalized.startsWith("packages/")) {
    if (normalized.includes("/src/")) return "package-source"
    if (normalized.includes("/test/")) return "package-test"
    if (normalized.includes("/scripts/")) return "package-script"
    return "package-file"
  }
  if (normalized.startsWith("src/")) return "root-source"
  if (normalized.startsWith("scripts/")) return "script"
  if (normalized.startsWith("examples/")) return "example"
  if (normalized.startsWith("test/")) return "test"
  return "file"
}

const sortStrings = (values) => [...new Set(values)].sort((left, right) => left.localeCompare(right))

const workspacePackageJsonPaths = fs
  .readdirSync(path.join(rootDir, "packages"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(rootDir, "packages", entry.name, "package.json"))
  .filter((packageJsonPath) => fs.existsSync(packageJsonPath))

const toCamelCase = (value) =>
  value.replace(/-([a-z0-9])/gi, (_, character) => character.toUpperCase())

const stripKnownExtension = (value) =>
  value
    .replace(/\.d\.[cm]?tsx?$/i, "")
    .replace(/\.[^.]+$/i, "")

const findFirstExistingSourceFile = (stemCandidates, packageDir) => {
  for (const stemCandidate of stemCandidates) {
    const normalizedStem = stemCandidate.replaceAll("\\", "/")
    for (const extension of sourceExtensions) {
      const absoluteCandidate = path.join(packageDir, `${normalizedStem}${extension}`)
      if (fs.existsSync(absoluteCandidate)) {
        return normalizeRelativePath(absoluteCandidate)
      }
    }

    for (const extension of sourceExtensions) {
      const absoluteIndexCandidate = path.join(packageDir, normalizedStem, `index${extension}`)
      if (fs.existsSync(absoluteIndexCandidate)) {
        return normalizeRelativePath(absoluteIndexCandidate)
      }
    }
  }

  return null
}

const pickExportTarget = (exportValue) => {
  if (typeof exportValue === "string") {
    return exportValue
  }

  if (!exportValue || typeof exportValue !== "object") {
    return null
  }

  return exportValue.import ?? exportValue.default ?? exportValue.require ?? exportValue.types ?? null
}

const buildWorkspaceExportMap = () => {
  const exportMap = new Map()

  for (const packageJsonPath of workspacePackageJsonPaths) {
    const packageDir = path.dirname(packageJsonPath)
    const packageManifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
    const packageName = packageManifest.name
    const exportsField = packageManifest.exports ?? {}

    for (const [exportKey, exportValue] of Object.entries(exportsField)) {
      const target = pickExportTarget(exportValue)
      if (!target) continue

      const specifier = exportKey === "." ? packageName : `${packageName}${exportKey.slice(1)}`
      const exportSubpath = exportKey === "." ? "index" : exportKey.slice(2)
      const distStem = target.startsWith("./dist/") ? stripKnownExtension(target.slice("./dist/".length)) : null
      const exportKeyStem = stripKnownExtension(exportSubpath)
      const exportKeyCamelStem = toCamelCase(exportKeyStem)
      const sourceFile = findFirstExistingSourceFile(
        [
          distStem ? `src/${distStem}` : null,
          `src/${exportKeyStem}`,
          exportKeyCamelStem === exportKeyStem ? null : `src/${exportKeyCamelStem}`,
          "src/index",
        ].filter(Boolean),
        packageDir
      )

      if (sourceFile) {
        exportMap.set(specifier, sourceFile)
      }
    }
  }

  return exportMap
}

const workspaceExportMap = buildWorkspaceExportMap()

const getScriptKind = (filePath) => {
  const extension = path.extname(filePath).toLowerCase()
  if (extension === ".tsx") return ts.ScriptKind.TSX
  if (extension === ".ts" || extension === ".mts" || extension === ".cts") return ts.ScriptKind.TS
  if (extension === ".jsx") return ts.ScriptKind.JSX
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") return ts.ScriptKind.JS
  return ts.ScriptKind.Unknown
}

const extractModuleSpecifiers = (filePath) => {
  const absoluteFilePath = path.join(rootDir, filePath)
  const sourceText = fs.readFileSync(absoluteFilePath, "utf8")
  const sourceFile = ts.createSourceFile(
    absoluteFilePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(absoluteFilePath)
  )
  const moduleSpecifiers = new Set()

  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      moduleSpecifiers.add(node.moduleSpecifier.text)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      moduleSpecifiers.add(node.moduleReference.expression.text)
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      ((ts.isIdentifier(node.expression) && node.expression.text === "require") || node.expression.kind === ts.SyntaxKind.ImportKeyword)
    ) {
      moduleSpecifiers.add(node.arguments[0].text)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return [...moduleSpecifiers]
}

const resolveModuleSpecifier = (specifier, containingFile) => {
  const absoluteContainingFile = path.join(rootDir, containingFile)
  const resolvedByTypescript = ts.resolveModuleName(
    specifier,
    absoluteContainingFile,
    tsConfig.options,
    ts.sys
  ).resolvedModule?.resolvedFileName

  if (resolvedByTypescript) {
    const normalizedResolved = normalizeRelativePath(resolvedByTypescript)
    if (isRepoLocalSourceFile(normalizedResolved)) {
      return normalizedResolved
    }
  }

  return workspaceExportMap.get(specifier) ?? null
}

const computeReachableNodes = (startNode, adjacencyMap) => {
  const visited = new Set()
  const directNeighbors = adjacencyMap.get(startNode) ?? []
  const stack = [...directNeighbors]

  while (stack.length > 0) {
    const current = stack.pop()
    if (current === startNode || visited.has(current)) continue
    visited.add(current)
    for (const neighbor of adjacencyMap.get(current) ?? []) {
      if (neighbor === startNode || visited.has(neighbor)) continue
      stack.push(neighbor)
    }
  }

  for (const directNeighbor of directNeighbors) {
    visited.delete(directNeighbor)
  }

  return sortStrings([...visited])
}

const countCycles = (nodes, adjacencyMap) => {
  let index = 0
  const indexMap = new Map()
  const lowLinkMap = new Map()
  const stack = []
  const onStack = new Set()
  let cycleCount = 0

  const strongConnect = (node) => {
    indexMap.set(node, index)
    lowLinkMap.set(node, index)
    index += 1
    stack.push(node)
    onStack.add(node)

    for (const neighbor of adjacencyMap.get(node) ?? []) {
      if (!indexMap.has(neighbor)) {
        strongConnect(neighbor)
        lowLinkMap.set(node, Math.min(lowLinkMap.get(node), lowLinkMap.get(neighbor)))
        continue
      }

      if (onStack.has(neighbor)) {
        lowLinkMap.set(node, Math.min(lowLinkMap.get(node), indexMap.get(neighbor)))
      }
    }

    if (lowLinkMap.get(node) !== indexMap.get(node)) {
      return
    }

    const component = []
    let current = ""
    do {
      current = stack.pop()
      onStack.delete(current)
      component.push(current)
    } while (current !== node)

    const hasSelfLoop = (adjacencyMap.get(node) ?? []).includes(node)
    if (component.length > 1 || hasSelfLoop) {
      cycleCount += 1
    }
  }

  for (const node of nodes) {
    if (!indexMap.has(node)) {
      strongConnect(node)
    }
  }

  return cycleCount
}

const buildManifest = async () => {
  const result = await cruise(
    scopeDirectories,
    {
      outputType: "json",
      progress: { type: "none" },
      ...graphConfig.options,
    },
    graphConfig.options.enhancedResolveOptions,
    { tsConfig }
  )

  const cruiseResult = JSON.parse(result.output)
  const modules = Array.isArray(cruiseResult.modules) ? cruiseResult.modules : []
  const nodes = sortStrings(
    modules
      .map((moduleEntry) => normalizeRelativePath(moduleEntry.source))
      .filter((sourcePath) => isRepoLocalSourceFile(sourcePath))
  )
  const nodeSet = new Set(nodes)
  const adjacencyMap = new Map(nodes.map((node) => [node, []]))
  const reverseAdjacencyMap = new Map(nodes.map((node) => [node, []]))

  for (const moduleEntry of modules) {
    const source = normalizeRelativePath(moduleEntry.source)
    if (!nodeSet.has(source)) continue

    const directImportsFromCruise = (moduleEntry.dependencies ?? [])
      .map((dependency) => dependency.resolved)
      .filter(Boolean)
      .map((dependencyPath) => normalizeRelativePath(dependencyPath))
      .filter((dependencyPath) => dependencyPath !== source && nodeSet.has(dependencyPath))
    const directImportsFromTypescript = extractModuleSpecifiers(source)
      .map((moduleSpecifier) => resolveModuleSpecifier(moduleSpecifier, source))
      .filter(Boolean)
      .filter((dependencyPath) => dependencyPath !== source && nodeSet.has(dependencyPath))
    const directImports = sortStrings(
      [...directImportsFromCruise, ...directImportsFromTypescript]
    )

    adjacencyMap.set(source, directImports)
  }

  for (const [source, directImports] of adjacencyMap) {
    for (const dependencyPath of directImports) {
      reverseAdjacencyMap.get(dependencyPath).push(source)
    }
  }

  for (const [source, dependents] of reverseAdjacencyMap) {
    reverseAdjacencyMap.set(source, sortStrings(dependents))
  }

  const files = {}
  let directEdgeCount = 0
  let transitiveEdgeCount = 0
  let orphanCount = 0

  for (const node of nodes) {
    const directImports = adjacencyMap.get(node) ?? []
    const transitiveImports = computeReachableNodes(node, adjacencyMap)
    const directDependents = reverseAdjacencyMap.get(node) ?? []
    const transitiveDependents = computeReachableNodes(node, reverseAdjacencyMap)

    directEdgeCount += directImports.length
    transitiveEdgeCount += transitiveImports.length
    if (directDependents.length === 0) {
      orphanCount += 1
    }

    files[node] = {
      kind: classifyKind(node),
      workspace: classifyWorkspace(node),
      imports: {
        direct: directImports,
        transitive: transitiveImports,
      },
      dependents: {
        direct: directDependents,
        transitive: transitiveDependents,
      },
    }
  }

  return {
    schemaVersion: 1,
    scope: {
      include: [...graphConfig.scope.include],
      exclude: [...graphConfig.scope.exclude],
    },
    summary: {
      fileCount: nodes.length,
      directEdgeCount,
      transitiveEdgeCount,
      orphanCount,
      cycleCount: countCycles(nodes, adjacencyMap),
    },
    files,
  }
}

const serializeManifest = (manifest) => `${JSON.stringify(manifest, null, 2)}\n`

const main = async () => {
  const manifest = await buildManifest()
  const serialized = serializeManifest(manifest)

  if (checkMode) {
    if (!fs.existsSync(manifestPath)) {
      throw new Error("monorepo-file-dependency-graph.json is missing. Run `npm run graph:file-deps`.")
    }

    const existing = fs.readFileSync(manifestPath, "utf8")
    if (existing !== serialized) {
      throw new Error("monorepo-file-dependency-graph.json is out of date. Run `npm run graph:file-deps`.")
    }

    console.log(
      `file dependency graph OK (${manifest.summary.fileCount} files, ${manifest.summary.directEdgeCount} direct edges, ${manifest.summary.transitiveEdgeCount} transitive edges)`
    )
    return
  }

  fs.writeFileSync(manifestPath, serialized)
  console.log(
    `wrote monorepo-file-dependency-graph.json (${manifest.summary.fileCount} files, ${manifest.summary.directEdgeCount} direct edges, ${manifest.summary.transitiveEdgeCount} transitive edges)`
  )
}

await main()
