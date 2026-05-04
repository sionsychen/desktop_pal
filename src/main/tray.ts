import electron from 'electron'
import type { BrowserWindow, Tray as TrayType } from 'electron'
const { Tray, Menu, nativeImage, app } = electron
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface TrayCallbacks {
  clearChatHistory(): void
}

export function createTray(win: BrowserWindow, cb: TrayCallbacks): TrayType {
  const iconPath = join(__dirname, '../../resources/tray.png')
  const icon = nativeImage.createFromPath(iconPath)
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  const menu = Menu.buildFromTemplate([
    { label: 'Show', click: () => win.show() },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    {
      label: 'Clear chat history',
      click: () => {
        cb.clearChatHistory()
        win.webContents.send('chat:cleared')
      },
    },
    { type: 'separator' },
    { label: 'Summon: Ctrl+Shift+Space', enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ])
  tray.setToolTip('Desktop_Pal — Tororo')
  tray.setContextMenu(menu)
  tray.on('click', () => {
    if (win.isVisible()) win.hide()
    else win.show()
  })
  return tray
}
