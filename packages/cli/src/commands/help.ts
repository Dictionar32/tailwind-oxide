interface HelpEntry {
  summary: string
  usage: string[]
  examples?: string[]
}

const HELP_ENTRIES: Record<string, HelpEntry> = {
  setup: {
    summary: "Auto-setup project (recommended)",
    usage: [
      "tw setup [--yes] [--next|--vite|--rspack|--react] [--dry-run] [--skip-install] [--json]",
    ],
    examples: ["tw setup --yes --next", "tw setup --dry-run --json"],
  },
  create: {
    summary: "Create project from template",
    usage: [
      "tw create <name> [--template=next-app|vite-react|vite-vue|vite-svelte|simple] [--yes] [--dry-run] [--json]",
    ],
    examples: ["tw create demo --template=simple --yes --dry-run --json"],
  },
  init: {
    summary: "Initialize tailwind-styled config files",
    usage: ["tw init [dir] [--json]"],
  },
  scan: {
    summary: "Scan classes in workspace",
    usage: ["tw scan [dir] [--json]"],
  },
  migrate: {
    summary: "Migrate project patterns to v4",
    usage: ["tw migrate [dir] [--dry-run|--wizard] [--json]"],
  },
  analyze: {
    summary: "Analyze class usage and frequent patterns",
    usage: ["tw analyze [dir] [--json]"],
  },
  stats: {
    summary: "Compute estimated CSS bundle stats",
    usage: ["tw stats [dir] [--json]"],
  },
  extract: {
    summary: "Suggest extraction candidates",
    usage: ["tw extract [dir] [--min=2] [--json]"],
  },
  preflight: {
    summary: "Environment preflight checks",
    usage: ["tw preflight [--fix] [--allow-fail] [--json]"],
  },
  plugin: {
    summary: "Plugin discovery and install",
    usage: ["tw plugin <search|list|install|verify|update-check|marketplace|publish> ... [--json]"],
    examples: ["tw plugin search animation --json", "tw plugin install @scope/plugin"],
  },
  deploy: {
    summary: "Publish package metadata to registry",
    usage: [
      "tw deploy [name] [--version=0.1.0] [--tag=latest] [--registry=URL] [--dry-run] [--json]",
    ],
  },
  registry: {
    summary: "Registry server utilities",
    usage: ["tw registry <serve|list|info|publish|install|versions> ... [--json]"],
    examples: ["tw registry serve --port=4040", "tw registry list --json"],
  },
  sync: {
    summary: "Design token sync commands",
    usage: ["tw sync <init|pull|push|diff|figma> ... [--json]"],
    examples: ["tw sync init --json", "tw sync pull --from=tokens.json"],
  },
  storybook: {
    summary: "Storybook helpers and variant matrix",
    usage: ["tw storybook [--port=6006] [--no-open]", "tw storybook --variants='{...}' [--json]"],
  },
  dashboard: {
    summary: "Start dashboard server",
    usage: ["tw dashboard [--port=3000]"],
  },
  studio: {
    summary: "Open studio mode",
    usage: ["tw studio [--project=.] [--port=3030] [--mode=web]"],
  },
  code: {
    summary: "VS Code extension helper",
    usage: ["tw code --docs", "tw code --install", "tw code --docs --json"],
  },
  test: {
    summary: "Test shortcut wrapper",
    usage: ["tw test [--watch]"],
  },
  ai: {
    summary: "AI script shortcut",
    usage: ['tw ai "describe component"'],
  },
  share: {
    summary: "Generate share payload template",
    usage: ["tw share <name> [--json]"],
  },
  parse: {
    summary: "Parse file (prototype)",
    usage: ["tw parse <file> [--json]"],
  },
  transform: {
    summary: "Transform file (prototype)",
    usage: ["tw transform <file> [out] [--output=out] [--json]"],
  },
  minify: {
    summary: "Minify file (prototype)",
    usage: ["tw minify <file> [--json]"],
  },
  shake: {
    summary: "Shake CSS rules (prototype)",
    usage: ["tw shake <cssFile> [--json]"],
  },
  lint: {
    summary: "Parallel lint helper (prototype)",
    usage: ["tw lint [dir] [workers] [--json]"],
  },
  format: {
    summary: "Format helper (prototype)",
    usage: ["tw format <file> [--write] [--json]"],
  },
  benchmark: {
    summary: "Write benchmark snapshot",
    usage: ["tw benchmark [--json]"],
  },
  optimize: {
    summary: "Compile-time optimize helper (prototype)",
    usage: ["tw optimize <file> [--constant-folding] [--partial-eval] [--json]"],
  },
  split: {
    summary: "Route-based CSS split helper (prototype)",
    usage: ["tw split [root] [outDir] [--output=outDir] [--json]"],
  },
  critical: {
    summary: "Critical CSS extraction (prototype)",
    usage: ["tw critical <html> <css> [--json]"],
  },
  cache: {
    summary: "Remote cache controls (prototype)",
    usage: ["tw cache <enable|status> [arg] [--json]"],
  },
  cluster: {
    summary: "Distributed cluster helper (prototype)",
    usage: ["tw cluster <init|build> [n] [--json]"],
  },
  "cluster-server": {
    summary: "Cluster server (long-running)",
    usage: ["tw cluster-server ..."],
  },
  adopt: {
    summary: "Incremental adoption helper (prototype)",
    usage: ["tw adopt <feature> [project] [--json]"],
  },
  metrics: {
    summary: "Metrics server (long-running)",
    usage: ["tw metrics [port]"],
  },
  audit: {
    summary: "Project audit helper",
    usage: ["tw audit [--json]"],
  },
  version: {
    summary: "Show CLI version",
    usage: ["tw version [--check] [--json]"],
  },
  upgrade: {
    summary: "Check/upgrade CLI version",
    usage: ["tw upgrade [--install] [--json]"],
  },
  help: {
    summary: "Show global or command help",
    usage: ["tw help", "tw help <command>", "tw <command> --help"],
  },
}

const HELP_COMMAND_ORDER = [
  "setup",
  "create",
  "init",
  "scan",
  "migrate",
  "analyze",
  "stats",
  "extract",
  "preflight",
  "plugin",
  "deploy",
  "registry",
  "sync",
  "storybook",
  "dashboard",
  "studio",
  "code",
  "version",
  "upgrade",
  "help",
]

function commandSummaryRows(): string[] {
  const width = 30
  return HELP_COMMAND_ORDER.map((name) => {
    const summary = HELP_ENTRIES[name]?.summary ?? "No summary"
    const padded = `tw ${name}`.padEnd(width)
    return `  ${padded}${summary}`
  })
}

function normalizeHelpCommandName(commandName: string): string {
  if (commandName === "v") return "version"
  if (commandName === "update") return "upgrade"
  return commandName
}

function renderCommandHelp(commandName: string): string {
  const normalized = normalizeHelpCommandName(commandName)
  const entry = HELP_ENTRIES[normalized]
  if (!entry) {
    return `Unknown help topic: ${commandName}\n\n${renderGlobalHelp()}`
  }

  const usageBlock = entry.usage.map((line) => `  ${line}`).join("\n")
  const examplesBlock =
    entry.examples && entry.examples.length > 0
      ? `\n\nExamples:\n${entry.examples.map((line) => `  ${line}`).join("\n")}`
      : ""

  return `tailwind-styled-v4 CLI (tw)

Command: ${normalized}
${entry.summary}

Usage:
${usageBlock}${examplesBlock}
`
}

function renderGlobalHelp(): string {
  return `tailwind-styled-v4 CLI (tw)

Usage:
  tw <command> [options]
  tw help <command>

Global options:
  --json           Output strict JSON envelope
  --debug          Include stack traces for errors
  --verbose        Verbose runtime logs (writes to stderr)
  -h, --help       Show help

Core commands:
${commandSummaryRows().join("\n")}

Tip:
  Run \`tw help <command>\` for detailed usage and examples.
`
}

export function renderHelp(commandName?: string): string {
  if (commandName && commandName.trim().length > 0) {
    return renderCommandHelp(commandName.trim())
  }
  return renderGlobalHelp()
}

export const HELP_TEXT = renderHelp()
