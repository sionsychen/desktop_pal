import { BrowserWindow, screen } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'

export function buildWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: 400,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  }
}

export function createPetWindow(preloadPath: string): BrowserWindow {
  const win = new BrowserWindow(buildWindowOptions(preloadPath))
  win.setAlwaysOnTop(true, 'screen-saver')
  // 默认右下角
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  win.setPosition(width - 420, height - 620)
  return win
}

export function moveWindowBy(win: BrowserWindow, dx: number, dy: number): void {
  const [x, y] = win.getPosition()
  win.setPosition(Math.round(x + dx), Math.round(y + dy))
}
