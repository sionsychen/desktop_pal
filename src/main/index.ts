import { app } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createPetWindow } from './window'
import { createTray } from './tray'
import { registerIpc } from './ipc'

const __dirname = dirname(fileURLToPath(import.meta.url))

app.commandLine.appendSwitch('force_high_performance_gpu')

app.whenReady().then(async () => {
  const preload = join(__dirname, '../preload/index.js')
  const win = createPetWindow(preload)
  registerIpc(win)
  win.setIgnoreMouseEvents(true, { forward: true })
  createTray(win)

  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await win.loadFile(join(__dirname, '../renderer/index.html'))
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
