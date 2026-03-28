/**
 * Centralized hash utilities
 * Replaces duplicated crypto.createHash() calls across packages
 */
import { createHash } from "node:crypto"
import fs from "node:fs"

/** Hash a string content → short hex string */
export function hashContent(content: string, algorithm = "md5", length = 8): string {
  return createHash(algorithm).update(content).digest("hex").slice(0, length)
}

/** Hash a file's content → short hex string */
export function hashFile(filePath: string, algorithm = "md5", length = 8): string {
  try {
    const content = fs.readFileSync(filePath, "utf8")
    return hashContent(content, algorithm, length)
  } catch {
    return "00000000"
  }
}
