import type { Command as CommanderCommand } from "commander"
import type { CommandContext } from "../commands/types"
import { parseCliInput } from "./args"
import { CliUsageError, errorExitCode } from "./errors"
import { createCliOutput } from "./output"
import { runtimeDirFromImportMeta } from "./paths"

interface CommanderLikeError extends Error {
  code?: string
  exitCode?: number
}

export interface CliMainOptions {
  argv?: string[]
  importMetaUrl: string
  commandHint?: string
  buildProgram: (context: CommandContext) => CommanderCommand
}

const isCommanderLikeError = (error: unknown): error is CommanderLikeError => {
  return error instanceof Error && typeof (error as CommanderLikeError).code === "string"
}

const isHelpExit = (error: unknown): boolean => {
  return isCommanderLikeError(error) && error.code === "commander.helpDisplayed"
}

const normalizeCliError = (error: unknown): unknown => {
  if (!isCommanderLikeError(error)) return error
  if (!error.code?.startsWith("commander.")) return error
  return new CliUsageError(error.message, { cause: error })
}

const findCommandByPath = (program: CommanderCommand, pathParts: string[]): CommanderCommand => {
  const foundCommand = pathParts.reduce<CommanderCommand>((current, part) => {
    const next = ((current.commands ?? []) as CommanderCommand[]).find((candidate) => {
      const alias = typeof candidate.alias === "function" ? candidate.alias() : undefined
      return candidate.name() === part || alias === part
    })

    if (!next) {
      throw new CliUsageError(`Unknown help topic: ${pathParts.join(" ")}`)
    }
    return next
  }, program)

  return foundCommand
}

export const resolveCommandHelp = (program: CommanderCommand, pathParts: string[]): string => {
  return findCommandByPath(program, pathParts).helpInformation()
}

const resolveHelpPath = (argv: string[]): string[] | null => {
  const positional = argv.filter((arg) => !arg.startsWith("-"))

  if (argv.length === 0) return []
  if (positional.length === 0) return []
  if (positional[0] === "help") return positional.slice(1)
  if (argv.includes("--help") || argv.includes("-h")) return positional

  return null
}

const walkCommands = (
  program: CommanderCommand,
  visit: (command: CommanderCommand) => void
): void => {
  visit(program)
  for (const command of (program.commands ?? []) as CommanderCommand[]) {
    walkCommands(command, visit)
  }
}

export async function runCliMain(options: CliMainOptions): Promise<void> {
  const argv = options.argv ?? process.argv
  const input = parseCliInput(argv.slice(2))

  // Redirect console logs to stderr in JSON mode BEFORE anything else
  if (input.json) {
    const _origLog = console.log
    const _origWarn = console.warn
    const _origDebug = console.debug
    const toStderr = (...args: unknown[]) => process.stderr.write(args.map(a => typeof a === "string" ? a : String(a)).join(" ") + "\n")
    console.log = toStderr
    console.warn = toStderr
    console.debug = toStderr
    process.on("exit", () => { console.log = _origLog; console.warn = _origWarn; console.debug = _origDebug })
  }

  if (input.verbose) process.env.TWS_VERBOSE = "1"
  if (input.debug) process.env.TWS_DEBUG = "1"

  const output = createCliOutput({
    json: input.json,
    debug: input.debug,
    verbose: input.verbose,
  })

  const context: CommandContext = {
    runtimeDir: runtimeDirFromImportMeta(options.importMetaUrl),
    json: input.json,
    debug: input.debug,
    verbose: input.verbose,
    output,
    cwd: process.cwd(),
  }

  const program = options.buildProgram(context)

  walkCommands(program, (command) => {
    if (input.json) {
      command.configureOutput({
        writeOut() {},
        writeErr() {},
        outputError() {},
      })
    }
    command.exitOverride()
  })

  try {
    const helpPath = resolveHelpPath(argv.slice(2))
    const isJsonHelp = input.json && helpPath

    if (isJsonHelp) {
      output.jsonSuccess("help", {
        command: helpPath.length > 0 ? helpPath.join(" ") : null,
        text: resolveCommandHelp(program, helpPath).trim(),
      })
      return
    }

    await program.parseAsync(argv)
  } catch (error) {
    const isHelpError = isHelpExit(error)
    if (isHelpError) return

    const normalized = normalizeCliError(error)
    const isJson = input.json

    if (isJson) {
      output.jsonError(normalized, options.commandHint ?? input.command)
    } else if (input.debug && normalized instanceof Error && normalized.stack) {
      output.writeText(normalized.stack, { stderr: true })
    } else if (normalized instanceof Error) {
      output.writeText(normalized.message, { stderr: true })
    } else {
      output.writeText(String(normalized), { stderr: true })
    }

    process.exitCode = errorExitCode(normalized)
  }
}
