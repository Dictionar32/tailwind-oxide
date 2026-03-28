export class CliError extends Error {
  readonly exitCode: number
  readonly code: string

  constructor(
    message: string,
    options: {
      exitCode?: number
      code?: string
      cause?: unknown
    } = {}
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = "CliError"
    this.exitCode = options.exitCode ?? 1
    this.code = options.code ?? "CLI_ERROR"
  }
}

export class CliUsageError extends CliError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { ...options, exitCode: 2, code: "CLI_USAGE_ERROR" })
    this.name = "CliUsageError"
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function errorToJson(error: unknown, debug = false, command?: string): string {
  const payload: Record<string, unknown> = {
    ok: false,
    error: true,
    message: errorMessage(error),
    code: error instanceof CliError ? error.code : "CLI_ERROR",
    exitCode: error instanceof CliError ? error.exitCode : 1,
    command: command ?? null,
    generatedAt: new Date().toISOString(),
  }

  if (debug && error instanceof Error && error.stack) {
    payload.stack = error.stack
  }

  return JSON.stringify(payload, null, 2)
}

export function errorExitCode(error: unknown): number {
  return error instanceof CliError ? error.exitCode : 1
}
