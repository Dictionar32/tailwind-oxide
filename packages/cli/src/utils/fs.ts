import fs from "node:fs/promises"
import path from "node:path"

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8")
  } catch {
    return null
  }
}

export async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  const raw = await readFileSafe(filePath)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function writeFileSafe(
  filePath: string,
  content: string,
  options: { dryRun?: boolean; onDryRun?: (message: string) => void } = {}
): Promise<void> {
  if (options.dryRun) {
    options.onDryRun?.(`write ${filePath}`)
    return
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, "utf8")
}

export async function ensureFileSafe(
  filePath: string,
  content: string,
  options: { dryRun?: boolean; onDryRun?: (message: string) => void } = {}
): Promise<"created" | "skipped"> {
  if (await pathExists(filePath)) return "skipped"
  await writeFileSafe(filePath, content, options)
  return "created"
}
