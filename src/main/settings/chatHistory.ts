import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { ChatMessage } from '@main/llm/types'

export class ChatHistoryStore {
  private readonly path: string
  constructor(userDataDir: string) {
    this.path = join(userDataDir, 'chat-history.json')
  }
  load(): ChatMessage[] {
    if (!existsSync(this.path)) return []
    try {
      const raw = JSON.parse(readFileSync(this.path, 'utf-8'))
      if (!Array.isArray(raw)) return []
      return raw.filter((m) =>
        m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
      ) as ChatMessage[]
    } catch {
      return []
    }
  }
  save(messages: ChatMessage[]): void {
    try {
      writeFileSync(this.path, JSON.stringify(messages, null, 2), 'utf-8')
    } catch {
      // best-effort
    }
  }
  clear(): void {
    try { writeFileSync(this.path, '[]', 'utf-8') } catch { /* ignore */ }
  }
}
