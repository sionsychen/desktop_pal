import { Tray, Menu, nativeImage, app } from 'electron'
import type { BrowserWindow } from 'electron'

export function createTray(win: BrowserWindow): Tray {
  // MVP: 用空透明 16x16 图标占位,后续放真图标
  const icon = nativeImage.createEmpty()
  const tray = new Tray(icon)
  const menu = Menu.buildFromTemplate([
    { label: 'Show', click: () => win.show() },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])
  tray.setToolTip('Desktop_Pal')
  tray.setContextMenu(menu)
  return tray
}
