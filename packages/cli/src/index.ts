#!/usr/bin/env node

import { buildMainProgram } from "./commands/program"
import { runCliMain } from "./utils/runtime"

async function main() {
  await runCliMain({
    importMetaUrl: import.meta.url,
    buildProgram: buildMainProgram,
  })
}

main()
