import fs from "node:fs"
import path from "node:path"

const rootDir = process.cwd()
const rootPackagePath = path.join(rootDir, "package.json")
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"))
const version = rootPackage.version
const workspaceRoot = "packages"
const dependencySections = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
]
const bannerFiles = [
  path.join(rootDir, "tsup.config.ts"),
  path.join(rootDir, "packages/core/tsup.config.ts"),
  path.join(rootDir, "packages/engine/tsup.config.ts"),
]

const workspacePackagePaths = fs
  .readdirSync(path.join(rootDir, workspaceRoot), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(rootDir, workspaceRoot, entry.name, "package.json"))
  .filter((packagePath) => fs.existsSync(packagePath))

const workspacePackageNames = new Set()
for (const packagePath of workspacePackagePaths) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"))
  workspacePackageNames.add(pkg.name)
}

const changedFiles = []

for (const packagePath of [rootPackagePath, ...workspacePackagePaths]) {
  const isRoot = packagePath === rootPackagePath
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"))
  let changed = false

  if (!isRoot && pkg.version !== version) {
    pkg.version = version
    changed = true
  }

  for (const section of dependencySections) {
    const deps = pkg[section]
    if (!deps) continue
    for (const [dependencyName, dependencyVersion] of Object.entries(deps)) {
      if (!workspacePackageNames.has(dependencyName)) continue
      const nextVersion = `^${version}`
      if (dependencyVersion !== nextVersion) {
        deps[dependencyName] = nextVersion
        changed = true
      }
    }
  }

  if (!changed) continue

  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
  changedFiles.push(path.relative(rootDir, packagePath))
}

for (const bannerFile of bannerFiles) {
  if (!fs.existsSync(bannerFile)) continue
  const current = fs.readFileSync(bannerFile, "utf8")
  const next = current.replace(/v\d+\.\d+\.\d+/g, `v${version}`)
  if (next === current) continue
  fs.writeFileSync(bannerFile, next)
  changedFiles.push(path.relative(rootDir, bannerFile))
}

if (changedFiles.length === 0) {
  console.log(`versions already synced at ${version}`)
} else {
  console.log(`synced ${version} across:`)
  for (const changedFile of changedFiles) {
    console.log(`- ${changedFile}`)
  }
}
