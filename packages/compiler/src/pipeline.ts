export type PipelineStep<T> = (ctx: T) => void

export class Pipeline<T extends { done?: boolean }> {
  private steps: PipelineStep<T>[] = []

  use(step: PipelineStep<T>): this {
    this.steps.push(step)
    return this
  }

  run(ctx: T): T {
    for (const step of this.steps) {
      step(ctx)
      if (ctx.done) break
    }
    return ctx
  }
}
