/**
 * Tailwind CSS version detection and compatibility checks.
 *
 * tailwind-styled-v4 requires Tailwind CSS v4.x.
 * This module detects the installed version and provides
 * clear error messages for unsupported versions.
 */

export interface TailwindInfo {
  version: string
  major: number
  supported: boolean
  path: string | null
}

export function detectTailwind(): TailwindInfo {
  try {
    const pkgPath = require.resolve("tailwindcss/package.json")
    const { version } = require(pkgPath)
    const major = Number.parseInt(version.split(".")[0], 10)
    return { version, major, supported: major >= 4, path: pkgPath }
  } catch {
    return { version: "not-installed", major: 0, supported: false, path: null }
  }
}

export function assertTailwindV4(): void {
  const info = detectTailwind()
  if (!info.supported) {
    const message = info.major === 0
      ? "tailwindcss is not installed. Run: npm install tailwindcss@^4"
      : `tailwind-styled-v4 requires Tailwind CSS v4.x. Found: v${info.version}. Upgrade: npm install tailwindcss@^4`

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[tailwind-styled] ${message}`)
    }
  }
}

export function getTailwindVersion(): string {
  return detectTailwind().version
}

export function isTailwindV4(): boolean {
  return detectTailwind().supported
}
