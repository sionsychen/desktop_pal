export type ProviderKind = 'anthropic' | 'openai-compatible'
export interface ProviderConfig { baseURL: string; model: string }
export interface Settings {
  provider: ProviderKind
  anthropic: ProviderConfig
  openai: ProviderConfig
  systemPrompt: string
  /** 0..1, 默认未设置走 SDK 默认 (anthropic 默认 1.0) */
  temperature?: number
  /** 单次 response 最大 token, 默认未设置走 SDK 默认 (4096) */
  maxTokens?: number
}
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; fullText: string }
  | { type: 'error'; message: string }
