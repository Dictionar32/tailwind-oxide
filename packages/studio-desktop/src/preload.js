/**
 * Electron preload — exposes safe IPC bridge ke renderer (web studio).
 * contextBridge memastikan renderer tidak punya akses ke Node.js API langsung.
 */
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("studioDesktop", {
  /** Get current project directory path */
  getProjectPath: () => ipcRenderer.invoke("get-project-path"),

  /** Open native file picker, return selected path or null */
  openFilePicker: () => ipcRenderer.invoke("open-file-picker"),

  /** Switch to a different project */
  changeProject: (projectPath) => ipcRenderer.invoke("change-project", projectPath),

  /** Check if running in Electron (vs browser) */
  isElectron: true,

  /** Platform: darwin | win32 | linux */
  platform: process.platform,

  // ── Engine API ──────────────────────────────────────────────────────────────

  /** Scan current project — returns { ok, totalFiles, uniqueClasses } */
  engineScan: () => ipcRenderer.invoke("engine-scan"),

  /** Build CSS for current project — returns { ok, totalFiles, uniqueClasses, cssLength } */
  engineBuild: () => ipcRenderer.invoke("engine-build"),

  /** Start watching for file changes. Engine events arrive via onEngineEvent. */
  engineWatchStart: (opts) => ipcRenderer.invoke("engine-watch-start", opts),

  /** Stop the file watcher */
  engineWatchStop: () => ipcRenderer.invoke("engine-watch-stop"),

  /**
   * Subscribe to engine events (build results, errors, incremental updates).
   * Returns unsubscribe function.
   * @param {(event: object) => void} callback
   */
  onEngineEvent: (callback) => {
    ipcRenderer.on("engine-event", (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners("engine-event")
  },
})
