import { describe, it, expect } from 'vitest'
import { ChatSession } from '../src/main/llm/chatSession'

describe('ChatSession', () => {
  it('starts empty and exposes system prompt', () => {
    const s = new ChatSession('SYS', 5)
    const snap = s.snapshot()
    expect(snap.system).toBe('SYS')
    expect(snap.messages).toEqual([])
  })
  it('pushes user and assistant messages', () => {
    const s = new ChatSession('SYS', 5)
    s.pushUser('hi'); s.pushAssistant('hello')
    expect(s.snapshot().messages).toEqual([
      { role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' },
    ])
  })
  it('drops oldest messages when exceeding maxTurns (2 messages per turn)', () => {
    const s = new ChatSession('SYS', 2)
    s.pushUser('u1'); s.pushAssistant('a1')
    s.pushUser('u2'); s.pushAssistant('a2')
    s.pushUser('u3'); s.pushAssistant('a3')
    const m = s.snapshot().messages
    expect(m).toHaveLength(4)
    expect(m[0]).toEqual({ role: 'user', content: 'u2' })
    expect(m[3]).toEqual({ role: 'assistant', content: 'a3' })
  })
  it('updates system prompt without losing history', () => {
    const s = new ChatSession('A', 5)
    s.pushUser('x'); s.setSystemPrompt('B')
    expect(s.snapshot().system).toBe('B')
    expect(s.snapshot().messages).toHaveLength(1)
  })
  it('clear() empties messages but keeps system prompt', () => {
    const s = new ChatSession('SYS', 5)
    s.pushUser('x'); s.clear()
    expect(s.snapshot().messages).toEqual([])
    expect(s.snapshot().system).toBe('SYS')
  })
})
