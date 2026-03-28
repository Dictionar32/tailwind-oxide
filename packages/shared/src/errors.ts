/**
 * @tailwind-styled/shared — Unified Error Handling
 *
 * TwError provides a consistent error type across Rust native bindings,
 * Zod validation, compilation, and I/O boundaries.
 */

import type { ZodError } from "zod"

export type ErrorSource = "rust" | "validation" | "compile" | "io"

export class TwError extends Error {
  public readonly source: ErrorSource
  public readonly code: string
  public readonly cause?: unknown

  constructor(source: ErrorSource, code: string, message: string, cause?: unknown) {
    super(message)
    this.name = "TwError"
    this.source = source
    this.code = code
    this.cause = cause
  }

  static fromRust(err: { code: string; message: string }): TwError {
    return new TwError("rust", err.code, err.message, err)
  }

  static fromZod(err: ZodError): TwError {
    const issues = err.issues
    const first = issues?.[0]
    const path = first?.path?.join(".") ?? ""
    const message = path ? `${path}: ${first?.message}` : first?.message ?? "Schema validation failed"
    return new TwError("validation", "SCHEMA_VALIDATION_FAILED", message, err)
  }

  static fromIo(code: string, message: string, cause?: unknown): TwError {
    return new TwError("io", code, message, cause)
  }

  static fromCompile(code: string, message: string, cause?: unknown): TwError {
    return new TwError("compile", code, message, cause)
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      source: this.source,
      code: this.code,
      message: this.message,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    }
  }
}

export function isTwError(value: unknown): value is TwError {
  return value instanceof TwError
}

export function wrapUnknownError(source: ErrorSource, code: string, error: unknown): TwError {
  if (error instanceof TwError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new TwError(source, code, message, error)
}
