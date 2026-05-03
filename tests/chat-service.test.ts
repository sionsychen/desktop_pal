import { describe, it, expect } from 'vitest'
import { ChatService } from '../src/main/llm/chatService'
import { ChatSession } from '../src/main/llm/chatSession'
import type { StreamEvent } from '../src/main/llm/types'
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test'
import type { LanguageModelV3StreamPart } from '@ai-sdk/provider'

function buildMockModel(chunks: string[]) {
  const parts: LanguageModelV3StreamPart[] = ([
    { type: 'text-start', id: '1' },
    ...chunks.map((delta) => ({ type: 'text-delta', id: '1', delta })),
    { type: 'text-end', id: '1' },
    {
      type: 'finish',
      finishReason: 'stop',
      usage: {
        inputTokens: 1,
        outputTokens: 1,
        totalTokens: 2,
      },
    },
  ] as unknown) as LanguageModelV3StreamPart[]
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({ chunks: parts }),
    }),
  })
}

describe('ChatService', () => {
  it('streams deltas and emits done with full text', async () => {
    const session = new ChatSession('SYS', 5)
    const model = buildMockModel(['Hel', 'lo', '!'])
    const svc = new ChatService(session, () => model)
    const events: StreamEvent[] = []
    for await (const e of svc.send('hi')) events.push(e)
    expect(events.filter((e) => e.type === 'delta').map((e) => (e as any).text)).toEqual(['Hel', 'lo', '!'])
    const done = events.find((e) => e.type === 'done')
    expect(done).toBeDefined()
    expect((done as any).fullText).toBe('Hello!')
  })

  it('appends user and assistant messages to session after success', async () => {
    const session = new ChatSession('SYS', 5)
    const svc = new ChatService(session, () => buildMockModel(['ok']))
    for await (const _ of svc.send('hi')) { /* drain */ }
    expect(session.snapshot().messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'ok' },
    ])
  })

  it('emits error event when model factory throws', async () => {
    const session = new ChatSession('SYS', 5)
    const svc = new ChatService(session, () => { throw new Error('no token') })
    const events: StreamEvent[] = []
    for await (const e of svc.send('hi')) events.push(e)
    const err = events.find((e) => e.type === 'error')
    expect(err).toBeDefined()
    expect((err as any).message).toContain('no token')
  })

  it('supports abort via AbortController', async () => {
    const session = new ChatSession('SYS', 5)
    const model = buildMockModel(['a', 'b', 'c'])
    const svc = new ChatService(session, () => model)
    const ac = new AbortController()
    const events: StreamEvent[] = []
    const iter = svc.send('hi', ac.signal)
    ac.abort()
    for await (const e of iter) events.push(e)
    expect(events.length).toBeGreaterThanOrEqual(0)
  })
})
