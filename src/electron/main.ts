import { app, BrowserWindow, globalShortcut } from 'electron'
import path from 'node:path'
import { startBackend, stopBackend } from './backend'
import { registerIpcHandlers } from './ipc'
import { attachBlurToHide, registerToggleShortcut, toggleWindow, markWindowShown } from './window'

const WINDOW_WIDTH = 700
const WINDOW_HEIGHT = 130

// Store window globally so it persists
let mainWindow: BrowserWindow | null = null

function getPreloadPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'dist-electron', 'preload.cjs')
  }
  return path.join(process.cwd(), 'dist-electron', 'preload.cjs')
}

function getRendererTarget() {
  const devUrl = process.env.VITE_DEV_SERVER_URL

  if (devUrl) {
    return { type: 'url' as const, value: devUrl }
  }

  if (app.isPackaged) {
    return { type: 'file' as const, value: path.join(process.resourcesPath, 'dist', 'index.html') }
  }

  return { type: 'file' as const, value: path.join(process.cwd(), 'dist', 'index.html') }
}

function createMainWindow() {
  // Don't create duplicate windows
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  const window = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: false, // Changed to false to ensure window shows
    show: false,
    resizable: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // On macOS, make sure the window appears above fullscreen apps
  if (process.platform === 'darwin') {
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  registerIpcHandlers(window)
  attachBlurToHide(window)

  const target = getRendererTarget()
  if (target.type === 'url') {
    void window.loadURL(target.value)
  } else {
    void window.loadFile(target.value)
  }

  // Track if this is the first window creation (capture before assigning mainWindow)
  const isFirstWindow = mainWindow === null

  // Wait for window to be ready before showing on first launch
  window.once('ready-to-show', () => {
    console.log(`[main] Window ready-to-show event fired (isFirstWindow=${isFirstWindow})`)
    
    // Auto-show on first launch only
    if (isFirstWindow) {
      console.log('[main] Auto-showing window on first launch')
      if (window.center) {
        window.center()
        const bounds = window.getBounds()
        console.log(`[main] Window centered at x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`)
      }
      // Mark as shown for blur protection
      markWindowShown(window)
      window.show()
      console.log('[main] Called window.show() on first launch')
      // Small delay before focus to ensure window is visible
      setTimeout(() => {
        window.focus()
        console.log('[main] Called window.focus() on first launch')
      }, 50)
    }
  })
  
  // Log if window fails to load
  window.webContents.once('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[main] Window failed to load: ${errorCode} - ${errorDescription} (${validatedURL})`)
  })
  
  window.webContents.once('did-finish-load', () => {
    console.log('[main] Window content finished loading')
  })

  // Clean up when window is destroyed
  window.on('closed', () => {
    mainWindow = null
  })

  mainWindow = window
  return window
}

app.whenReady().then(() => {
  // Hide dock icon on macOS (menu bar apps shouldn't show in dock)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
    console.log('[main] Dock icon hidden on macOS')
  }
  
  void startBackend()
  
  // Create window first
  createMainWindow()
  
  // Register global shortcut immediately
  const shortcutRegistered = registerToggleShortcut(() => {
    console.log('[main] Global shortcut triggered!')
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log('[main] Window is null/destroyed, creating new window')
      createMainWindow()
      // Wait a moment for window to be created
      setTimeout(() => {
        if (mainWindow) {
          console.log('[main] Toggling newly created window')
          toggleWindow(mainWindow)
        }
      }, 100)
    } else {
      console.log('[main] Toggling existing window')
      toggleWindow(mainWindow)
    }
  })
  
  if (!shortcutRegistered) {
    console.error('Failed to register global shortcut')
  } else {
    console.log('Global shortcut registered: CommandOrControl+/')
  }

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow()
    }
    if (mainWindow) {
      toggleWindow(mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  // This is expected behavior for menu bar apps
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  stopBackend()
  globalShortcut.unregisterAll()
})
