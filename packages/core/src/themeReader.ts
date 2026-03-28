export interface ThemeConfig {
  colors: Record<string, string>
  spacing: Record<string, string>
  fonts: Record<string, string>
  breakpoints: Record<string, string>
  animations: Record<string, string>
  raw: Record<string, string>
}

const cache = new Map<string, ThemeConfig>()

function createEmptyTheme(): ThemeConfig {
  return {
    colors: {},
    spacing: {},
    fonts: {},
    breakpoints: {},
    animations: {},
    raw: {},
  }
}

function setToken(theme: ThemeConfig, key: string, value: string): void {
  theme.raw[key] = value

  if (key.startsWith("color-")) {
    theme.colors[key.slice("color-".length)] = value
    return
  }
  if (key.startsWith("spacing-")) {
    theme.spacing[key.slice("spacing-".length)] = value
    return
  }
  if (key.startsWith("font-")) {
    theme.fonts[key.slice("font-".length)] = value
    return
  }
  if (key.startsWith("breakpoint-")) {
    theme.breakpoints[key.slice("breakpoint-".length)] = value
    return
  }
  if (key.startsWith("animate-")) {
    theme.animations[key.slice("animate-".length)] = value
  }
}

export function resolveThemeValue(
  key: string,
  theme: ThemeConfig,
  visited: Set<string> = new Set()
): string {
  const token = key.replace(/^--/, "")
  const raw = theme.raw[token]
  if (!raw) return ""
  if (visited.has(token)) return raw

  const nested = raw.match(/^var\((--[a-zA-Z0-9_-]+)\)$/)
  if (!nested) return raw

  visited.add(token)
  return resolveThemeValue(nested[1], theme, visited)
}

export function extractThemeFromCSS(cssContent: string): ThemeConfig {
  const hit = cache.get(cssContent)
  if (hit) return hit

  const theme = createEmptyTheme()

  for (const blockMatch of cssContent.matchAll(/@theme\s*\{([\s\S]*?)\}/g)) {
    const block = blockMatch[1]
    for (const varMatch of block.matchAll(/--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)) {
      const key = varMatch[1]
      const value = varMatch[2].trim()
      setToken(theme, key, value)
    }
  }

  for (const key of Object.keys(theme.raw)) {
    const resolved = resolveThemeValue(`--${key}`, theme)
    theme.raw[key] = resolved

    if (key.startsWith("color-")) {
      theme.colors[key.slice("color-".length)] = resolved
    } else if (key.startsWith("spacing-")) {
      theme.spacing[key.slice("spacing-".length)] = resolved
    } else if (key.startsWith("font-")) {
      theme.fonts[key.slice("font-".length)] = resolved
    } else if (key.startsWith("breakpoint-")) {
      theme.breakpoints[key.slice("breakpoint-".length)] = resolved
    } else if (key.startsWith("animate-")) {
      theme.animations[key.slice("animate-".length)] = resolved
    }
  }

  cache.set(cssContent, theme)
  return theme
}

export function generateTypeDefinitions(theme: ThemeConfig): string {
  const toRecordType = (name: string, obj: Record<string, string>) => {
    const keys = Object.keys(obj)
    if (keys.length === 0) return `  ${name}: Record<string, string>`
    const mapped = keys.map((k) => `    "${k}": string`).join("\n")
    return `  ${name}: {\n${mapped}\n  }`
  }

  return [
    "export interface TailwindStyledThemeTokens {",
    toRecordType("colors", theme.colors),
    toRecordType("spacing", theme.spacing),
    toRecordType("fonts", theme.fonts),
    toRecordType("breakpoints", theme.breakpoints),
    toRecordType("animations", theme.animations),
    "}",
    "",
  ].join("\n")
}

export function clearThemeReaderCache(): void {
  cache.clear()
}
