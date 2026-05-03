import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildDefaultSettings } from '../src/main/settings/defaults'

describe('buildDefaultSettings', () => {
  const original = { ...process.env }
  beforeEach(() => {
    delete process.env.ANTHROPIC_BASE_URL
    delete process.env.ANTHROPIC_AUTH_TOKEN
    delete process.env.ANTHROPIC_MODEL
    delete process.env.OPENAI_BASE_URL
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
  })
  afterEach(() => { process.env = { ...original } })

  it('uses anthropic when ANTHROPIC env vars present', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://x.test'
    process.env.ANTHROPIC_AUTH_TOKEN = 't'
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-5'
    const { settings, credentials } = buildDefaultSettings()
    expect(settings.provider).toBe('anthropic')
    expect(settings.anthropic.baseURL).toBe('https://x.test')
    expect(settings.anthropic.model).toBe('claude-sonnet-4-5')
    expect(credentials.anthropic).toBe('t')
  })
  it('uses openai when only OPENAI env vars present', () => {
    process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1'
    process.env.OPENAI_API_KEY = 'sk-x'
    process.env.OPENAI_MODEL = 'gpt-4o'
    const { settings, credentials } = buildDefaultSettings()
    expect(settings.provider).toBe('openai-compatible')
    expect(settings.openai.baseURL).toBe('https://api.openai.com/v1')
    expect(credentials.openai).toBe('sk-x')
  })
  it('prefers anthropic when both present, but fills both', () => {
    process.env.ANTHROPIC_BASE_URL = 'https://a.test'
    process.env.ANTHROPIC_AUTH_TOKEN = 'ta'
    process.env.ANTHROPIC_MODEL = 'claude'
    process.env.OPENAI_BASE_URL = 'https://o.test'
    process.env.OPENAI_API_KEY = 'so'
    process.env.OPENAI_MODEL = 'gpt'
    const { settings, credentials } = buildDefaultSettings()
    expect(settings.provider).toBe('anthropic')
    expect(settings.openai.baseURL).toBe('https://o.test')
    expect(credentials.anthropic).toBe('ta')
    expect(credentials.openai).toBe('so')
  })
  it('returns empty config when no env vars', () => {
    const { settings, credentials } = buildDefaultSettings()
    expect(settings.provider).toBe('anthropic')
    expect(settings.anthropic.model).toBe('')
    expect(credentials.anthropic).toBe('')
    expect(credentials.openai).toBe('')
  })
})
