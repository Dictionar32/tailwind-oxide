# @tailwind-styled/plugin-registry

Plugin discovery and install helper for the tailwind-styled v5 ecosystem.

## Installation

```bash
npm install @tailwind-styled/plugin-registry
```

Or use the CLI directly:

```bash
npx @tailwind-styled/plugin-registry <command>
```

## CLI Commands

### search

Search for plugins in the registry.

```bash
tw-plugin search <query> [--json]
```

### list

List all available plugins.

```bash
tw-plugin list [--json]
```

### info

Get detailed information about a specific plugin.

```bash
tw-plugin info <package> [--json]
```

### install

Install a plugin.

```bash
tw-plugin install <package> [--dry-run] [--allow-external] [--yes]
```

### uninstall

Uninstall a plugin.

```bash
tw-plugin uninstall <package> [--dry-run]
```

### update-check

Check for available updates for installed plugins.

```bash
tw-plugin update-check [--json]
```

### verify

Verify the integrity of an installed plugin.

```bash
tw-plugin verify <package> [--json]
```

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON (machine-readable) |
| `--debug` | Show timing and execution details |
| `--registry` | Use external registry URL |

## Programmatic API

### PluginRegistry Class

```typescript
import { PluginRegistry, getRegistry } from "@tailwind-styled/plugin-registry"
```

#### Constructor

```typescript
new PluginRegistry(registryData?: RegistryData, options?: RegistryOptions)
```

#### Static Methods

```typescript
// Load registry from a custom URL
await PluginRegistry.loadFromUrl(url: string): Promise<PluginRegistry>
```

#### Instance Methods

```typescript
// Get registry version
getVersion(): string

// Search plugins by query (matches name, description, or tags)
search(query: string): PluginInfo[]

// Get all plugins
getAll(): PluginInfo[]

// Get plugin by name
getByName(pluginName: string): PluginInfo | undefined

// Install a plugin
install(pluginName: string, options?: InstallOptions): InstallResult

// Uninstall a plugin
uninstall(pluginName: string, options?: { dryRun?: boolean; npmBin?: string }): { plugin: string; uninstalled: boolean; command: string; exitCode: number }

// Verify plugin integrity
verifyIntegrity(pluginName: string): { ok: boolean; reason?: string }

// Check for update on a specific plugin
checkForUpdate(pluginName: string): { hasUpdate: boolean; current?: string; latest?: string; error?: string }

// Check all plugins for updates
checkAllUpdates(): Array<{ name: string; hasUpdate: boolean; current?: string; latest?: string; error?: string }>
```

#### Types

```typescript
interface PluginInfo {
  name: string
  description: string
  version: string
  tags: string[]
  official?: boolean
  docs?: string
  install?: string
  integrity?: string
}

interface InstallOptions {
  dryRun?: boolean
  npmBin?: string
  allowExternal?: boolean
  confirmExternal?: boolean
}

interface InstallResult {
  plugin: string
  installed: boolean
  command: string
  exitCode: number
}
```

#### Error Handling

```typescript
import { PluginRegistryError } from "@tailwind-styled/plugin-registry"

try {
  registry.install("some-plugin")
} catch (error) {
  if (error instanceof PluginRegistryError) {
    console.error(error.code)    // Error code
    console.error(error.message) // Error message
    console.error(error.context) // Additional context
  }
}
```

### getRegistry

Get the default registry instance.

```typescript
import { getRegistry } from "@tailwind-styled/plugin-registry"

const registry = getRegistry()
```

## Examples

### CLI Examples

```bash
# Search for plugins
tw-plugin search forms

# List all plugins
tw-plugin list

# Get plugin info
tw-plugin info @tailwind-styled/plugin-forms

# Install a plugin
tw-plugin install @tailwind-styled/plugin-forms

# Dry run install
tw-plugin install @tailwind-styled/plugin-forms --dry-run

# Uninstall a plugin
tw-plugin uninstall @tailwind-styled/plugin-forms

# Check for updates
tw-plugin update-check

# Verify plugin integrity
tw-plugin verify @tailwind-styled/plugin-forms

# Use JSON output
tw-plugin list --json

# Use custom registry
tw-plugin list --registry https://example.com/registry.json
```

### Programmatic Examples

```typescript
import { getRegistry, PluginRegistry } from "@tailwind-styled/plugin-registry"

// Get default registry
const registry = getRegistry()

// Search for plugins
const results = registry.search("forms")
console.log(results)

// Get all plugins
const allPlugins = registry.getAll()

// Get plugin info
const plugin = registry.getByName("@tailwind-styled/plugin-forms")
if (plugin) {
  console.log(`Found ${plugin.name} v${plugin.version}`)
  console.log(plugin.description)
}

// Install a plugin
const result = registry.install("@tailwind-styled/plugin-forms", {
  dryRun: true // Check what would happen
})
console.log(result.command) // The npm command that would be run

// Check for updates
const updates = registry.checkAllUpdates()
const updatesAvailable = updates.filter(u => u.hasUpdate)
console.log(`${updatesAvailable.length} plugins have updates`)

// Verify integrity
const verification = registry.verifyIntegrity("@tailwind-styled/plugin-forms")
if (verification.ok) {
  console.log("Plugin integrity verified")
} else {
  console.error(verification.reason)
}

// Load from custom registry
const customRegistry = await PluginRegistry.loadFromUrl(
  "https://example.com/registry.json"
)
```

## License

MIT