import { createRequire } from "node:module"
import type { EventEmitter } from "node:events"

const require = createRequire(import.meta.url)
const server = require("./server.mjs") as {
  currentMetrics: Record<string, unknown>
  history: Array<Record<string, unknown>>
  events: EventEmitter
  updateMetrics(data: Record<string, unknown>): void
}

export const currentMetrics = server.currentMetrics
export const events = server.events
export const history = server.history
export const updateMetrics = server.updateMetrics
