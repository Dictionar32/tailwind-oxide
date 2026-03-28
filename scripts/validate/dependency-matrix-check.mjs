import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"))
}

const rootPkg = readJson("package.json")
const rootVersion = String(rootPkg.version ?? "")

const targets = {
  "package.json": {
    devDependencies: {
      "@biomejs/biome": "^2.4.7",
      "@types/node": "^20",
      "@types/react": "^19",
      oxlint: "^1.56.0",
      tsup: "^8",
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
    },
    peerDependenciesOptional: {
      "@tailwindcss/postcss": "^4",
      tailwindcss: "^4",
    },
  },
  "packages/cli/package.json": {
    dependencies: {
      "@tailwind-styled/scanner": "*",
    },
  },
  "packages/vite/package.json": {
    dependencies: {
      "@tailwind-styled/compiler": "*",
      "@tailwind-styled/engine": "*",
      "@tailwind-styled/scanner": "*",
    },
    peerDependencies: {
      vite: ">=6.2.0",
    },
  },
  "packages/engine/package.json": {
    dependencies: {
      "@tailwind-styled/analyzer": "*",
      "@tailwind-styled/compiler": "*",
      "@tailwind-styled/scanner": "*",
      "@tailwind-styled/shared": "*",
    },
  },
  "packages/scanner/package.json": {
    dependencies: {
      "@tailwind-styled/syntax": "*",
    },
  },
  "packages/compiler/package.json": {
    dependencies: {
      "@tailwind-styled/plugin-api": "*",
      "@tailwind-styled/syntax": "*",
    },
  },
}

const errors = []

for (const [manifestPath, expectations] of Object.entries(targets)) {
  const data = readJson(manifestPath)
  for (const [field, expectedMap] of Object.entries(expectations)) {
    const actualMap = data[field] ?? {}
    for (const [depName, expectedVersion] of Object.entries(expectedMap)) {
      const actualVersion = actualMap[depName]
      if (actualVersion !== expectedVersion) {
        errors.push(
          `${manifestPath} -> ${field}.${depName}: expected \`${expectedVersion}\`, got \`${actualVersion ?? "<missing>"}\``
        )
      }
    }
  }
}

const importantPackages = [
  "packages/shared/package.json",
  "packages/vue/package.json",
  "packages/svelte/package.json",
  "packages/testing/package.json",
  "packages/storybook-addon/package.json",
  "packages/studio-desktop/package.json",
]

for (const relPath of importantPackages) {
  const fullPath = path.join(root, relPath)
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing: ${relPath}`)
    continue
  }

  const pkg = readJson(relPath)
  if (String(pkg.version ?? "") !== rootVersion) {
    errors.push(`${relPath} -> version mismatch: expected \`${rootVersion}\`, got \`${pkg.version ?? "<missing>"}\``)
  }
}

if (errors.length > 0) {
  console.error("Dependency matrix check failed:\n")
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log("Dependency matrix check passed.")
console.log(`All key packages are present and aligned to version ${rootVersion}.`)
