import { spawn } from "node:child_process"

import { CliError } from "./errors"
import { writeJsonSuccess } from "./json"

export interface RunCommandOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  stdio?: "inherit" | "pipe"
  allowNonZeroExit?: boolean
  verbose?: boolean
}

export interface RunCommandCaptureOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  allowNonZeroExit?: boolean
  verbose?: boolean
}

export interface RunCommandCaptureResult {
  exitCode: number
  stdout: string
  stderr: string
}

export type CommandOutputFormat = "json" | "text" | "empty"

export interface ParsedCommandOutput {
  outputFormat: CommandOutputFormat
  output: unknown | string | null
}

export const npmCommandName = (): string => {
  return process.platform === "win32" ? "npm.cmd" : "npm"
}

export const npxCommandName = (): string => {
  return process.platform === "win32" ? "npx.cmd" : "npx"
}

export const codeCommandName = (): string => {
  return process.platform === "win32" ? "code.cmd" : "code"
}

const shellQuote = (value: string): string => {
  if (value.length === 0) return '""'
  if (!/[^\w./:=@-]/.test(value)) return value
  return JSON.stringify(value)
}

const formatCommand = (binary: string, args: string[]): string => {
  return [binary, ...args].map(shellQuote).join(" ")
}

const isVerboseEnabled = (options: { verbose?: boolean; env?: NodeJS.ProcessEnv }): boolean => {
  if (options.verbose) return true
  if (options.env?.TWS_VERBOSE === "1") return true
  return process.env.TWS_VERBOSE === "1"
}

const writeVerboseLine = (binary: string, args: string[]): void => {
  console.error(`  [verbose] $ ${formatCommand(binary, args)}`)
}

export const runCommand = async (
  binary: string,
  args: string[],
  options: RunCommandOptions = {}
): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    if (isVerboseEnabled(options)) {
      writeVerboseLine(binary, args)
    }

    const child = spawn(binary, args, {
      stdio: options.stdio ?? "inherit",
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
    })

    child.on("error", (error) => {
      reject(
        new CliError(`Failed to run command: ${binary} ${args.join(" ")}`, {
          cause: error,
        })
      )
    })

    child.on("exit", (code) => {
      const exitCode = code ?? 0
      if (exitCode !== 0 && !options.allowNonZeroExit) {
        reject(
          new CliError(`Command exited with code ${exitCode}: ${binary} ${args.join(" ")}`, {
            exitCode,
            code: "COMMAND_EXIT_NON_ZERO",
          })
        )
        return
      }
      resolve(exitCode)
    })
  })
}

const parseCommandOutput = (stdout: string): ParsedCommandOutput => {
  const trimmed = stdout.trim()
  if (!trimmed) {
    return { outputFormat: "empty", output: null }
  }

  try {
    return {
      outputFormat: "json",
      output: JSON.parse(trimmed) as unknown,
    }
  } catch {
    return {
      outputFormat: "text",
      output: stdout.trimEnd(),
    }
  }
}

const formatCommandFailureOutput = (stdout: string, stderr: string): string => {
  const errorText = stderr.trim()
  if (errorText) return errorText
  const outputText = stdout.trim()
  if (outputText) return outputText
  return "Command failed with no output."
}

export const runCommandCapture = async (
  binary: string,
  args: string[],
  options: RunCommandCaptureOptions = {}
): Promise<RunCommandCaptureResult> => {
  return new Promise<RunCommandCaptureResult>((resolve, reject) => {
    if (isVerboseEnabled(options)) {
      writeVerboseLine(binary, args)
    }

    const child = spawn(binary, args, {
      stdio: "pipe",
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
    })

    const chunks: { stdout: Buffer[]; stderr: Buffer[] } = {
      stdout: [],
      stderr: [],
    }

    child.stdout?.on("data", (chunk: Buffer | string) => {
      chunks.stdout.push(Buffer.from(chunk))
    })

    child.stderr?.on("data", (chunk: Buffer | string) => {
      chunks.stderr.push(Buffer.from(chunk))
    })

    child.on("error", (error) => {
      reject(
        new CliError(`Failed to run command: ${binary} ${args.join(" ")}`, {
          cause: error,
        })
      )
    })

    child.on("exit", (code) => {
      const exitCode = code ?? 0
      const stdout = Buffer.concat(chunks.stdout).toString("utf8")
      const stderr = Buffer.concat(chunks.stderr).toString("utf8")

      if (exitCode !== 0 && !options.allowNonZeroExit) {
        reject(
          new CliError(
            `Command exited with code ${exitCode}: ${binary} ${args.join(" ")}\n${formatCommandFailureOutput(stdout, stderr)}`,
            {
              exitCode,
              code: "COMMAND_EXIT_NON_ZERO",
            }
          )
        )
        return
      }

      resolve({
        exitCode,
        stdout,
        stderr,
      })
    })
  })
}

export const runCommandAsJson = async (
  command: string,
  binary: string,
  args: string[],
  options: RunCommandCaptureOptions = {}
): Promise<void> => {
  const captured = await runCommandCapture(binary, args, options)
  const parsed = parseCommandOutput(captured.stdout)

  writeJsonSuccess(command, {
    exitCode: captured.exitCode,
    outputFormat: parsed.outputFormat,
    output: parsed.output,
    stderr: captured.stderr.trim() || null,
  })
}
