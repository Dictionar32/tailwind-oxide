import { coreCommands } from "./core"
import { createCommand } from "./create"
import { dashboardCommand } from "./dashboard"
import { deployCommand } from "./deploy"
import { miscCommands } from "./misc"
import { pluginCommand } from "./plugin"
import { preflightCommand } from "./preflight"
import { installRegistryCommand, registryCommand } from "./registry"
import { scriptCommands } from "./scriptCommands"
import { storybookCommand } from "./storybook"
import { studioCommand } from "./studio"
import { syncCommand } from "./sync"
import type { CommandContext, CommandDefinition } from "./types"

const unifiedCommands: CommandDefinition[] = [
  ...coreCommands,
  createCommand,
  pluginCommand,
  dashboardCommand,
  storybookCommand,
  studioCommand,
  registryCommand,
  installRegistryCommand,
  deployCommand,
  syncCommand,
  preflightCommand,
  ...miscCommands,
  ...scriptCommands,
]

function buildRegistry(commands: CommandDefinition[]): Map<string, CommandDefinition> {
  const map = new Map<string, CommandDefinition>()
  for (const command of commands) {
    map.set(command.name, command)
    for (const alias of command.aliases ?? []) {
      map.set(alias, command)
    }
  }
  return map
}

const commandRegistry = buildRegistry(unifiedCommands)

export async function runUnifiedCommand(
  command: string | undefined,
  args: string[],
  context: CommandContext
): Promise<boolean> {
  if (!command) return false
  const def = commandRegistry.get(command)
  if (!def) return false
  await def.run(args, context)
  return true
}
