import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { Settings } from './types'
import type { Credentials } from '@main/settings/defaults'

// Anthropic SDK 默认 baseURL = https://api.anthropic.com/v1, 然后追加 /messages
// 用户给的 relay (例如 https://tc-paperhub.diezhi.net/anthropic) 通常省了 /v1, 这里补上
function normalizeAnthropicBaseURL(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  if (!trimmed) return ''
  if (/\/v\d+$/.test(trimmed)) return trimmed
  return `${trimmed}/v1`
}

export { normalizeAnthropicBaseURL }

export function createLanguageModel(settings: Settings, creds: Credentials): LanguageModel {
  if (settings.provider === 'anthropic') {
    if (!creds.anthropic) throw new Error('Missing anthropic API token')
    if (!settings.anthropic.model) throw new Error('Missing anthropic model id')
    const baseURL = settings.anthropic.baseURL
      ? normalizeAnthropicBaseURL(settings.anthropic.baseURL)
      : undefined
    const client = createAnthropic({
      baseURL,
      apiKey: creds.anthropic,
    })
    return client(settings.anthropic.model)
  }
  if (!creds.openai) throw new Error('Missing openai API token')
  if (!settings.openai.baseURL) throw new Error('openai-compatible requires baseURL')
  if (!settings.openai.model) throw new Error('Missing openai model id')
  const client = createOpenAICompatible({
    name: 'custom',
    baseURL: settings.openai.baseURL,
    apiKey: creds.openai,
  })
  return client(settings.openai.model)
}
