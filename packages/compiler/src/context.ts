import type { TransformOptions, TransformResult } from "./astTransform"

export type CompileEngine = "none" | "native" | "js"

export interface CompileInput {
  filepath: string
  source: string
  options: TransformOptions
}

export class CompileContext {
  filepath: string
  source: string
  options: TransformOptions
  result: TransformResult | null
  done: boolean
  engine: CompileEngine

  constructor(input: CompileInput) {
    this.filepath = input.filepath
    this.source = input.source
    this.options = input.options
    this.result = null
    this.done = false
    this.engine = "none"
  }
}
