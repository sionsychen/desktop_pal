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
  private trim(): void {
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(this.messages.length - this.maxMessages)
    }
  }
}
