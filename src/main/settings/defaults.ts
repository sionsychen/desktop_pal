import type { Settings } from '@main/llm/types'

export const DEFAULT_SYSTEM_PROMPT = `你是一只活泼的桌面伙伴,陪在用户的电脑桌面上。回答简短、友好、有少量颜文字或表情。不要用 markdown 格式。`

export interface Credentials { anthropic: string; openai: string }
export interface DefaultsResult { settings: Settings; credentials: Credentials }

export function buildDefaultSettings(): DefaultsResult {
  const env = process.env
  const hasAnthropic = !!(env.ANTHROPIC_BASE_URL && env.ANTHROPIC_AUTH_TOKEN)
  const hasOpenAI = !!(env.OPENAI_BASE_URL && env.OPENAI_API_KEY)

  const settings: Settings = {
    provider: hasAnthropic || !hasOpenAI ? 'anthropic' : 'openai-compatible',
    anthropic: { baseURL: env.ANTHROPIC_BASE_URL ?? '', model: env.ANTHROPIC_MODEL ?? '' },
    openai: { baseURL: env.OPENAI_BASE_URL ?? '', model: env.OPENAI_MODEL ?? '' },
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  }
  const credentials: Credentials = {
    anthropic: env.ANTHROPIC_AUTH_TOKEN ?? '',
    openai: env.OPENAI_API_KEY ?? '',
  }
  return { settings, credentials }
}
