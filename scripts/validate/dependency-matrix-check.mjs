import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"))
}

function listWorkspacePackageManifests() {
  const packagesDir = path.join(root, "packages")
  if (!fs.existsSync(packagesDir)) return []

  return fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => `packages/${entry.name}/package.json`)
    .filter((relPath) => fs.existsSync(path.join(root, relPath)))
    .sort((left, right) => left.localeCompare(right))
}

const rootPkg = readJson("package.json")
const rootVersion = String(rootPkg.version ?? "")
const workspaceRange = `^${rootVersion}`

const errors = []

function pushMismatch(label, expected, actual) {
  errors.push(`${label}: expected \`${expected}\`, got \`${actual ?? "<missing>"}\``)
}

function assertSubset(actualValue, expectedValue, label) {
  if (expectedValue && typeof expectedValue === "object" && !Array.isArray(expectedValue)) {
    if (!actualValue || typeof actualValue !== "object" || Array.isArray(actualValue)) {
      pushMismatch(label, JSON.stringify(expectedValue), actualValue === undefined ? undefined : JSON.stringify(actualValue))
      return
    }

    for (const [key, nestedExpected] of Object.entries(expectedValue)) {
      assertSubset(actualValue[key], nestedExpected, `${label}.${key}`)
    }
    return
  }

  if (actualValue !== expectedValue) {
    pushMismatch(label, expectedValue, actualValue)
  }
}

const curatedTargets = {
  "package.json": {
    devDependencies: {
      "@biomejs/biome": "^2.4.7",
      "@types/node": "^20.19.37",
      "@types/react": "^19",
      "dependency-cruiser": "^16.10.4",
      tsup: "^8",
      turbo: "^2.1.3",
      typescript: "^5",
    },
  },
  "packages/core/package.json": {
    dependencies: {
      postcss: "^8",
      "tailwind-merge": "^3",
    },
    peerDependencies: {
      react: ">=18",
      "react-dom": ">=18",
      "@tailwindcss/postcss": "^4",
      tailwindcss: "^4",
    },
    peerDependenciesMeta: {
      react: { optional: true },
      "react-dom": { optional: true },
      "@tailwindcss/postcss": { optional: true },
      tailwindcss: { optional: true },
    },
  },
  "packages/compiler/package.json": {
    dependencies: {
      "@tailwind-styled/plugin-api": workspaceRange,
      "@tailwind-styled/shared": workspaceRange,
      "@tailwind-styled/syntax": workspaceRange,
      postcss: "^8",
      "tailwind-merge": "^3",
    },
    peerDependencies: {
      "@tailwindcss/postcss": "^4",
      tailwindcss: "^4",
    },
  },
  "packages/vite/package.json": {
    dependencies: {
      "@tailwind-styled/compiler": workspaceRange,
      "@tailwind-styled/engine": workspaceRange,
      "@tailwind-styled/scanner": workspaceRange,
    },
    peerDependencies: {
      vite: ">=6.2.0",
    },
  },
  "packages/vue/package.json": {
    peerDependencies: {
      "tailwind-merge": ">=2.0.0",
      vue: ">=3.3.0",
    },
  },
  "packages/svelte/package.json": {
    peerDependencies: {
      svelte: ">=4.0.0",
      "tailwind-merge": ">=2.0.0",
    },
  },
  "packages/studio-desktop/package.json": {
    dependencies: {
      "electron-updater": "^6.0.0",
    },
  },
}

for (const [manifestPath, expectations] of Object.entries(curatedTargets)) {
  const data = readJson(manifestPath)
  for (const [field, expectedValue] of Object.entries(expectations)) {
    assertSubset(data[field], expectedValue, `${manifestPath} -> ${field}`)
  }
}

const workspaceManifestPaths = listWorkspacePackageManifests()
const workspacePackages = workspaceManifestPaths.map((relPath) => ({
  relPath,
  data: readJson(relPath),
}))
const workspacePackageNames = new Set(
  workspacePackages.map(({ data }) => String(data.name ?? "")).filter(Boolean)
)

for (const { relPath, data } of workspacePackages) {
  if (String(data.version ?? "") !== rootVersion) {
    pushMismatch(`${relPath} -> version`, rootVersion, data.version)
  }
}

const manifestsToCheck = [
  { relPath: "package.json", data: rootPkg },
  ...workspacePackages,
]

for (const { relPath, data } of manifestsToCheck) {
  for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    const actualMap = data[field] ?? {}
    for (const [depName, actualVersion] of Object.entries(actualMap)) {
      if (!workspacePackageNames.has(depName)) continue
      if (depName === data.name) continue
      if (actualVersion !== workspaceRange) {
        pushMismatch(`${relPath} -> ${field}.${depName}`, workspaceRange, actualVersion)
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Dependency matrix check failed:\n")
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log("Dependency matrix check passed.")
console.log(`Validated ${workspacePackages.length} workspace manifests against version ${rootVersion}.`)
