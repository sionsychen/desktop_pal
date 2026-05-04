import electron from 'electron'
import type { IpcRendererEvent } from 'electron'
const { contextBridge, ipcRenderer } = electron
import { Channels } from '@shared/channels'

contextBridge.exposeInMainWorld('api', {
  window: {
    quit: () => ipcRenderer.send(Channels.WindowQuit),
    moveBy: (dx: number, dy: number) =>
      ipcRenderer.send(Channels.WindowMove, { dx, dy }),
    setPassthrough: (interactive: boolean) =>
      ipcRenderer.send(Channels.PassthroughSet, interactive),
  },
  chat: {
    send: (text: string) => ipcRenderer.send(Channels.ChatSend, { text }),
    abort: () => ipcRenderer.send(Channels.ChatAbort),
    onDelta: (cb: (text: string) => void) => {
      const h = (_e: IpcRendererEvent, p: { text: string }) => cb(p.text)
      ipcRenderer.on(Channels.ChatDelta, h)
      return () => ipcRenderer.off(Channels.ChatDelta, h)
    },
    onDone: (cb: (fullText: string) => void) => {
      const h = (_e: IpcRendererEvent, p: { fullText: string }) => cb(p.fullText)
      ipcRenderer.on(Channels.ChatDone, h)
      return () => ipcRenderer.off(Channels.ChatDone, h)
    },
    onError: (cb: (msg: string) => void) => {
      const h = (_e: IpcRendererEvent, p: { message: string }) => cb(p.message)
      ipcRenderer.on(Channels.ChatError, h)
      return () => ipcRenderer.off(Channels.ChatError, h)
    },
    onFocusInput: (cb: () => void) => {
      const h = () => cb()
      ipcRenderer.on('chat:focus-input', h)
      return () => ipcRenderer.off('chat:focus-input', h)
    },
    onCleared: (cb: () => void) => {
      const h = () => cb()
      ipcRenderer.on('chat:cleared', h)
      return () => ipcRenderer.off('chat:cleared', h)
    },
  },
  settings: {
    get: () => ipcRenderer.invoke(Channels.SettingsGet),
    set: (payload: any) => ipcRenderer.invoke(Channels.SettingsSet, payload),
  },
  stage: {
    onReloadModel: (cb: (modelPath: string) => void) => {
      const h = (_e: IpcRendererEvent, p: { modelPath: string }) => cb(p.modelPath)
      ipcRenderer.on('stage:reload-model', h)
      return () => ipcRenderer.off('stage:reload-model', h)
    },
  },
})
