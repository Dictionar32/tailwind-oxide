#!/usr/bin/env node

import { pathToFileURL } from "node:url"

import { main } from "./createApp"

export { buildCreateProgram, main } from "./createApp"

function isDirectExecution(): boolean {
  const scriptPath = process.argv[1]
  if (!scriptPath) return false
  return import.meta.url === pathToFileURL(scriptPath).href
}

if (isDirectExecution()) {
  void main()
}
