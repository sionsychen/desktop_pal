import { Tray, Menu, nativeImage, app } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function createTray(win: BrowserWindow): Tray {
  const iconPath = join(__dirname, '../../resources/tray.png')
  const icon = nativeImage.createFromPath(iconPath)
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
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
