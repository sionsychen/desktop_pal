import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { Settings } from './types'
import type { Credentials } from '@main/settings/defaults'

export function createLanguageModel(settings: Settings, creds: Credentials): LanguageModel {
  if (settings.provider === 'anthropic') {
    if (!creds.anthropic) throw new Error('Missing anthropic API token')
    if (!settings.anthropic.model) throw new Error('Missing anthropic model id')
    const client = createAnthropic({
      baseURL: settings.anthropic.baseURL || undefined,
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
