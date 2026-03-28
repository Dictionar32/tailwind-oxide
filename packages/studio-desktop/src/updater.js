/**
 * Studio Desktop — Auto-updater (electron-updater)
 *
 * Checks for updates on GitHub Releases.
 * Triggered on app startup (with 10s delay) and on user request.
 *
 * Usage in main.js:
 *   const { setupAutoUpdater } = require('./updater')
 *   app.whenReady().then(() => { setupAutoUpdater(mainWindow) })
 */

const { autoUpdater } = require("electron-updater")
const { dialog, BrowserWindow } = require("electron")

/**
 * @param {BrowserWindow} mainWindow
 */
function setupAutoUpdater(mainWindow) {
  // Silent in production — notify only on update available
  autoUpdater.autoDownload    = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on("checking-for-update", () => {
    console.log("[updater] Checking for updates...")
  })

  autoUpdater.on("update-available", (info) => {
    console.log(`[updater] Update available: ${info.version}`)
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Available",
      message: `tailwind-styled Studio ${info.version} is available.`,
      detail: "Download and install now?",
      buttons: ["Download", "Later"],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate()
    })
  })

  autoUpdater.on("update-not-available", () => {
    console.log("[updater] App is up to date.")
  })

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent)
    mainWindow?.setProgressBar(percent / 100)
    console.log(`[updater] Download: ${percent}%`)
  })

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow?.setProgressBar(-1)
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Update Ready",
      message: `tailwind-styled Studio ${info.version} is ready to install.`,
      detail: "Restart now to apply the update?",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })

  autoUpdater.on("error", (err) => {
    console.warn("[updater] Error:", err.message)
  })

  // Check for updates after 10s delay (don't block startup)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently ignore — no internet connection or GitHub rate limit
    })
  }, 10_000)
}

/** Trigger manual update check from menu item */
async function checkForUpdatesManually(mainWindow) {
  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result) {
      dialog.showMessageBox(mainWindow, {
        type: "info", title: "No Updates",
        message: "tailwind-styled Studio is up to date.",
        buttons: ["OK"],
      })
    }
  } catch (e) {
    dialog.showErrorBox("Update Check Failed", e.message)
  }
}

module.exports = { setupAutoUpdater, checkForUpdatesManually }
