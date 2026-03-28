import { parentPort, workerData } from "node:worker_threads"

import { scanWorkspace } from "./index"
import {
  parseScannerWorkerRequest,
  parseScanWorkspaceResult,
  type ScanWorkspaceResult,
} from "./schemas"

const workerPort = parentPort
const data = parseScannerWorkerRequest(workerData)

if (!workerPort) {
  throw new Error("scanner worker started without a parentPort")
}

try {
  const result: ScanWorkspaceResult = parseScanWorkspaceResult(
    scanWorkspace(data.rootDir, data.options ?? {})
  )
  workerPort.postMessage({ ok: true, result })
} catch (error) {
  workerPort.postMessage({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  })
}
