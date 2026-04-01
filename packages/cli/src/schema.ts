import { z } from "zod"

// --- ParsedCliInput (CLI argument boundary) ---
export const ParsedCliInputSchema = z.object({
  argv: z.array(z.string()),
  command: z.string().optional(),
  restArgs: z.array(z.string()),
  json: z.boolean(),
  debug: z.boolean(),
  verbose: z.boolean(),
  help: z.boolean(),
  helpCommand: z.string().optional(),
})
export type ParsedCliInputValidated = z.infer<typeof ParsedCliInputSchema>

// --- CommandContext (passed to all commands) ---
export const CommandContextSchema = z.object({
  runtimeDir: z.string().min(1),
  json: z.boolean(),
  debug: z.boolean(),
  verbose: z.boolean(),
  cwd: z.string().min(1),
})
export type CommandContextValidated = z.infer<typeof CommandContextSchema>

// --- Config file schema (tailwind-styled.config.json) ---
export const TailwindStyledConfigSchema = z
  .object({
    version: z.number().int().min(1).optional(),
    compiler: z
      .object({
        engine: z.enum(["rust", "js", "none"]).optional(),
      })
      .optional(),
    css: z
      .object({
        entry: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()
export type TailwindStyledConfigValidated = z.infer<typeof TailwindStyledConfigSchema>

// --- Validation helpers ---
export function validateCliArgs(input: unknown): ParsedCliInputValidated {
  return ParsedCliInputSchema.parse(input)
}

export function validateConfig(input: unknown): TailwindStyledConfigValidated {
  return TailwindStyledConfigSchema.parse(input)
}
