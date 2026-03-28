import { parseArgs as parseNodeArgs } from "node:util"

export interface ParsedCliInput {
  argv: string[]
  command: string | undefined
  restArgs: string[]
  json: boolean
  debug: boolean
  verbose: boolean
  help: boolean
  helpCommand: string | undefined
}

export function readFlag(name: string, argv: string[]): string | null {
  const withValuePrefix = `--${name}=`

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg.startsWith(withValuePrefix)) {
      return arg.slice(withValuePrefix.length)
    }
    if (arg === `--${name}`) {
      const next = argv[index + 1]
      if (next && !next.startsWith("-")) {
        return next
      }
    }
  }

  return null
}

export function hasFlag(name: string, argv: string[]): boolean {
  return argv.includes(`--${name}`)
}

export function ensureFlag(name: string, argv: string[]): string[] {
  return hasFlag(name, argv) ? argv : [...argv, `--${name}`]
}

export function firstPositional(argv: string[]): string | undefined {
  return argv.find((arg) => !arg.startsWith("-"))
}

export function parseCliInput(argv: string[]): ParsedCliInput {
  const parsed = parseNodeArgs({
    args: argv,
    allowPositionals: true,
    strict: false,
    options: {
      json: { type: "boolean", default: false },
      debug: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  })

  const commandIndex = argv.findIndex((arg) => !arg.startsWith("-"))
  const command = commandIndex >= 0 ? argv[commandIndex] : undefined
  const restArgs = commandIndex >= 0 ? argv.slice(commandIndex + 1) : []
  const firstPositionalArg = parsed.positionals[0]
  const helpCommand =
    firstPositionalArg === "help"
      ? parsed.positionals[1]
      : parsed.values.help
        ? firstPositionalArg
        : undefined

  return {
    argv,
    command,
    restArgs,
    json: Boolean(parsed.values.json),
    debug:
      Boolean(parsed.values.debug) || process.env.TWS_DEBUG === "1" || process.env.DEBUG === "1",
    verbose:
      Boolean(parsed.values.verbose) ||
      process.env.TWS_VERBOSE === "1" ||
      process.env.VERBOSE === "1",
    help:
      Boolean(parsed.values.help) ||
      firstPositionalArg === "help" ||
      command === undefined ||
      command === "--help" ||
      command === "-h",
    helpCommand,
  }
}
