import electron from 'electron'
const { app } = electron
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createPetWindow } from './window'
import { createTray } from './tray'
import { registerIpc } from './ipc'

const __dirname = dirname(fileURLToPath(import.meta.url))

app.commandLine.appendSwitch('force_high_performance_gpu')

app.whenReady().then(async () => {
  const preload = join(__dirname, '../preload/index.cjs')
  const win = createPetWindow(preload)
  registerIpc(win, app.getPath('userData'))
  win.setIgnoreMouseEvents(true, { forward: true })
  createTray(win)

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
