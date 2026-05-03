import { contextBridge, ipcRenderer } from 'electron'
import { Channels } from '@shared/channels'

contextBridge.exposeInMainWorld('api', {
  window: {
    quit: () => ipcRenderer.send(Channels.WindowQuit),
    moveBy: (dx: number, dy: number) =>
      ipcRenderer.send(Channels.WindowMove, { dx, dy }),
    setPassthrough: (interactive: boolean) =>
      ipcRenderer.send(Channels.PassthroughSet, interactive),
  },
})
