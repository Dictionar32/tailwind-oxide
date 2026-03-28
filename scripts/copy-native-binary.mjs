#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nativeTools = path.join(__dirname, "native-tools.mjs");
const result = spawnSync(process.execPath, [nativeTools, "copy-node"], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
