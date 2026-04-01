export { runAnalyzeCli } from "./analyze"
export { runDoctorCli } from "./commands/doctor"
export { buildMainProgram } from "./commands/program"
export { runTraceCli } from "./commands/trace"
export type { CommandContext, CommandDefinition } from "./commands/types"
export { runWhyCli } from "./commands/why"
export { buildCreateProgram, main as runCreateCli } from "./createApp"
export { runExtractCli } from "./extract"
export { runInitCli } from "./init"
export { runMigrateCli } from "./migrate"
export { runPreflightCli } from "./preflight"
export { runScanCli } from "./scan"
export { runSetupCli } from "./setup"
export { runStatsCli } from "./stats"
export {
  type DiagnosticCheck,
  type DiagnosticInclude,
  type DiagnosticIssue,
  type DiagnosticResult,
  runDiagnostics,
  SUPPORTED_DIAGNOSTIC_INCLUDES,
} from "./utils/doctorService"
export { createCliOutput } from "./utils/output"
export { resolveCommandHelp, runCliMain } from "./utils/runtime"
export { type TraceOptions, type TraceResult, traceClass } from "./utils/traceService"
export {
  type TraceImport,
  type TraceTargetFileSummary,
  type TraceTargetOptions,
  type TraceTargetResult,
  traceTarget,
} from "./utils/traceTargetService"
export { type WhyResult, whyClass } from "./utils/whyService"

// Re-export shared trace utilities for consumption by CLI users
export type { TraceSnapshot, TraceSummary } from "@tailwind-styled/shared"
export {
  getHealthColor,
  getModeColor,
  formatMemory,
  formatDuration,
  calculateHealth,
  getBuildTimeColor,
  getMemoryColor,
  createTraceSnapshot,
  getPipelinePercentages,
} from "@tailwind-styled/shared"
