/**
 * Centralized logger — replaces scattered console.log/warn/error calls
 * across packages.
 */
export type LogLevel = "silent" | "error" | "warn" | "info" | "debug"

const LEVELS: Record<LogLevel, number> = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 }

function getEnvLevel(): LogLevel {
  const env = process.env.TWS_LOG_LEVEL?.toLowerCase()
  if (env && env in LEVELS) return env as LogLevel
  return process.env.TWS_DEBUG_SCANNER === "1" ? "debug" : "info"
}

export interface Logger {
  error(...args: unknown[]): void
  warn(...args: unknown[]): void
  info(...args: unknown[]): void
  debug(...args: unknown[]): void
  setLevel(level: LogLevel): void
}

export function createLogger(prefix: string, level?: LogLevel): Logger {
  const loggerState = {
    currentLevel: level ?? getEnvLevel(),
    setLevel(l: LogLevel) {
      this.currentLevel = l
    },
  }

  const log = (msgLevel: LogLevel, stream: "stdout" | "stderr", args: unknown[]) => {
    if (LEVELS[msgLevel] > LEVELS[loggerState.currentLevel]) return
    const line = `[${prefix}] ${args.map(String).join(" ")}\n`
    process[stream].write(line)
  }

  return {
    error: (...a) => log("error", "stderr", a),
    warn: (...a) => log("warn", "stderr", a),
    info: (...a) => log("info", "stdout", a),
    debug: (...a) => log("debug", "stderr", a),
    setLevel: loggerState.setLevel,
  }
}

export const logger = createLogger("tailwind-styled")
