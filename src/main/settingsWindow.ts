import electron from 'electron'
import type { BrowserWindow } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { BrowserWindow: BrowserWindowCtor } = electron

const __dirname = dirname(fileURLToPath(import.meta.url))

let current: BrowserWindow | null = null

export function createSettingsWindow(preloadPath: string): BrowserWindow {
  if (current && !current.isDestroyed()) {
    current.show()
    current.focus()
    return current
  }

  const win = new BrowserWindowCtor({
    width: 720,
    height: 560,
    minWidth: 560,
    minHeight: 440,
    title: 'Desktop_Pal · 设置',
    backgroundColor: '#fff7fb',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) {
    void win.loadURL(rendererUrl + '#/settings')
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/settings' })
  }

  win.on('closed', () => {
    if (current === win) current = null
  })

  current = win
  return win
}

export function getSettingsWindow(): BrowserWindow | null {
  return current && !current.isDestroyed() ? current : null
}
