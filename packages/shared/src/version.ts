/** Parse semver string → { major, minor, patch } */
export function parseVersion(v: string): { major: number; minor: number; patch: number } {
  const parts = v
    .replace(/^v/, "")
    .split(".")
    .map((p) => {
      const n = Number(p)
      return Number.isNaN(n) ? 0 : n
    })
  const [major = 0, minor = 0, patch = 0] = parts
  return { major, minor, patch }
}

/** Check if version satisfies minimum (major.minor) */
export function satisfiesMinVersion(version: string, minVersion: string): boolean {
  const v = parseVersion(version)
  const min = parseVersion(minVersion)
  if (v.major !== min.major) return v.major > min.major
  if (v.minor !== min.minor) return v.minor > min.minor
  return v.patch >= min.patch
}
