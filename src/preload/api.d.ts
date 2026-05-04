import type { Settings } from '../main/llm/types'

export {}

declare global {
  interface Window {
    api: {
      window: {
        quit: () => void
        moveBy: (dx: number, dy: number) => void
        setPassthrough: (interactive: boolean) => void
      }
      chat: {
        send: (text: string) => void
        abort: () => void
        onDelta: (cb: (text: string) => void) => () => void
        onDone: (cb: (fullText: string) => void) => () => void
        onError: (cb: (msg: string) => void) => () => void
        onFocusInput: (cb: () => void) => () => void
        onCleared: (cb: () => void) => () => void
      }
      settings: {
        get: () => Promise<{ settings: Settings; hasAnthropic: boolean; hasOpenAI: boolean }>
        set: (payload: {
          settings: Settings
          anthropicToken?: string
          openaiToken?: string
        }) => Promise<void>
      }
    }
  }
}
