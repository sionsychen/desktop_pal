import electron from 'electron'
import type { BrowserWindow } from 'electron'
const { ipcMain, app } = electron
import { Channels } from '@shared/channels'
import { moveWindowBy } from './window'
import { ChatSession } from './llm/chatSession'
import { ChatService } from './llm/chatService'
import { createLanguageModel } from './llm/providerFactory'
import { SettingsStore } from './settings/store'
import { CredentialsStore } from './settings/credentials'
import { ChatHistoryStore } from './settings/chatHistory'

export function registerIpc(win: BrowserWindow, userDataDir: string): { clearChatHistory: () => void } {
  const settingsStore = new SettingsStore(userDataDir)
  const credentialsStore = new CredentialsStore(userDataDir)
  const historyStore = new ChatHistoryStore(userDataDir)

  let settings = settingsStore.load()
  const session = new ChatSession(settings.systemPrompt, 20)
  session.hydrate(historyStore.load())
  let activeAbort: AbortController | null = null

  const service = new ChatService(
    session,
    () => {
      const creds = credentialsStore.load()
      return createLanguageModel(settings, creds)
    },
    () => ({ temperature: settings.temperature, maxTokens: settings.maxTokens }),
  )

  // 每次 done/error 后落盘历史 (debounced)
  let historySaveTimer: NodeJS.Timeout | null = null
  const persistHistory = () => {
    if (historySaveTimer) clearTimeout(historySaveTimer)
    historySaveTimer = setTimeout(() => {
      historyStore.save(session.snapshot().messages)
    }, 300)
  }

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
        else if (ev.type === 'done') {
          win.webContents.send(Channels.ChatDone, { fullText: ev.fullText })
          persistHistory()
        }
        else if (ev.type === 'error') {
          win.webContents.send(Channels.ChatError, { message: ev.message })
          persistHistory()
        }
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
    const oldModelPath = settings.modelPath
    settings = payload.settings
    settingsStore.save(settings)
    const creds = credentialsStore.load()
    if (payload.anthropicToken !== undefined) creds.anthropic = payload.anthropicToken
    if (payload.openaiToken !== undefined) creds.openai = payload.openaiToken
    credentialsStore.save(creds)
    session.setSystemPrompt(settings.systemPrompt)
    // 模型路径变了 → 通知渲染端 reload
    if (settings.modelPath !== oldModelPath) {
      win.webContents.send('stage:reload-model', { modelPath: settings.modelPath ?? '' })
    }
  })

  return {
    clearChatHistory: () => {
      session.clear()
      historyStore.clear()
    },
  }
}
