import electron from 'electron'
import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'
const { BrowserWindow: BrowserWindowCtor, screen } = electron

export interface RestoreBounds { x: number; y: number; width: number; height: number }

export function buildWindowOptions(preloadPath: string, bounds?: RestoreBounds): BrowserWindowConstructorOptions {
  return {
    x: bounds?.x,
    y: bounds?.y,
    width: bounds?.width ?? 280,
    height: bounds?.height ?? 420,
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

function isVisibleOnAnyDisplay(b: RestoreBounds): boolean {
  // 多显示器配置变化后,旧坐标可能落在已断连的屏幕上, 检查矩形与任一 display work area 是否相交
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea
    return b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y
  })
}

export function createPetWindow(preloadPath: string, restored?: RestoreBounds): BrowserWindow {
  const useRestored = restored && isVisibleOnAnyDisplay(restored)
  const win = new BrowserWindowCtor(buildWindowOptions(preloadPath, useRestored ? restored : undefined))
  win.setAlwaysOnTop(true, 'screen-saver')
  if (!useRestored) {
    // 首次启动放右下角
    const display = screen.getPrimaryDisplay()
    const { width, height } = display.workAreaSize
    win.setPosition(width - 300, height - 440)
  }
  return win
}

export function moveWindowBy(win: BrowserWindow, dx: number, dy: number): void {
  const [x, y] = win.getPosition()
  win.setPosition(Math.round(x + dx), Math.round(y + dy))
}
