import { confirm, intro, isCancel } from "@clack/prompts"

import { CliUsageError } from "./utils/errors"

export interface MigrateWizardOptions {
  dryRun: boolean
  includeConfig: boolean
  includeClasses: boolean
  includeImports: boolean
}

export async function runMigrationWizard(): Promise<MigrateWizardOptions> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return {
      dryRun: true,
      includeConfig: true,
      includeClasses: true,
      includeImports: true,
    }
  }

  intro("Tailwind Styled v4 Migration Wizard")

  const dryRun = await confirm({
    message: "Gunakan dry-run?",
    initialValue: true,
  })
  const includeConfig = await confirm({
    message: "Migrasi file config dasar?",
    initialValue: true,
  })
  const includeClasses = await confirm({
    message: "Migrasi class lama (flex-grow/shrink)?",
    initialValue: true,
  })
  const includeImports = await confirm({
    message: "Migrasi import tailwind-styled-components -> tailwind-styled-v4?",
    initialValue: true,
  })

  if ([dryRun, includeConfig, includeClasses, includeImports].some((value) => isCancel(value))) {
    throw new CliUsageError("Migration wizard dibatalkan oleh pengguna")
  }

  return {
    dryRun: dryRun as boolean,
    includeConfig: includeConfig as boolean,
    includeClasses: includeClasses as boolean,
    includeImports: includeImports as boolean,
  }
}
