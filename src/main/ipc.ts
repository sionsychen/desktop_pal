import { ipcMain, app, type BrowserWindow } from 'electron'
import { Channels } from '@shared/channels'
import { moveWindowBy } from './window'

export function registerIpc(win: BrowserWindow): void {
  ipcMain.on(Channels.WindowQuit, () => app.quit())

  ipcMain.on(Channels.WindowMove, (_e, payload: { dx: number; dy: number }) => {
    moveWindowBy(win, payload.dx, payload.dy)
  })

  ipcMain.on(Channels.PassthroughSet, (_e, interactive: boolean) => {
    win.setIgnoreMouseEvents(!interactive, { forward: true })
  })
}
