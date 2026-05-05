import electron from 'electron'
import type { BrowserWindow, Tray as TrayType, NativeImage } from 'electron'
const { Tray, Menu, nativeImage, app } = electron
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createSettingsWindow } from './settingsWindow'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface TrayCallbacks {
  clearChatHistory(): void
  preloadPath: string
}

/** 从 Tororo 纹理 (2048x2048) 裁脸做 tray 图标。脸部 mesh 在 texture 右上区域 ≈ (1300,30)-(2030,720) */
function buildTororoIcon(): NativeImage {
  const candidates = [
    // dev: out 路径相对 main bundle (out/main/index.cjs → ../../src/renderer/public/...)
    join(__dirname, '../../src/renderer/public/model/tororo/moc/tororo.2048/texture_00.png'),
    // prod: 安装包内 app.asar 路径
    join(__dirname, '../renderer/model/tororo/moc/tororo.2048/texture_00.png'),
    // fallback: 旧的占位 png
    join(__dirname, '../../resources/tray.png'),
  ]
  for (const p of candidates) {
    const full = nativeImage.createFromPath(p)
    if (!full.isEmpty()) {
      // 脸部包围盒 (依 texture 实测): x 1300-2030, y 30-720 → ≈730×690
      const cropped = full.crop({ x: 1300, y: 30, width: 730, height: 690 })
      return cropped.resize({ width: 32, height: 32, quality: 'best' })
    }
  }
  return nativeImage.createEmpty()
}

export function createTray(win: BrowserWindow, cb: TrayCallbacks): TrayType {
  const icon = buildTororoIcon()
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  const menu = Menu.buildFromTemplate([
    { label: 'Show', click: () => win.show() },
    { label: 'Hide', click: () => win.hide() },
    { type: 'separator' },
    { label: 'Settings…', click: () => createSettingsWindow(cb.preloadPath) },
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
