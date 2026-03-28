import fs from "node:fs"
import path from "node:path"

const rootDir = process.cwd()

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.resolve(rootDir, relativePath), "utf8"))

const exportKeyToFile = (exportKey) => {
  if (exportKey === ".") return "index.ts"
  return `${exportKey.slice(2)}.ts`
}

const assertWrappers = (packageJsonPath, wrapperDir) => {
  const pkg = readJson(packageJsonPath)
  for (const exportKey of Object.keys(pkg.exports)) {
    if (exportKey === "./package.json") continue
    const wrapperFile = path.resolve(rootDir, wrapperDir, exportKeyToFile(exportKey))
    if (!fs.existsSync(wrapperFile)) {
      throw new Error(`Missing wrapper for ${packageJsonPath} export '${exportKey}' at ${wrapperFile}`)
    }
  }
}

assertWrappers("package.json", "src/umbrella")
assertWrappers("packages/core/package.json", "packages/core/src")

console.log("umbrella exports OK")
