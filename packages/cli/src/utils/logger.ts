import pc from "picocolors"

import type { CliOutput } from "./output"

export interface CliLogger {
  ok: (message: string) => void
  skip: (message: string) => void
  warn: (message: string) => void
  info: (message: string) => void
  dry: (message: string) => void
}

export type CliLogLevel = "ok" | "skip" | "warn" | "info" | "dry"

export interface CliLogEvent {
  level: CliLogLevel
  message: string
}

export interface CreateCliLoggerOptions {
  silent?: boolean
  useStderr?: boolean
  onEvent?: (event: CliLogEvent) => void
  output?: CliOutput
}

export function createCliLogger(options: CreateCliLoggerOptions = {}): CliLogger {
  function emit(level: CliLogLevel, prefix: string, message: string): void {
    options.onEvent?.({ level, message })
    if (options.silent) return

    const colorizedPrefix =
      level === "ok"
        ? pc.green(prefix)
        : level === "warn"
          ? pc.yellow(prefix)
          : level === "dry"
            ? pc.cyan(prefix)
            : level === "skip"
              ? pc.dim(prefix)
              : pc.blue(prefix)

    if (options.output) {
      options.output.writeText(`${colorizedPrefix}${message}`, {
        stderr: options.useStderr,
      })
      return
    }

    const writeLine = options.useStderr ? console.error : console.log
    writeLine(`${prefix}${message}`)
  }

  return {
    ok(message: string) {
      emit("ok", "  [ok] ", message)
    },
    skip(message: string) {
      emit("skip", "  [skip] ", message)
    },
    warn(message: string) {
      emit("warn", "  [warn] ", message)
    },
    info(message: string) {
      emit("info", "       ", message)
    },
    dry(message: string) {
      emit("dry", "  [dry-run] ", message)
    },
  }
}
