import electron from 'electron'
const { app, globalShortcut, screen } = electron
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createPetWindow } from './window'
import { createTray } from './tray'
import { registerIpc } from './ipc'
import { WindowStateStore } from './settings/windowState'

const __dirname = dirname(fileURLToPath(import.meta.url))

app.commandLine.appendSwitch('force_high_performance_gpu')

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData')
  const preload = join(__dirname, '../preload/index.cjs')
  const winStateStore = new WindowStateStore(userDataDir)
  const restored = winStateStore.load()
  const win = createPetWindow(preload, restored ?? undefined)
  const ipcCtl = registerIpc(win, userDataDir)
  win.setIgnoreMouseEvents(true, { forward: true })
  createTray(win, { clearChatHistory: ipcCtl.clearChatHistory })

  // 移动/缩放后即时落盘
  let saveTimer: NodeJS.Timeout | null = null
  const persistBounds = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const b = win.getBounds()
      winStateStore.save({ x: b.x, y: b.y, width: b.width, height: b.height })
    }, 400)
  }
  win.on('moved', persistBounds)
  win.on('resized', persistBounds)
  win.on('close', () => {
    if (saveTimer) clearTimeout(saveTimer)
    const b = win.getBounds()
    winStateStore.save({ x: b.x, y: b.y, width: b.width, height: b.height })
  })

  // 全局快捷键: 把窗口跳到鼠标附近,聚焦输入框
  const summonHotkey = 'CommandOrControl+Shift+Space'
  const summon = (): void => {
    const cursor = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursor)
    const b = win.getBounds()
    // 放在鼠标右下偏移,完全在 display work area 内
    let x = cursor.x + 16
    let y = cursor.y + 16
    if (x + b.width > display.workArea.x + display.workArea.width) x = cursor.x - b.width - 16
    if (y + b.height > display.workArea.y + display.workArea.height) y = cursor.y - b.height - 16
    win.setPosition(Math.round(x), Math.round(y))
    if (!win.isVisible()) win.show()
    win.webContents.send('chat:focus-input')
  }
  if (!globalShortcut.register(summonHotkey, summon)) {
    console.warn('Failed to register summon hotkey', summonHotkey)
  }
  app.on('will-quit', () => globalShortcut.unregisterAll())

  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' })
    win.webContents.on('console-message', (_e, level, message, line, source) => {
      console.log(`[renderer ${level}] ${message} (${source}:${line})`)
    })
    win.webContents.on('render-process-gone', (_e, details) => {
      console.error('[renderer gone]', details)
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
