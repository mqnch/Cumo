import { globalShortcut, type BrowserWindow } from 'electron'
import process from 'node:process'

export type WindowLike = BrowserWindow | {
  isVisible: () => boolean
  show: () => void
  focus: () => void
  hide: () => void
  on: (event: string, handler: (...args: any[]) => void) => void
  center?: () => void
  isDestroyed?: () => boolean
}

// Track when window was last shown to prevent immediate hiding
const windowShowTimes = new WeakMap<WindowLike, number>()

// Export function to mark window as shown (used for first launch)
export function markWindowShown(window: WindowLike) {
  windowShowTimes.set(window, Date.now())
}

export function toggleWindow(window: WindowLike) {
  if (!window || (window.isDestroyed && window.isDestroyed())) {
    console.log('[window] Toggle: window is null or destroyed')
    return
  }

  const isVisible = window.isVisible()
  console.log(`[window] Toggle: window isVisible=${isVisible}`)

  if (isVisible) {
    console.log('[window] Hiding window')
    window.hide()
    windowShowTimes.delete(window)
    return
  }

  // On macOS, ensure window is visible on all workspaces before showing
  if (process.platform === 'darwin' && 'setVisibleOnAllWorkspaces' in window) {
    ;(window as any).setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  }

  // Center the window on the screen before showing
  if (window.center) {
    window.center()
    const bounds = (window as BrowserWindow).getBounds?.()
    if (bounds) {
      console.log(`[window] Window bounds after center: x=${bounds.x}, y=${bounds.y}, width=${bounds.width}, height=${bounds.height}`)
    }
  }
  
  // Mark when window is shown BEFORE showing (critical for blur protection)
  const now = Date.now()
  windowShowTimes.set(window, now)
  console.log(`[window] Marked window shown at ${now}, about to show()`)
  
  // Force show - use show() first
  window.show()
  console.log('[window] Called window.show()')
  
  // On macOS, ensure window is visible and on top
  if (process.platform === 'darwin') {
    // Bring to front immediately
    window.moveTop()
    console.log('[window] Called window.moveTop() on macOS')
  }
  
  // Focus window after a short delay
  setTimeout(() => {
    if (window && (!window.isDestroyed || !window.isDestroyed())) {
      window.focus()
      console.log('[window] Called window.focus()')
      // Double-check visibility
      const isVisible = window.isVisible()
      console.log(`[window] Window visibility check: ${isVisible}`)
      if (!isVisible) {
        console.log('[window] Window not visible, trying show() again')
        window.show()
      }
    }
  }, 100)
  
  // Log window visibility after a moment
  setTimeout(() => {
    if (window && (!window.isDestroyed || !window.isDestroyed())) {
      const stillVisible = window.isVisible()
      console.log(`[window] Window visibility check after 200ms: ${stillVisible}`)
    }
  }, 200)
}

export function attachBlurToHide(window: WindowLike) {
  window.on('blur', () => {
    // Get when window was last shown
    const showTime = windowShowTimes.get(window)
    const now = Date.now()
    const timeSinceShow = showTime ? now - showTime : Infinity
    
    console.log(`[window] Blur event: showTime=${showTime}, now=${now}, timeSinceShow=${timeSinceShow}ms`)
    
    // Ignore blur events that happen within 500ms of showing
    // This prevents immediate hiding when using global shortcuts
    if (timeSinceShow < 500) {
      console.log(`[window] Ignoring blur (too soon: ${timeSinceShow}ms < 500ms)`)
      return
    }
    
    // Small delay to prevent immediate hide on focus
    setTimeout(() => {
      if (window && (!window.isDestroyed || !window.isDestroyed())) {
        // Double-check it's still not recently shown
        const currentShowTime = windowShowTimes.get(window)
        const currentTimeSinceShow = currentShowTime ? Date.now() - currentShowTime : Infinity
        console.log(`[window] Blur timeout check: currentTimeSinceShow=${currentTimeSinceShow}ms`)
        if (currentTimeSinceShow >= 500) {
          console.log('[window] Hiding window due to blur')
          window.hide()
          windowShowTimes.delete(window)
        } else {
          console.log(`[window] Not hiding (still protected: ${currentTimeSinceShow}ms < 500ms)`)
        }
      }
    }, 200)
  })
}

export function registerToggleShortcut(
  toggle: () => void,
  accelerator = 'CommandOrControl+/',
) {
  return globalShortcut.register(accelerator, toggle)
}
