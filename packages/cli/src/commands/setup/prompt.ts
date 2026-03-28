import { isCancel, select } from "@clack/prompts"

import { CliUsageError } from "../../utils/errors"
import type { ProjectType, SetupFlags, SetupProjectOption } from "./workspace"

interface PromptOptions {
  output?: NodeJS.WritableStream
  log?: (message: string) => void
}

export async function pickProjectTypeInteractive(
  detected: ProjectType | null,
  flags: SetupFlags,
  projectOptions: SetupProjectOption[],
  options: PromptOptions = {}
): Promise<ProjectType> {
  const log = options.log ?? console.log

  if (flags.explicitProjectType) {
    const label =
      projectOptions.find((option) => option.value === flags.explicitProjectType)?.label ??
      flags.explicitProjectType
    log(`  Project type dipaksa via flag: ${label}\n`)
    return flags.explicitProjectType
  }

  if (flags.isYes) {
    const selected = detected ?? "next"
    const label = projectOptions.find((option) => option.value === selected)?.label ?? selected
    log(`  --yes aktif, pilih default: ${label}\n`)
    return selected
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    const selected = detected ?? "next"
    const label = projectOptions.find((option) => option.value === selected)?.label ?? selected
    log(`  Non-interactive shell terdeteksi, pilih default: ${label}\n`)
    return selected
  }

  log("  Pilih project type:\n")
  projectOptions.forEach((option, index) => {
    const mark = detected === option.value ? " <- terdeteksi" : ""
    log(`    ${index + 1}. ${option.label}${mark}`)
  })
  log("")

  const defaultIdx = detected ? projectOptions.findIndex((option) => option.value === detected) : 0
  const selected = await select<ProjectType>({
    message: "Project type",
    initialValue: projectOptions[defaultIdx].value,
    options: projectOptions.map((option) => ({
      value: option.value,
      label: option.label,
      hint: detected === option.value ? "terdeteksi" : undefined,
    })),
  })

  if (isCancel(selected)) {
    throw new CliUsageError("Prompt dibatalkan oleh pengguna")
  }

  const selectedLabel =
    projectOptions.find((option) => option.value === selected)?.label ?? selected
  log(`\n  -> ${selectedLabel} dipilih.\n`)
  return selected
}
