import { describe, it, expect } from 'vitest'
import { createLanguageModel } from '../src/main/llm/providerFactory'
import type { Settings } from '../src/main/llm/types'

const baseSettings: Settings = {
  provider: 'anthropic',
  anthropic: { baseURL: 'https://api.anthropic.com', model: 'claude-sonnet-4-5' },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
  systemPrompt: 'x',
}

describe('createLanguageModel', () => {
  it('builds an anthropic model when provider=anthropic', () => {
    const model = createLanguageModel(baseSettings, { anthropic: 'k', openai: '' })
    expect(model).toBeDefined()
    expect((model as any).modelId).toBe('claude-sonnet-4-5')
  })
  it('builds an openai-compatible model when provider=openai-compatible', () => {
    const settings: Settings = { ...baseSettings, provider: 'openai-compatible' }
    const model = createLanguageModel(settings, { anthropic: '', openai: 'sk' })
    expect((model as any).modelId).toBe('gpt-4o')
  })
  it('throws when token missing for selected provider', () => {
    expect(() => createLanguageModel(baseSettings, { anthropic: '', openai: '' }))
      .toThrow(/anthropic.*token/i)
  })
  it('throws when openai-compatible has no baseURL', () => {
    const settings: Settings = {
      ...baseSettings,
      provider: 'openai-compatible',
      openai: { baseURL: '', model: 'gpt-4o' },
    }
    expect(() => createLanguageModel(settings, { anthropic: '', openai: 'sk' }))
      .toThrow(/baseURL/i)
  })
})
