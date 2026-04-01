import { type ChildProcess, spawn } from "node:child_process"
import { DEFAULT_TIMEOUT } from "../constants"

interface ExecOptions {
  timeout?: number
  cwd?: string
  env?: Record<string, string>
}

interface ExecResult {
  stdout: string
  stderr: string
  code: number
}

const activeProcesses: Set<ChildProcess> = new Set()

export function execScript(
  scriptPath: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  const cwd = options.cwd ?? process.cwd()
  const env = { ...process.env, ...options.env }

  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    })

    activeProcesses.add(proc)

    const io = { stdout: "", stderr: "", timedOut: false }

    const timer = setTimeout(() => {
      io.timedOut = true
      proc.kill("SIGTERM")
    }, timeout)

    proc.stdout?.on("data", (data: Buffer) => {
      io.stdout += data.toString()
    })

    proc.stderr?.on("data", (data: Buffer) => {
      io.stderr += data.toString()
    })

    proc.on("close", (code) => {
      clearTimeout(timer)
      activeProcesses.delete(proc)

      if (io.timedOut) {
        resolve({ stdout: io.stdout, stderr: `Script timed out after ${timeout}ms`, code: 124 })
      } else if (code !== 0) {
        resolve({ stdout: io.stdout, stderr: io.stderr, code: code ?? 1 })
      } else {
        resolve({ stdout: io.stdout, stderr: io.stderr, code: 0 })
      }
    })

    proc.on("error", (err) => {
      clearTimeout(timer)
      activeProcesses.delete(proc)
      resolve({ stdout: "", stderr: `Failed to spawn: ${err.message}`, code: 1 })
    })
  })
}

export function killAllProcesses(): void {
  for (const proc of activeProcesses) {
    try {
      proc.kill("SIGTERM")
    } catch {
      // ignore
    }
  }
  activeProcesses.clear()
}

export function registerProcess(proc: ChildProcess): void {
  activeProcesses.add(proc)
}

export function unregisterProcess(proc: ChildProcess): void {
  activeProcesses.delete(proc)
}
