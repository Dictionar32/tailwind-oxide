import { runAnalyzeCli } from "../analyze"
import { runExtractCli } from "../extract"
import { runInitCli } from "../init"
import { runMigrateCli } from "../migrate"
import { runScanCli } from "../scan"
import { runSetupCli } from "../setup"
import { runStatsCli } from "../stats"
import { ensureFlag } from "../utils/args"
import { runDoctorCli } from "./doctor"
import { runTraceCli } from "./trace"
import type { CommandDefinition } from "./types"

function withGlobalJson(args: string[], enabled: boolean): string[] {
  if (!enabled) return args
  return ensureFlag("json", args)
}

const setupCommand: CommandDefinition = {
  name: "setup",
  async run(args, context) {
    await runSetupCli(withGlobalJson(args, context.json))
  },
}

const initCommand: CommandDefinition = {
  name: "init",
  async run(args, context) {
    await runInitCli(withGlobalJson(args, context.json))
  },
}

const scanCommand: CommandDefinition = {
  name: "scan",
  async run(args, context) {
    await runScanCli(withGlobalJson(args, context.json))
  },
}

const migrateCommand: CommandDefinition = {
  name: "migrate",
  async run(args, context) {
    await runMigrateCli(withGlobalJson(args, context.json))
  },
}

const analyzeCommand: CommandDefinition = {
  name: "analyze",
  async run(args, context) {
    await runAnalyzeCli(withGlobalJson(args, context.json))
  },
}

const statsCommand: CommandDefinition = {
  name: "stats",
  async run(args, context) {
    await runStatsCli(withGlobalJson(args, context.json))
  },
}

const extractCommand: CommandDefinition = {
  name: "extract",
  async run(args, context) {
    await runExtractCli(withGlobalJson(args, context.json))
  },
}

const traceCommand: CommandDefinition = {
  name: "trace",
  aliases: ["t"],
  async run(args, context) {
    await runTraceCli(args, context)
  },
}

const doctorCommand: CommandDefinition = {
  name: "doctor",
  aliases: ["d", "diagnose"],
  async run(args, context) {
    await runDoctorCli(args, context)
  },
}

export const coreCommands: CommandDefinition[] = [
  setupCommand,
  initCommand,
  scanCommand,
  migrateCommand,
  analyzeCommand,
  statsCommand,
  extractCommand,
  traceCommand,
  doctorCommand,
]
