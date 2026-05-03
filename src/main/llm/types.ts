export type ProviderKind = 'anthropic' | 'openai-compatible'
export interface ProviderConfig { baseURL: string; model: string }
export interface Settings {
  provider: ProviderKind
  anthropic: ProviderConfig
  openai: ProviderConfig
  systemPrompt: string
}
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; fullText: string }
  | { type: 'error'; message: string }
