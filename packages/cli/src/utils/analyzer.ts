import type { AnalyzerReport } from "@tailwind-styled/analyzer"

import { CliError } from "./errors"

export interface AnalyzerModule {
  analyzeWorkspace: (
    dir: string,
    options?: {
      classStats?: {
        top?: number
        frequentThreshold?: number
      }
    }
  ) => Promise<AnalyzerReport>
}

export async function loadAnalyzerModule(): Promise<AnalyzerModule> {
  try {
    const mod = await import("@tailwind-styled/analyzer")
    if (typeof mod.analyzeWorkspace !== "function") {
      throw new Error("analyzeWorkspace export not found")
    }
    return {
      analyzeWorkspace: mod.analyzeWorkspace as AnalyzerModule["analyzeWorkspace"],
    }
  } catch (error) {
    throw new CliError(
      "Native analyzer binding is unavailable. Reinstall dependencies or run `npm rebuild @tailwind-styled/analyzer`.",
      {
        code: "ANALYZER_BINDING_UNAVAILABLE",
        cause: error,
      }
    )
  }
}
