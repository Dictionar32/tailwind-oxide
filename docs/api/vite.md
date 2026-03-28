# Vite Plugin API — @tailwind-styled/vite

## `tailwindStyledPlugin(options?)`

Plugin Vite untuk integrasi scanner + compiler + engine.

### Options

```ts
interface VitePluginOptions {
  include?: RegExp        // Default: /\.(tsx|ts|jsx|js)$/
  exclude?: RegExp        // Default: /node_modules/
  scanDirs?: string[]     // Default: ['src']
  safelistOutput?: string // Default: '.tailwind-styled-safelist.json'
  generateSafelist?: boolean // Default: true
  scanReportOutput?: string  // Default: '.tailwind-styled-scan-report.json'
  useEngineBuild?: boolean   // Default: true — jalankan engine.build() di buildEnd
  // + semua TransformOptions dari @tailwind-styled/compiler
  mode?: 'zero-runtime' | 'runtime'
  addDataAttr?: boolean
  hoist?: boolean
  atomic?: boolean
  routeCss?: boolean
}
```

### Contoh

```ts
// vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tailwindStyledPlugin } from "@tailwind-styled/vite"

export default defineConfig({
  plugins: [
    react(),
    tailwindStyledPlugin({
      generateSafelist: true,
      useEngineBuild: true,
      scanReportOutput: ".tailwind-styled-scan-report.json",
    }),
  ],
})
```

### Hooks

| Hook | Perilaku |
|------|---------|
| `configResolved` | Set `root` dan `isDev` dari Vite config |
| `transform` | Jalankan `transformSource` per file `.tsx/.ts/.jsx/.js` |
| `buildEnd` | Generate safelist CSS + jalankan `engine.build()` (scan + report) |

### Output files

| File | Keterangan |
|------|-----------|
| `.tailwind-styled-safelist.json` | Daftar class untuk Tailwind safelist |
| `.tailwind-styled-scan-report.json` | Laporan scan workspace (jumlah file, unique classes, top classes) |
