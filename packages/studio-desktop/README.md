# @tailwind-styled/studio-desktop

Electron-based desktop application for tailwind-styled Studio.

## Prerequisites

- Node.js >= 20.0.0
- npm or pnpm
- Platform-specific build tools:
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: build-essential, libgtk-3-dev

## Installation

```bash
npm install
```

## Development

```bash
# Start in development mode
npm run dev

# Start in production mode
npm run start
```

The app will launch a window connecting to the studio server running locally.

## Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux

# Build for all platforms
npm run build:all
```

## Package Distribution

```bash
# Create distributable packages
npm run package:mac
npm run package:win
npm run package:linux

# Create packages for all platforms
npm run package:all
```

## Architecture

The desktop app wraps the web-based studio (`scripts/v45/studio.mjs`) in an Electron window:

- **Main process** (`src/main.js`): Spawns the studio server and manages BrowserWindow
- **Preload** (`src/preload.js`): Secure IPC bridge to renderer
- **Auto-updater** (`src/updater.js`): GitHub Releases-based updates via electron-updater

## Features

- Native file picker for opening project folders
- System tray integration
- Auto-reload when files change
- Native menu bar with keyboard shortcuts
- Auto-update via GitHub Releases
- IPC-based engine integration (scan, build, watch)

## Engine Integration

The desktop app communicates with `@tailwind-styled/engine` via IPC:

- `engine-scan`: Scan project for CSS classes
- `engine-build`: Build CSS output
- `engine-watch-start` / `engine-watch-stop`: File watching

Events from the engine are forwarded to the renderer process.

## Auto-Update

The app uses `electron-updater` with GitHub Releases. Configure in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "tailwind-styled-v5"
    }
  }
}
```

## License

MIT
