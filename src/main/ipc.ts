import { ipcMain, app, type BrowserWindow } from 'electron'
import { Channels } from '@shared/channels'
import { moveWindowBy } from './window'
import { ChatSession } from './llm/chatSession'
import { ChatService } from './llm/chatService'
import { createLanguageModel } from './llm/providerFactory'
import { SettingsStore } from './settings/store'
import { CredentialsStore } from './settings/credentials'

export function registerIpc(win: BrowserWindow, userDataDir: string): void {
  const settingsStore = new SettingsStore(userDataDir)
  const credentialsStore = new CredentialsStore(userDataDir)

  let settings = settingsStore.load()
  const session = new ChatSession(settings.systemPrompt, 20)
  let activeAbort: AbortController | null = null

  const service = new ChatService(session, () => {
    const creds = credentialsStore.load()
    return createLanguageModel(settings, creds)
  })

  ipcMain.on(Channels.WindowQuit, () => app.quit())

  ipcMain.on(Channels.WindowMove, (_e, p: { dx: number; dy: number }) => {
    moveWindowBy(win, p.dx, p.dy)
  })

  ipcMain.on(Channels.PassthroughSet, (_e, interactive: boolean) => {
    win.setIgnoreMouseEvents(!interactive, { forward: true })
  })

  ipcMain.on(Channels.ChatSend, async (_e, payload: { text: string }) => {
    activeAbort?.abort()
    activeAbort = new AbortController()
    const ac = activeAbort
    try {
      for await (const ev of service.send(payload.text, ac.signal)) {
        if (ev.type === 'delta') win.webContents.send(Channels.ChatDelta, { text: ev.text })
        else if (ev.type === 'done') win.webContents.send(Channels.ChatDone, { fullText: ev.fullText })
        else if (ev.type === 'error') win.webContents.send(Channels.ChatError, { message: ev.message })
      }
    } finally {
      if (activeAbort === ac) activeAbort = null
    }
  })

  ipcMain.on(Channels.ChatAbort, () => activeAbort?.abort())

  ipcMain.handle(Channels.SettingsGet, () => {
    const creds = credentialsStore.load()
    return { settings, hasAnthropic: !!creds.anthropic, hasOpenAI: !!creds.openai }
  })

  ipcMain.handle(Channels.SettingsSet, (_e, payload: {
    settings: typeof settings
    anthropicToken?: string
    openaiToken?: string
  }) => {
    settings = payload.settings
    settingsStore.save(settings)
    const creds = credentialsStore.load()
    if (payload.anthropicToken !== undefined) creds.anthropic = payload.anthropicToken
    if (payload.openaiToken !== undefined) creds.openai = payload.openaiToken
    credentialsStore.save(creds)
    session.setSystemPrompt(settings.systemPrompt)
  })
}
