import fsp from "node:fs/promises"
import path from "node:path"
import { parseArgs as parseNodeArgs } from "node:util"

import { CliError, CliUsageError, errorMessage } from "../utils/errors"
import { pathExists, readJsonSafe } from "../utils/fs"
import { writeJsonSuccess } from "../utils/json"
import type { CommandDefinition } from "./types"

interface DeployManifest {
  name: string
  version: string
  tag: string
  description: string
  keywords: string[]
  publishedAt: string
  source: string
  registry: string
}

interface DeployResponse {
  status: number | undefined
  body: unknown
}

const postJson = async (
  url: URL,
  body: string,
  token: string | undefined
): Promise<DeployResponse> => {
  const { default: https } = await import("node:https")
  const { default: http } = await import("node:http")

  return new Promise<DeployResponse>((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http
    const req = client.request(
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8")
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) })
          } catch {
            resolve({ status: res.statusCode, body: raw })
          }
        })
      }
    )
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

export const deployCommand: CommandDefinition = {
  name: "deploy",
  async run(args, context) {
    const parsed = parseNodeArgs({
      args,
      allowPositionals: true,
      strict: false,
      options: {
        "dry-run": { type: "boolean", default: false },
        version: { type: "string" },
        tag: { type: "string" },
        registry: { type: "string" },
      },
    })

    const name = parsed.positionals[0] ?? "component"
    const dryRun = Boolean(parsed.values["dry-run"])
    const version = typeof parsed.values.version === "string" ? parsed.values.version : "0.1.0"
    const tag = typeof parsed.values.tag === "string" ? parsed.values.tag : "latest"
    const registryUrl =
      typeof parsed.values.registry === "string"
        ? parsed.values.registry
        : (process.env.TW_REGISTRY_URL ?? null)

    const pkgPath = path.join(process.cwd(), "package.json")
    if (!(await pathExists(pkgPath))) {
      throw new CliUsageError("[tw deploy] No package.json found in current directory")
    }

    const pkg = await readJsonSafe<{
      name?: string
      version?: string
      description?: string
      keywords?: string[]
    }>(pkgPath)
    if (!pkg) {
      throw new CliUsageError("[tw deploy] package.json is not valid JSON")
    }
    const componentName = pkg.name ?? name

    const manifest: DeployManifest = {
      name: componentName,
      version: pkg.version ?? version,
      tag,
      description: pkg.description ?? "",
      keywords: pkg.keywords ?? [],
      publishedAt: new Date().toISOString(),
      source: process.cwd(),
      registry: registryUrl ?? "https://registry.tailwind-styled.dev",
    }

    if (dryRun) {
      if (context.json) {
        writeJsonSuccess("deploy", {
          mode: "dry-run",
          component: componentName,
          registry: registryUrl ?? manifest.registry,
          manifest,
        })
      } else {
        context.output.writeText("[tw deploy] DRY RUN - would publish:")
        context.output.writeText(JSON.stringify(manifest, null, 2))
        if (registryUrl) context.output.writeText(`\n[tw deploy] Target registry: ${registryUrl}`)
      }
      return
    }

    const cacheDir = path.join(process.cwd(), ".tw-cache")
    await fsp.mkdir(cacheDir, { recursive: true })
    await fsp.writeFile(
      path.join(cacheDir, "deploy-manifest.json"),
      JSON.stringify(manifest, null, 2)
    )

    if (!registryUrl) {
      if (context.json) {
        writeJsonSuccess("deploy", {
          mode: "local",
          component: componentName,
          version: manifest.version,
          manifestPath: ".tw-cache/deploy-manifest.json",
          nextSteps: ["tw deploy --registry=http://localhost:4040", "tw registry serve"],
        })
      } else {
        context.output.writeText(
          `[tw deploy] Published locally: ${componentName}@${manifest.version}`
        )
        context.output.writeText("[tw deploy] Manifest: .tw-cache/deploy-manifest.json")
        context.output.writeText(
          "[tw deploy] To publish remotely: tw deploy --registry=http://localhost:4040"
        )
        context.output.writeText("[tw deploy] Start registry:      tw registry serve")
      }
      return
    }

    try {
      const url = new URL("/packages", registryUrl)
      const body = JSON.stringify(manifest)
      const token = process.env.TW_REGISTRY_TOKEN
      const result = await postJson(url, body, token)

      const isSuccess = result.status === 201
      if (isSuccess) {
        const payload = result.body as { id?: string } | string
        if (context.json) {
          writeJsonSuccess("deploy", {
            mode: "remote",
            component: componentName,
            version: manifest.version,
            registry: `${registryUrl}/packages/${componentName}`,
            id:
              typeof payload === "object" && payload && "id" in payload
                ? (payload.id ?? null)
                : null,
          })
        } else {
          context.output.writeText(`[tw deploy] Published: ${componentName}@${manifest.version}`)
          context.output.writeText(`[tw deploy] Registry: ${registryUrl}/packages/${componentName}`)
          const hasId = typeof payload === "object" && payload && "id" in payload && payload.id
          if (hasId) {
            context.output.writeText(`[tw deploy] ID: ${payload.id}`)
          }
        }
        return
      }

      throw new CliError(
        `[tw deploy] Registry returned ${String(result.status)}: ${JSON.stringify(result.body)}`,
        { code: "DEPLOY_REGISTRY_ERROR" }
      )
    } catch (error) {
      if (error instanceof CliError) throw error
      const message = errorMessage(error)
      throw new CliError(`[tw deploy] Registry unreachable: ${message}`, { cause: error })
    }
  },
}
