import type { CliOutput } from "../utils/output"

export interface CommandContext {
  runtimeDir: string
  json: boolean
  debug: boolean
  verbose: boolean
  output: CliOutput
  cwd: string
}

export interface CommandDefinition {
  name: string
  aliases?: string[]
  run: (args: string[], context: CommandContext) => Promise<void>
}
