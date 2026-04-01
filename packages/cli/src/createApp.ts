#!/usr/bin/env node

import path from "node:path"
import { isCancel, select, text } from "@clack/prompts"
import { Command } from "commander"

import type { CommandContext } from "./commands/types"
import { CliUsageError } from "./utils/errors"
import { pathExists, writeFileSafe } from "./utils/fs"
import { runCliMain } from "./utils/runtime"

const TEMPLATE_NAMES = ["next-app", "vite-react", "vite-vue", "vite-svelte", "simple"] as const

type TemplateName = (typeof TEMPLATE_NAMES)[number]

interface CreateCliOptions {
  name?: string
  template?: string
  yes: boolean
  dryRun: boolean
}

interface CreateContext {
  projectDir: string
  name: string
  dryRun: boolean
  writtenFiles: string[]
}

interface CreateReport {
  name: string
  template: TemplateName
  projectDir: string
  dryRun: boolean
  filesCreated: number
  files: string[]
}

type TemplateHandler = (context: CreateContext) => Promise<void>

const TEMPLATES: Record<TemplateName, TemplateHandler> = {
  "next-app": createNextApp,
  "vite-react": createViteReactApp,
  "vite-vue": createViteVueApp,
  "vite-svelte": createViteSvelteApp,
  simple: createSimpleApp,
}

function isTemplateName(value: string): value is TemplateName {
  return TEMPLATE_NAMES.includes(value as TemplateName)
}

function isInteractiveSession(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

async function resolveCreateInput(options: CreateCliOptions): Promise<{
  name: string
  template: TemplateName
}> {
  const interactive = isInteractiveSession()
  const resolvedName = options.name
    ? options.name
    : options.yes || !interactive
      ? "my-app"
      : await text({
          message: "Project name",
          defaultValue: "my-app",
          placeholder: "my-app",
        })

  if (isCancel(resolvedName)) {
    throw new CliUsageError("Create prompt dibatalkan oleh pengguna")
  }

  const pickedTemplate = options.template
    ? options.template
    : options.yes || !interactive
      ? "next-app"
      : await select<TemplateName>({
          message: "Template",
          initialValue: "next-app",
          options: TEMPLATE_NAMES.map((template) => ({
            value: template,
            label: template,
          })),
        })

  if (isCancel(pickedTemplate)) {
    throw new CliUsageError("Create prompt dibatalkan oleh pengguna")
  }

  const templateValue = pickedTemplate

  if (!isTemplateName(templateValue)) {
    throw new CliUsageError(
      `Unknown template: ${templateValue}. Valid templates: ${TEMPLATE_NAMES.join(", ")}`
    )
  }

  return { name: resolvedName, template: templateValue }
}

async function writeProjectFile(
  context: CreateContext,
  relativePath: string,
  content: string
): Promise<void> {
  const filePath = path.join(context.projectDir, relativePath)
  await writeFileSafe(filePath, content, { dryRun: context.dryRun })
  context.writtenFiles.push(relativePath.replaceAll("\\", "/"))
}

async function createNextApp(context: CreateContext): Promise<void> {
  await writeProjectFile(
    context,
    "package.json",
    `${JSON.stringify(
      {
        name: context.name,
        version: "0.1.0",
        private: true,
        scripts: { dev: "next dev --turbopack", build: "next build", start: "next start" },
        dependencies: {
          next: "^15",
          react: "^19",
          "react-dom": "^19",
          "tailwind-styled-v4": "^5.0.0",
          "@tailwind-styled/next": "^5.0.0",
        },
        devDependencies: {
          tailwindcss: "^4",
          typescript: "^5",
          "@types/react": "^19",
          "@types/node": "^20",
        },
      },
      null,
      2
    )}\n`
  )

  await writeProjectFile(
    context,
    "next.config.ts",
    `import type { NextConfig } from "next"
import { withTailwindStyled } from "@tailwind-styled/next"

const nextConfig: NextConfig = {}
export default withTailwindStyled()(nextConfig)
`
  )

  await writeProjectFile(context, "src/app/globals.css", '@import "tailwindcss";\n')
  await writeProjectFile(
    context,
    "src/app/layout.tsx",
    `import "./globals.css"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
`
  )

  await writeProjectFile(
    context,
    "src/app/page.tsx",
    `import { tw } from "tailwind-styled-v4"

const Page = tw.main\`min-h-screen grid place-items-center bg-zinc-950 text-white\`

export default function HomePage() {
  return <Page>${context.name}</Page>
}
`
  )
}

async function createViteReactApp(context: CreateContext): Promise<void> {
  await writeProjectFile(
    context,
    "package.json",
    `${JSON.stringify(
      {
        name: context.name,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { react: "^19", "react-dom": "^19", "tailwind-styled-v4": "^5.0.0" },
        devDependencies: {
          "@tailwind-styled/vite": "^5.0.0",
          vite: "^6",
          "@vitejs/plugin-react": "^4",
          tailwindcss: "^4",
          typescript: "^5",
        },
      },
      null,
      2
    )}\n`
  )

  await writeProjectFile(
    context,
    "vite.config.ts",
    `import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { tailwindStyledPlugin } from "@tailwind-styled/vite"

export default defineConfig({ plugins: [react(), tailwindStyledPlugin()] })
`
  )

  await writeProjectFile(
    context,
    "src/main.tsx",
    `console.log("${context.name} - vite react template")
`
  )
}

async function createViteVueApp(context: CreateContext): Promise<void> {
  await writeProjectFile(
    context,
    "package.json",
    `${JSON.stringify(
      {
        name: context.name,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: {
          vue: "^3.4.0",
          "tailwind-merge": "^3.5.0",
          "@tailwind-styled/vue": "^5.0.0",
        },
        devDependencies: {
          vite: "^5.0.0",
          "@vitejs/plugin-vue": "^5.0.0",
          typescript: "^5.0.0",
          tailwindcss: "^4.0.0",
          "@tailwindcss/vite": "^4.0.0",
        },
      },
      null,
      2
    )}\n`
  )

  await writeProjectFile(
    context,
    "vite.config.ts",
    `import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
`
  )

  await writeProjectFile(
    context,
    "src/main.ts",
    `import { createApp } from "vue"
import { TailwindStyledPlugin } from "@tailwind-styled/vue"
import App from "./App.vue"
import "./style.css"

createApp(App).use(TailwindStyledPlugin).mount("#app")
`
  )

  await writeProjectFile(
    context,
    "src/App.vue",
    `<script setup lang="ts">
import { ref } from "vue"
import { tw } from "@tailwind-styled/vue"

const Button = tw("button", {
  base: "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2",
  variants: {
    intent: {
      primary: "bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500",
      ghost: "bg-transparent border border-gray-200 hover:bg-gray-50 focus:ring-gray-200",
    },
  },
  defaultVariants: { intent: "primary" },
})

const count = ref(0)
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
    <h1 class="text-3xl font-bold text-gray-900">tailwind-styled + Vue 3</h1>
    <Button @click="count++">Count: {{ count }}</Button>
    <Button intent="ghost" @click="count = 0">Reset</Button>
  </div>
</template>
`
  )

  await writeProjectFile(
    context,
    "src/style.css",
    `@import "tailwindcss";
`
  )

  await writeProjectFile(
    context,
    "index.html",
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${context.name}</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
`
  )
}

async function createViteSvelteApp(context: CreateContext): Promise<void> {
  await writeProjectFile(
    context,
    "package.json",
    `${JSON.stringify(
      {
        name: context.name,
        private: true,
        type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { "tailwind-merge": "^3.5.0", "@tailwind-styled/svelte": "^5.0.0" },
        devDependencies: {
          svelte: "^5.0.0",
          "@sveltejs/vite-plugin-svelte": "^3.0.0",
          vite: "^5.0.0",
          typescript: "^5.0.0",
          tailwindcss: "^4.0.0",
          "@tailwindcss/vite": "^4.0.0",
        },
      },
      null,
      2
    )}\n`
  )

  await writeProjectFile(
    context,
    "vite.config.ts",
    `import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
})
`
  )

  await writeProjectFile(
    context,
    "src/main.ts",
    `import App from "./App.svelte"
import "./app.css"

const app = new App({ target: document.getElementById("app")! })
export default app
`
  )

  await writeProjectFile(
    context,
    "src/App.svelte",
    `<script lang="ts">
  import { cv } from "@tailwind-styled/svelte"

  const button = cv({
    base: "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none",
    variants: {
      intent: {
        primary: "bg-blue-500 text-white hover:bg-blue-600",
        ghost: "bg-transparent border border-gray-200 hover:bg-gray-50",
      },
    },
    defaultVariants: { intent: "primary" },
  })

  let count = 0
</script>

<div class="min-h-screen flex flex-col items-center justify-center gap-6 bg-gray-50">
  <h1 class="text-3xl font-bold text-gray-900">tailwind-styled + Svelte 5</h1>
  <button class={button({ intent: "primary" })} on:click={() => count++}>Count: {count}</button>
  <button class={button({ intent: "ghost" })} on:click={() => (count = 0)}>Reset</button>
</div>
`
  )

  await writeProjectFile(
    context,
    "src/app.css",
    `@import "tailwindcss";
`
  )

  await writeProjectFile(
    context,
    "index.html",
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${context.name}</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>
`
  )
}

async function createSimpleApp(context: CreateContext): Promise<void> {
  await writeProjectFile(
    context,
    "package.json",
    `${JSON.stringify(
      { name: context.name, private: true, scripts: { dev: "node index.js" } },
      null,
      2
    )}\n`
  )
  await writeProjectFile(
    context,
    "index.js",
    "console.log('tailwind-styled simple template ready')\n"
  )
}

async function createProject(
  options: CreateCliOptions,
  output: CommandContext["output"]
): Promise<void> {
  const { name, template } = await resolveCreateInput(options)
  const projectDir = path.resolve(process.cwd(), name)

  if (await pathExists(projectDir)) {
    throw new CliUsageError(`Directory ${name} already exists.`)
  }

  const context: CreateContext = {
    projectDir,
    name,
    dryRun: options.dryRun,
    writtenFiles: [],
  }

  await TEMPLATES[template](context)

  const report: CreateReport = {
    name,
    template,
    projectDir,
    dryRun: context.dryRun,
    filesCreated: context.writtenFiles.length,
    files: context.writtenFiles,
  }

  if (output.json) {
    output.jsonSuccess("create", report)
    return
  }

  output.intro("tailwind-styled-v4 Project Generator")
  output.writeText(`Creating ${template} in ./${name}${context.dryRun ? " (dry-run)" : ""}`)
  output.writeText(`Files ${context.dryRun ? "planned" : "created"}: ${report.filesCreated}`)
  output.note(`cd ${name}\nnpm install\nnpm run dev`, "Next steps")
  output.outro("Project scaffold ready")
}

export function buildCreateProgram(context: CommandContext): Command {
  const program = new Command("create-tailwind-styled")
  program
    .name("create-tailwind-styled")
    .description("CLI scaffolding tool")
    .option("--json", "Output strict JSON envelope")
    .option("--debug", "Include stack traces for errors")
    .option("--verbose", "Verbose runtime logs")
    .arguments("[name]")
    .option("-y, --yes", "Skip prompts")
    .option("--template <template>", "Template name")
    .option("--dry-run", "Preview generated files")
    .action(async (name: string | undefined, options: Record<string, unknown>) => {
      await createProject(
        {
          name,
          template: typeof options.template === "string" ? options.template : undefined,
          yes: Boolean(options.yes),
          dryRun: Boolean(options.dryRun),
        },
        context.output
      )
    })

  return program
}

export async function main(rawArgs: string[] = process.argv.slice(2)): Promise<void> {
  await runCliMain({
    argv: [process.execPath, "create-tailwind-styled", ...rawArgs],
    importMetaUrl: import.meta.url,
    commandHint: "create",
    buildProgram: buildCreateProgram,
  })
}
