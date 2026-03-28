# tailwind-styled CLI

CLI tooling for tailwind-styled v5 — setup, analyze, migrate, and more.

Part of the tailwind-styled-v5 ecosystem.

## Installation

```bash
# Global
npm install -g create-tailwind-styled

# OR use npx (recommended)
npx create-tailwind-styled my-project
```

## Quick Start

```bash
# Setup new project
tw setup

# Create project from template
tw create my-app

# Scan classes in workspace
tw scan

# Analyze class usage
tw analyze

# Migrate to v5
tw migrate --wizard
```

## Commands

### Project Setup
| Command | Description |
|---------|-------------|
| `tw setup` | Auto-setup project with framework choice |
| `tw create [name]` | Create project from template |
| `tw init [target]` | Initialize config files |

### Analysis
| Command | Description |
|---------|-------------|
| `tw scan [target]` | Scan all classes in workspace |
| `tw analyze [target]` | Analyze class usage patterns |
| `tw stats [target]` | Estimate CSS bundle stats |
| `tw extract [target]` | Suggest extraction candidates |

### Migration
| Command | Description |
|---------|-------------|
| `tw migrate [target]` | Migrate to v5 patterns |
| `tw preflight` | Environment preflight checks |

### Plugin
| Command | Description |
|---------|-------------|
| `tw plugin search [query]` | Search plugins |
| `tw plugin list` | List available plugins |
| `tw plugin install <name>` | Install plugin |

### Development
| Command | Description |
|---------|-------------|
| `tw dashboard` | Start dashboard server |
| `tw storybook` | Storybook helpers |
| `tw studio` | Open studio mode |

### Utility
| Command | Description |
|---------|-------------|
| `tw version` | Show CLI version |
| `tw upgrade` | Check/upgrade CLI version |
| `tw ai <prompt>` | AI script shortcut |

## Options

```bash
tw --json      # Output strict JSON
tw --debug     # Include stack traces
tw --verbose   # Verbose logs
```

## Examples

```bash
# Setup Next.js + React project
tw setup --next --react --yes

# Analyze with JSON output
tw analyze --json > analysis.json

# Migrate with dry-run
tw migrate --dry-run --wizard
```

## Troubleshooting

### "command not found: tw"
Make sure CLI is installed globally or use `npx tw`.

### Node version error
Make sure you're using Node.js >= 20.

## See Also

- [@tailwind-styled/core](https://www.npmjs.com/package/tailwind-styled-v4) - Core styling API
- [@tailwind-styled/next](https://www.npmjs.com/package/@tailwind-styled/next) - Next.js adapter
- [@tailwind-styled/vite](https://www.npmjs.com/package/@tailwind-styled/vite) - Vite plugin
