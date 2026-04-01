import type { Writable } from "node:stream"
import {
  intro as clackIntro,
  isTTY as clackIsTTY,
  note as clackNote,
  outro as clackOutro,
  spinner as clackSpinner,
} from "@clack/prompts"
import pc from "picocolors"

import { errorToJson } from "./errors"
import { toJsonSuccess } from "./json"

export interface CliOutputOptions {
  json?: boolean
  debug?: boolean
  verbose?: boolean
  stdout?: Writable
  stderr?: Writable
}

export interface CliSpinner {
  start: (message?: string) => void
  stop: (message?: string) => void
  error: (message?: string) => void
  cancel: (message?: string) => void
  message: (message?: string) => void
  clear: () => void
}

export interface CliOutput {
  readonly json: boolean
  readonly debug: boolean
  readonly verboseEnabled: boolean
  readonly interactive: boolean
  writeText: (message?: string, options?: { stderr?: boolean }) => void
  info: (message: string) => void
  success: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
  step: (message: string) => void
  note: (message: string, title?: string) => void
  intro: (message: string) => void
  outro: (message: string) => void
  table: (rows: unknown) => void
  spinner: () => CliSpinner
  verbose: (message: string) => void
  jsonSuccess: <T>(command: string, data: T) => void
  jsonError: (error: unknown, command?: string) => void
  header: (message: string) => void
  subHeader: (message: string) => void
  listItem: (message: string) => void
  footer: (message: string) => void
}

function writeLine(stream: Writable, message = ""): void {
  stream.write(`${message}\n`)
}

function createNoopSpinner(): CliSpinner {
  return {
    start() {},
    stop() {},
    error() {},
    cancel() {},
    message() {},
    clear() {},
  }
}

function formatLabel(colorize: (value: string) => string, label: string, message: string): string {
  return `${colorize(label)} ${message}`
}

export function createCliOutput(options: CliOutputOptions = {}): CliOutput {
  const stdout = options.stdout ?? process.stdout
  const stderr = options.stderr ?? process.stderr
  const json = Boolean(options.json)
  const debug = Boolean(options.debug)
  const verboseEnabled = Boolean(options.verbose)
  const interactive = !json && Boolean(process.stdin.isTTY) && clackIsTTY(stdout)

  function writeText(message = "", writeOptions: { stderr?: boolean } = {}): void {
    writeLine(writeOptions.stderr || json ? stderr : stdout, message)
  }

  function showClackMessage(fn: (message?: string) => void, fallback: string): void {
    if (interactive) {
      fn(fallback)
      return
    }
    writeText(fallback)
  }

  return {
    json,
    debug,
    verboseEnabled,
    interactive,
    writeText,
    info(message: string) {
      writeText(formatLabel(pc.cyan, "info", message))
    },
    success(message: string) {
      writeText(formatLabel(pc.green, "ok", message))
    },
    warn(message: string) {
      writeText(formatLabel(pc.yellow, "warn", message), { stderr: true })
    },
    error(message: string) {
      writeText(formatLabel(pc.red, "error", message), { stderr: true })
    },
    step(message: string) {
      writeText(formatLabel(pc.blue, "step", message))
    },
    note(message: string, title?: string) {
      if (interactive) {
        clackNote(message, title)
        return
      }
      if (title) {
        writeText(`${title}\n${message}`)
        return
      }
      writeText(message)
    },
    intro(message: string) {
      showClackMessage(clackIntro, message)
    },
    outro(message: string) {
      showClackMessage(clackOutro, message)
    },
    table(rows: unknown) {
      writeText(JSON.stringify(rows, null, 2))
    },
    spinner() {
      if (!interactive) return createNoopSpinner()
      const instance = clackSpinner({ output: stdout })
      return {
        start(message?: string) {
          instance.start(message)
        },
        stop(message?: string) {
          instance.stop(message)
        },
        error(message?: string) {
          instance.error(message)
        },
        cancel(message?: string) {
          instance.cancel(message)
        },
        message(message?: string) {
          instance.message(message)
        },
        clear() {
          instance.clear()
        },
      }
    },
    verbose(message: string) {
      if (!verboseEnabled) return
      writeText(pc.dim(message), { stderr: true })
    },
    jsonSuccess<T>(command: string, data: T) {
      writeLine(stdout, toJsonSuccess(command, data))
    },
    jsonError(error: unknown, command?: string) {
      writeLine(stdout, errorToJson(error, debug, command))
    },
    header(message: string) {
      writeText(`\n${pc.bold(pc.cyan(message))}\n`)
    },
    subHeader(message: string) {
      writeText(pc.bold(message))
    },
    listItem(message: string) {
      writeText(`  ${pc.dim("•")} ${message}`)
    },
    footer(message: string) {
      writeText(`\n${pc.dim(message)}\n`)
    },
  }
}
