# @tailwind-styled/rspack

Rspack adapter for tailwind-styled-v4 — loader + plugin

## Installation

```bash
npm install @tailwind-styled/rspack
# or
pnpm add @tailwind-styled/rspack
# or
yarn add @tailwind-styled/rspack
```

## Requirements

- Node.js >= 18
- Rspack >= 1.0

## Basic Usage

Create a `rspack.config.js` file:

```javascript
const { rspack } = require('@rspack/core');
const { tailwindStyledRspack } = require('@tailwind-styled/rspack');

module.exports = {
  plugins: [
    tailwindStyledRspack(),
  ],
  module: {
    rules: [
      {
        test: /\.(tsx|ts|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: '@tailwind-styled/rspack/loader',
        },
      },
    ],
  },
};
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | `string \| string[]` | `undefined` | Glob patterns to include |
| `exclude` | `string \| string[]` | `undefined` | Glob patterns to exclude |
| `addDataAttr` | `boolean` | `false` | Add data-attributes for debugging |
| `analyze` | `boolean` | `false` | Enable bundle analysis |

```javascript
tailwindStyledRspack({
  include: ['./src/**/*'],
  exclude: ['./node_modules/**/*'],
  addDataAttr: true,
  analyze: true,
})
```

## v5 Notes: Zero-Runtime Mode

In v5, the plugin works in **zero-runtime mode**, meaning there is **no fallback JS** bundle injected. The styling is extracted at build time.

This provides:
- Smaller bundle sizes
- Better performance
- No runtime overhead

## Example Configuration

```javascript
const { rspack } = require('@rspack/core');
const { tailwindStyledRspack } = require('@tailwind-styled/rspack');

/** @type {import('@rspack/cli').Configuration} */
module.exports = {
  entry: './src/index.js',
  output: {
    path: './dist',
    filename: 'bundle.js',
  },
  plugins: [
    tailwindStyledRspack({
      addDataAttr: true,
      analyze: process.env.NODE_ENV === 'development',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(tsx|ts|js|jsx)$/,
        use: {
          loader: '@tailwind-styled/rspack/loader',
        },
      },
    ],
  },
};
```
