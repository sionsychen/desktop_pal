import type { ChatMessage } from './types'

export interface ChatSnapshot {
  system: string
  messages: ChatMessage[]
}

export class ChatSession {
  private messages: ChatMessage[] = []
  private system: string
  private readonly maxMessages: number

  constructor(systemPrompt: string, maxTurns = 20) {
    this.system = systemPrompt
    this.maxMessages = maxTurns * 2
  }
  pushUser(content: string): void { this.messages.push({ role: 'user', content }); this.trim() }
  pushAssistant(content: string): void { this.messages.push({ role: 'assistant', content }); this.trim() }
  setSystemPrompt(prompt: string): void { this.system = prompt }
  clear(): void { this.messages = [] }
  snapshot(): ChatSnapshot { return { system: this.system, messages: [...this.messages] } }
  /** 用持久化数据填充 (启动时从磁盘恢复) */
  hydrate(messages: ChatMessage[]): void {
    // 严格过滤,只接受 role 是 user/assistant 的合法记录
    this.messages = messages
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-this.maxMessages)
  }
  private trim(): void {
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(this.messages.length - this.maxMessages)
    }
  }
}
