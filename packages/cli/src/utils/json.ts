export interface CliJsonSuccess<T = unknown> {
  ok: true
  error: false
  command: string
  generatedAt: string
  data: T
}

export function toJsonSuccess<T>(command: string, data: T): string {
  const payload: CliJsonSuccess<T> = {
    ok: true,
    error: false,
    command,
    generatedAt: new Date().toISOString(),
    data,
  }
  return JSON.stringify(payload, null, 2)
}

export function writeJsonSuccess<T>(command: string, data: T): void {
  process.stdout.write(`${toJsonSuccess(command, data)}\n`)
}
