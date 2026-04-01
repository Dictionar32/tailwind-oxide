export function patchNextConfigImpl(src: string): string | null {
  if (src.includes("withTailwindStyled")) return null

  const hasExport = src.includes("export default")
  const hasCjs = src.includes("module.exports")

  if (hasExport) {
    const withImport = `import { withTailwindStyled } from "@tailwind-styled/next"\n${src}`

    const patterns = [
      /export default\s+([\w]+);?\s*$/m,
      /export default\s+(defineConfig\([\s\S]*?\));?\s*$/m,
      /export default\s+(\{[\s\S]*?\});?\s*$/m,
    ]

    const result = patterns.reduce(
      (acc, pattern) =>
        acc.replace(pattern, (_match, expr) => `export default withTailwindStyled()(${expr})`),
      withImport
    )

    return result === src ? null : result
  }

  if (hasCjs) {
    const result =
      `const { withTailwindStyled } = require("@tailwind-styled/next")\n` +
      src.replace(
        /module\.exports\s*=\s*(.+)/s,
        (_match, expr) => `module.exports = withTailwindStyled()(${expr.trim()})`
      )
    return result === src ? null : result
  }

  return null
}

export function patchViteConfigImpl(src: string): string | null {
  const hasLegacyImport = src.includes("tailwind-styled-v4/vite")

  const patched = hasLegacyImport
    ? src
        .replace(/from\s+['"]tailwind-styled-v4\/vite['"]/g, 'from "@tailwind-styled/vite"')
        .replace(/\btailwindStyled\(/g, "tailwindStyledPlugin(")
    : src.replace(/\btailwindStyled\(/g, "tailwindStyledPlugin(")

  const alreadyConfigured =
    patched.includes("@tailwind-styled/vite") && patched.includes("tailwindStyledPlugin(")
  if (alreadyConfigured) return patched === src ? null : patched

  const viteImportMatch = patched.match(/(import .+ from ['"]vite['"][^\n]*\n)/)
  const reactImportMatch = patched.match(/(import .+ from ['"]@vitejs\/plugin-react['"][^\n]*\n)/)
  const insertAfter = (reactImportMatch ?? viteImportMatch)?.[1]

  const result = (() => {
    if (!patched.includes("@tailwind-styled/vite") && insertAfter) {
      return patched.replace(
        insertAfter,
        `${insertAfter}import { tailwindStyledPlugin } from "@tailwind-styled/vite"\n`
      )
    }
    if (!patched.includes("@tailwind-styled/vite")) {
      return `import { tailwindStyledPlugin } from "@tailwind-styled/vite"\n${patched}`
    }
    return patched
  })()

  return result === src ? null : result
}

export function patchRspackConfigImpl(src: string): string | null {
  const hasModernImport = src.includes("@tailwind-styled/rspack")
  const hasLegacyImport = src.includes("tailwind-styled-v4/rspack")

  const withLegacyFix = hasLegacyImport
    ? src.replace(/from\s+['"]tailwind-styled-v4\/rspack['"]/g, 'from "@tailwind-styled/rspack"')
    : src

  const patched = withLegacyFix.replace(/\btailwindStyled\(/g, "tailwindStyledRspackPlugin(")

  const alreadyConfigured =
    patched.includes("@tailwind-styled/rspack") && patched.includes("tailwindStyledRspackPlugin(")
  if (alreadyConfigured) return patched === src ? null : patched

  const result = (() => {
    if (!patched.includes("@tailwind-styled/rspack") && !hasModernImport) {
      const lines = patched.split("\n")
      const lastImportIdx = lines.reduce((maxIdx, line, idx) => {
        return line.trimStart().startsWith("import ") ? idx : maxIdx
      }, 0)
      lines.splice(
        lastImportIdx + 1,
        0,
        'import { tailwindStyledRspackPlugin } from "@tailwind-styled/rspack"'
      )
      return lines.join("\n")
    }
    return patched
  })()

  const finalResult = (() => {
    if (!result.includes("tailwindStyledRspackPlugin(")) {
      if (result.includes("plugins:")) {
        return result.replace(
          /plugins:\s*\[([^\]]*)\]/s,
          (_match, inner) => `plugins: [${inner.trimEnd()}\n    tailwindStyledRspackPlugin(),\n  ]`
        )
      }
      return result.replace(
        /(export default defineConfig\(\{[\s\S]*?)(\}\))/,
        (_match, body, close) => `${body}  plugins: [tailwindStyledRspackPlugin()],\n${close}`
      )
    }
    return result
  })()

  return finalResult === src ? null : finalResult
}

export function patchTailwindCssImpl(src: string): string | null {
  const hasTailwindImport =
    src.includes('@import "tailwindcss"') || src.includes("@import 'tailwindcss'")
  if (hasTailwindImport) return null
  return `@import "tailwindcss";\n\n${src}`
}

export function patchTsConfigImpl(src: string): string | null {
  try {
    const json = JSON.parse(src) as { compilerOptions?: Record<string, unknown> }
    const compilerOptions = (json.compilerOptions ?? {}) as Record<string, unknown>

    const original = { ...compilerOptions }

    // Apply changes immutably
    const updatedCompilerOptions = {
      ...compilerOptions,
      paths: compilerOptions.paths ?? {},
      strict: compilerOptions.strict === undefined ? true : compilerOptions.strict,
      moduleResolution:
        compilerOptions.moduleResolution === "node16" ||
        compilerOptions.moduleResolution === "bundler"
          ? compilerOptions.moduleResolution
          : "bundler",
      jsx: compilerOptions.jsx ?? "react-jsx",
    }

    const hasChanges =
      updatedCompilerOptions.paths !== original.paths ||
      updatedCompilerOptions.strict !== original.strict ||
      updatedCompilerOptions.moduleResolution !== original.moduleResolution ||
      updatedCompilerOptions.jsx !== original.jsx

    if (!hasChanges) return null

    const updatedJson = {
      ...json,
      compilerOptions: updatedCompilerOptions,
    }

    return `${JSON.stringify(updatedJson, null, 2)}\n`
  } catch {
    return null
  }
}
