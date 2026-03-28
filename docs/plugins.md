# Plugins

## Vite Plugin

```ts
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

## Rspack Plugin

```ts
import { tailwindStyledRspackPlugin } from "@tailwind-styled/rspack"

export default {
  plugins: [tailwindStyledRspackPlugin()],
}
```

## Next.js Plugin

```ts
// next.config.ts
import { withTailwindStyled } from "tailwind-styled-v4/next"

export default withTailwindStyled({
  routeCss: true,           // CSS splitting per route (production)
  deadStyleElimination: true,
  staticVariants: true,
  devtools: true,           // DevTools overlay di development
})(nextConfig)
```

## Engine plugins

Plugin engine memungkinkan hook ke lifecycle scan/build/watch:

```ts
import { createEngine } from "@tailwind-styled/engine"

const engine = await createEngine({
  root: process.cwd(),
  plugins: [
    {
      name: "my-plugin",
      beforeScan(ctx) { console.log("scanning...") },
      transformClasses(classes) {
        // Filter atau tambah classes
        return classes.filter(c => !c.startsWith("debug-"))
      },
      afterBuild(result) {
        console.log(`built: ${result.mergedClassList.split(" ").length} classes`)
      },
    },
  ],
})
```

Plugin hooks: `beforeScan`, `afterScan`, `transformClasses`, `beforeBuild`, `afterBuild`, `onError`

## Object Config Transform Hook

Plugin package `@tailwind-styled/plugin` sekarang bisa memodifikasi konfigurasi `tw.tag({ ... })`
sebelum compiler menghasilkan kode.

```ts
import { use, type TwPlugin } from "@tailwind-styled/plugin"

const brandVariantPlugin: TwPlugin = {
  name: "brand-variant-plugin",
  setup(ctx) {
    ctx.addTransform((config, meta) => {
      if (meta.tag !== "button") return config
      return {
        ...config,
        variants: {
          ...config.variants,
          brand: {
            primary: "bg-blue-600 text-white",
            secondary: "bg-gray-200 text-gray-800",
          },
        },
        defaultVariants: {
          ...config.defaultVariants,
          brand: "primary",
        },
      }
    })
  },
}

use(brandVariantPlugin)
```

## Plugin registry

```bash
tw plugin search animation      # cari plugin
tw plugin info @tailwind-styled/plugin-animation  # detail plugin
tw plugin install @tailwind-styled/plugin-animation  # install
```

Lihat [docs/plugin-registry.md](plugin-registry.md) untuk dokumentasi lengkap.
