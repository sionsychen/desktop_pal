import { describe, it, expect } from 'vitest'
import { createLanguageModel, normalizeAnthropicBaseURL } from '../src/main/llm/providerFactory'
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

describe('normalizeAnthropicBaseURL', () => {
  it('appends /v1 when missing', () => {
    expect(normalizeAnthropicBaseURL('https://tc-paperhub.diezhi.net/anthropic'))
      .toBe('https://tc-paperhub.diezhi.net/anthropic/v1')
  })
  it('keeps /v1 when already present', () => {
    expect(normalizeAnthropicBaseURL('https://api.anthropic.com/v1'))
      .toBe('https://api.anthropic.com/v1')
  })
  it('keeps versioned suffixes other than v1', () => {
    expect(normalizeAnthropicBaseURL('https://x.test/v2')).toBe('https://x.test/v2')
  })
  it('strips trailing slash before checking', () => {
    expect(normalizeAnthropicBaseURL('https://x.test/anthropic/'))
      .toBe('https://x.test/anthropic/v1')
    expect(normalizeAnthropicBaseURL('https://x.test/v1/'))
      .toBe('https://x.test/v1')
  })
  it('returns empty for empty input', () => {
    expect(normalizeAnthropicBaseURL('')).toBe('')
  })
})
