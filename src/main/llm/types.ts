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
  /** Live2D 模型 manifest URL, 相对 renderer public 或绝对 file://;
   * 留空 = ./model/tororo/tororo.model.json (Cubism 2) */
  modelPath?: string
}
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; fullText: string }
  | { type: 'error'; message: string }
